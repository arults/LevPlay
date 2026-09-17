import { CURATED_MARKETS, ONDO_API, PREIPO_MARKETS, TOKEN_2022_PROGRAM } from "@/lib/markets";
import { isSafeRpcUrl } from "@/lib/protocol";

export const runtime = "edge";

type Json = Record<string, unknown>;
type OndoPrice = { primaryMarket?: { symbol?: string; price?: string }; underlyingMarket?: { ticker?: string; price?: string }; timestamp?: number };
type DexPair = { chainId?: string; pairAddress?: string; priceUsd?: string; liquidity?: { usd?: number }; baseToken?: { address?: string }; info?: { imageUrl?: string } };

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function getOndoPrices() {
  const key = process.env.ONDO_API_KEY;
  if (!key) throw new Error("Ondo API key is not configured");
  const response = await fetch(`${ONDO_API}/assets/all/prices/latest`, { headers: { accept: "application/json", "x-api-key": key }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Ondo prices ${response.status}`);
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized Ondo response");
  const payload = await response.json() as OndoPrice[];
  if (!Array.isArray(payload)) throw new Error("Invalid Ondo response");
  return Object.fromEntries(payload.map((row) => [row.primaryMarket?.symbol || "", row]));
}

async function getPreIpoReferences() {
  const requested = new Set(PREIPO_MARKETS.map((item) => item.mint));
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${[...requested].join(",")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`DEX reference ${response.status}`);
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized DEX response");
  const payload = await response.json() as { pairs?: DexPair[] };
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return Object.fromEntries([...requested].map((mint) => {
    const candidates = pairs.filter((pair) => pair.chainId === "solana" && pair.baseToken?.address === mint && Number(pair.priceUsd) > 0);
    const pair = candidates.sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];
    const logo = pair?.info?.imageUrl?.startsWith("https://cdn.dexscreener.com/") ? pair.info.imageUrl : undefined;
    return [mint, pair ? { price: Number(pair.priceUsd), liquidityUsd: Number(pair.liquidity?.usd || 0), pairAddress: pair.pairAddress || "", logo } : null];
  }));
}

async function verifyPinnedMints() {
  const pinned = CURATED_MARKETS.filter((item) => BASE58.test(item.mint));
  const configured = process.env.LEVPLAY_SVM_READ_RPC;
  const rpcs = [...new Set([...(isSafeRpcUrl(configured) ? [configured] : []), "https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"])];
  for (const rpc of rpcs) {
    try {
      const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pinned.map((item, index) => ({ jsonrpc: "2.0", id: index + 1, method: "getAccountInfo", params: [item.mint, { encoding: "jsonParsed", commitment: "confirmed" }] }))), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) continue;
      const payload = await response.json() as Array<{ id: number; result?: { value?: { owner?: string; data?: { parsed?: { info?: { isInitialized?: boolean } } } } } }>;
      if (!Array.isArray(payload)) continue;
      return Object.fromEntries(payload.map((row) => {
        const item = pinned[row.id - 1]; const value = row.result?.value; const valid = value?.owner === TOKEN_2022_PROGRAM && value?.data?.parsed?.info?.isInitialized === true;
        return [item.symbol, valid];
      }));
    } catch { /* try independent RPC */ }
  }
  return {} as Record<string, boolean>;
}

export async function GET() {
  const [ondo, mintChecks, preIpo] = await Promise.all([
    getOndoPrices().catch(() => ({} as Record<string, OndoPrice>)),
    verifyPinnedMints(),
    getPreIpoReferences().catch(() => ({} as Record<string, { price: number; liquidityUsd: number; pairAddress: string; logo?: string } | null>)),
  ]);
  const publicMarkets = CURATED_MARKETS.map((item) => {
    const quote = ondo[item.symbol]; const price = Number(quote?.underlyingMarket?.price); const timestamp = Number(quote?.timestamp || 0);
    const fresh = Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) <= 60_000;
    const available = Number.isFinite(price) && price > 0;
    return { ...item, price: available ? price : undefined, period: "Ondo market", marketOpen: available, verified: false, unavailable: !available,
      sourceMintVerified: Boolean(item.mint && mintChecks[item.symbol]),
      verificationNote: available
        ? `Display reference received${fresh ? "" : " but stale"}; Ondo documents that this endpoint is not an oracle, so execution remains blocked`
        : "Ondo production price access is unavailable; execution remains blocked",
    };
  });
  const privateMarkets = PREIPO_MARKETS.map((item) => {
    const reference = preIpo[item.mint];
    return { ...item, price: reference?.price, logo: reference?.logo, liquidityUsd: reference?.liquidityUsd, pairAddress: reference?.pairAddress,
      period: "24/7 secondary", marketOpen: true, verified: false, unavailable: !reference,
      verificationNote: reference ? "DEX display reference available; it is not an execution oracle" : "PreStocks reference unavailable; execution remains blocked",
    };
  });
  return Response.json({
    markets: [...publicMarkets, ...privateMarkets],
    checkedAt: new Date().toISOString(),
    source: "Ondo authenticated display API + pinned PreStocks DEX references",
    providers: {
      ondo: { configured: ondoConfigured, reachable: ondoResult.available, purpose: "display-only" },
      prestocksDex: { configured: true, reachable: preIpoResult.available, purpose: "display-only" },
      settlement: { required: 2, admitted: 0, status: "fail-closed" },
    },
  }, {
    headers: { "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" },
  });
}
