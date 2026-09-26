import { ALL_MARKETS } from "@/lib/markets";
import { readJsonResponseBounded } from "@/lib/http-safety";

export const runtime = "edge";

const RANGES = {
  "24H": { timeframe: "minute", aggregate: 15, limit: 96 },
  "7D": { timeframe: "hour", aggregate: 1, limit: 168 },
  "30D": { timeframe: "hour", aggregate: 4, limit: 180 },
  MAX: { timeframe: "day", aggregate: 1, limit: 1000 },
} as const;

type Pool = { attributes?: { address?: string; reserve_in_usd?: string }; relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } } };
type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

const unavailable = (reason: string) => Response.json({ candles: [], status: "unavailable", reason }, { headers: { "cache-control": "public, s-maxage=30" } });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const market = ALL_MARKETS.find((item) => item.symbol === params.get("symbol"));
  const range = params.get("range") || "24H";
  if (!market || !Object.hasOwn(RANGES, range)) return Response.json({ error: "Unsupported market or range" }, { status: 400 });
  const settings = RANGES[range as keyof typeof RANGES];
  const origin = "https://api.geckoterminal.com/api/v2";
  const headers = { accept: "application/json", "user-agent": "LevPlay/1.0 market-display" };
  try {
    const poolsResponse = await fetch(`${origin}/networks/solana/tokens/${market.mint}/pools?page=1`, { headers, signal: AbortSignal.timeout(8_000) });
    if (!poolsResponse.ok) return unavailable("Historical DEX pool data is unavailable.");
    const pools = await readJsonResponseBounded(poolsResponse, 750_000) as { data?: Pool[] };
    const tokenId = `solana_${market.mint}`;
    const pool = pools.data?.find((item) =>
      (item.relationships?.base_token?.data?.id === tokenId || item.relationships?.quote_token?.data?.id === tokenId)
      && typeof item.attributes?.address === "string"
      && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(item.attributes.address)
      && Number(item.attributes.reserve_in_usd) >= 500);
    if (!pool?.attributes?.address) return unavailable("No verified liquid pool history for this source token.");

    const url = `${origin}/networks/solana/pools/${pool.attributes.address}/ohlcv/${settings.timeframe}?aggregate=${settings.aggregate}&limit=${settings.limit}&currency=usd&token=${market.mint}`;
    const historyResponse = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
    if (!historyResponse.ok) return unavailable("Historical candles are temporarily unavailable.");
    const history = await readJsonResponseBounded(historyResponse, 750_000) as { data?: { attributes?: { ohlcv_list?: unknown[] } } };
    const now = Math.floor(Date.now() / 1000) + 600;
    const candles: Candle[] = [];
    for (const row of history.data?.attributes?.ohlcv_list || []) {
      if (!Array.isArray(row) || row.length < 6) continue;
      const [time, open, high, low, close, volume] = row.map(Number);
      if (![time, open, high, low, close, volume].every(Number.isFinite) || time <= 0 || time > now || open <= 0 || close <= 0 || low <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close) || volume < 0) continue;
      candles.push({ time, open, high, low, close, volume });
    }
    candles.sort((a, b) => a.time - b.time);
    const unique = candles.filter((item, index) => !index || item.time !== candles[index - 1].time);
    if (unique.length < 2) return unavailable("Not enough historical trades to draw candles.");
    return Response.json({ status: "display", candles: unique.slice(-120), pool: pool.attributes.address,
      source: "GeckoTerminal DEX trades", range, checkedAt: new Date().toISOString() },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=60" } });
  } catch {
    return unavailable("Historical DEX data did not respond. Try another range.");
  }
}
