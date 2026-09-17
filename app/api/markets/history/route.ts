import { CURATED_MARKETS } from "@/lib/markets";
import { readJsonResponseBounded } from "@/lib/http-safety";

export const runtime = "edge";

const RANGE_CONFIG = {
  "24H": { range: "1d", interval: "5m", annualization: 19_656 },
  "1W": { range: "5d", interval: "30m", annualization: 3_276 },
  "1M": { range: "1mo", interval: "1d", annualization: 252 },
  "1Y": { range: "1y", interval: "1d", annualization: 252 },
  "ALL": { range: "max", interval: "1mo", annualization: 12 },
} as const;

type ChartRange = keyof typeof RANGE_CONFIG;
type QuoteSeries = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
  meta?: {
    chartPreviousClose?: number;
    regularMarketPrice?: number;
    regularMarketTime?: number;
    marketState?: string;
    currency?: string;
    exchangeTimezoneName?: string;
  };
};
type YahooPayload = { chart?: { result?: QuoteSeries[]; error?: unknown } };

const ALLOWED = new Map(CURATED_MARKETS.map((market) => [market.symbol, market.ticker]));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function rsi(values: number[], length = 14) {
  if (values.length <= length) return null;
  let gains = 0;
  let losses = 0;
  for (let index = values.length - length; index < values.length; index += 1) {
    const move = values[index] - values[index - 1];
    if (move >= 0) gains += move;
    else losses -= move;
  }
  if (losses === 0) return 100;
  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
}

function volatility(values: number[], annualization: number) {
  if (values.length < 3) return null;
  const returns = values.slice(1).map((value, index) => Math.log(value / values[index]));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  return Math.sqrt(variance * annualization) * 100;
}

function maxDrawdown(values: number[]) {
  let peak = values[0] || 0;
  let drawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    if (peak > 0) drawdown = Math.min(drawdown, (value / peak - 1) * 100);
  }
  return drawdown;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "";
  const requestedRange = (url.searchParams.get("range") || "24H") as ChartRange;
  const ticker = ALLOWED.get(symbol);
  const config = RANGE_CONFIG[requestedRange];

  if (!ticker || !config) {
    return Response.json({ error: "Unsupported market or range" }, { status: 400 });
  }

  try {
    const upstream = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
    upstream.searchParams.set("range", config.range);
    upstream.searchParams.set("interval", config.interval);
    upstream.searchParams.set("events", "div,splits");
    upstream.searchParams.set("includePrePost", "false");

    const response = await fetch(upstream, {
      headers: { accept: "application/json", "user-agent": "LevPlay/1.0 market-research-display" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("upstream_unavailable");

    const payload = await readJsonResponseBounded(response, 2_000_000) as YahooPayload;
    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result || !quote || !Array.isArray(result.timestamp)) throw new Error("invalid_payload");

    const candles = result.timestamp.flatMap((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;
      if (!finite(open) || !finite(high) || !finite(low) || !finite(close) || !finite(volume)) return [];
      return [{ timestamp: timestamp * 1_000, open, high, low, close, volume }];
    });

    if (candles.length < 2) throw new Error("insufficient_history");

    const closes = candles.map((candle) => candle.close);
    const enriched = candles.map((candle, index) => {
      const window = closes.slice(Math.max(0, index - 19), index + 1);
      return { ...candle, sma20: window.length === 20 ? window.reduce((sum, value) => sum + value, 0) / 20 : null };
    });
    const first = closes[0];
    const last = closes.at(-1)!;
    const high = Math.max(...candles.map((candle) => candle.high));
    const low = Math.min(...candles.map((candle) => candle.low));
    const averageVolume = candles.reduce((sum, candle) => sum + candle.volume, 0) / candles.length;

    return Response.json({
      symbol,
      ticker,
      range: requestedRange,
      interval: config.interval,
      candles: enriched,
      metrics: {
        last,
        change: last - first,
        changePct: (last / first - 1) * 100,
        high,
        low,
        averageVolume,
        sma20: enriched.at(-1)?.sma20 ?? null,
        rsi14: rsi(closes),
        annualizedVolatility: volatility(closes, config.annualization),
        maxDrawdown: maxDrawdown(closes),
      },
      session: {
        state: result.meta?.marketState || "UNKNOWN",
        open: result.meta?.marketState === "REGULAR",
        currency: result.meta?.currency || "USD",
        timezone: result.meta?.exchangeTimezoneName || "America/New_York",
      },
      observedAt: (result.meta?.regularMarketTime || candles.at(-1)!.timestamp / 1_000) * 1_000,
      source: "Public market chart reference",
      sourceDetail: "Yahoo Finance chart data · display and research only",
      settlementEligible: false,
    }, {
      headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({
      error: "Historical display data is temporarily unavailable",
      symbol,
      range: requestedRange,
      settlementEligible: false,
    }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
