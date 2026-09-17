"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CircleAlert, LoaderCircle } from "lucide-react";

export type DisplayPriceUpdate = {
  symbol: string;
  price: number;
  timestamp: number;
  label: string;
  marketOpen: boolean;
  period: string;
};

type ChartRange = "24H" | "1W" | "1M" | "1Y" | "ALL";
type Candle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number; sma20: number | null };
type HistoryResponse = {
  symbol: string;
  range: ChartRange;
  interval: string;
  candles: Candle[];
  metrics: {
    last: number;
    change: number;
    changePct: number;
    high: number;
    low: number;
    averageVolume: number;
    sma20: number | null;
    rsi14: number | null;
    annualizedVolatility: number | null;
    maxDrawdown: number;
  };
  session: { state: string; open: boolean; currency: string; timezone: string };
  observedAt: number;
  source: string;
  sourceDetail: string;
  settlementEligible: false;
};

const RANGES: ChartRange[] = ["24H", "1W", "1M", "1Y", "ALL"];
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const percent = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

function sampled(candles: Candle[], maximum = 140) {
  if (candles.length <= maximum) return candles;
  const step = Math.ceil(candles.length / maximum);
  return candles.filter((_, index) => index % step === 0 || index === candles.length - 1);
}

export function MarketDecisionChart({
  symbol,
  name,
  category,
  onDisplayPrice,
}: {
  symbol: string;
  name: string;
  category: string;
  onDisplayPrice(update: DisplayPriceUpdate): void;
}) {
  const [range, setRange] = useState<ChartRange>("24H");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (category === "Pre-IPO") return;
    const controller = new AbortController();
    fetch(`/api/markets/history?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history_unavailable");
        return response.json() as Promise<HistoryResponse>;
      })
      .then((value) => {
        if (!Array.isArray(value.candles) || value.candles.length < 2) throw new Error("history_unavailable");
        setData(value);
        onDisplayPrice({
          symbol,
          price: value.metrics.last,
          timestamp: value.observedAt,
          label: "Public chart display",
          marketOpen: value.session.open,
          period: value.session.state === "REGULAR" ? "US session open" : "US session closed",
        });
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== "AbortError") setError("Chart data is temporarily unavailable.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, onDisplayPrice, range, symbol]);

  const chart = useMemo(() => {
    if (!data) return null;
    const candles = sampled(data.candles);
    const priceLow = Math.min(...candles.map((candle) => candle.low));
    const priceHigh = Math.max(...candles.map((candle) => candle.high));
    const spread = Math.max(0.01, priceHigh - priceLow);
    const maximumVolume = Math.max(1, ...candles.map((candle) => candle.volume));
    const width = 720;
    const priceTop = 14;
    const priceBottom = 205;
    const volumeTop = 222;
    const volumeBottom = 270;
    const left = 12;
    const right = 708;
    const step = (right - left) / Math.max(1, candles.length);
    const candleWidth = Math.max(1.5, Math.min(7, step * 0.64));
    const y = (value: number) => priceTop + (priceHigh - value) / spread * (priceBottom - priceTop);
    const activeIndex = hovered === null ? candles.length - 1 : Math.min(hovered, candles.length - 1);
    return { candles, width, left, step, candleWidth, y, volumeTop, volumeBottom, maximumVolume, activeIndex };
  }, [data, hovered]);

  if (category === "Pre-IPO") {
    return <section className="decision-chart unavailable"><CircleAlert/><div><strong>Historical candles unavailable</strong><p>Pre-IPO references do not provide an admitted, timestamped OHLC history. LevPlay will not fabricate one.</p></div></section>;
  }

  return <section className="decision-chart" aria-label={`${name} market chart and decision metrics`}>
    <div className="chart-heading">
      <div><span className="eyebrow">Market research</span><h3>{name} price action</h3><p>{data?.sourceDetail || "Loading a display-only public market reference."}</p></div>
      <div className="range-tabs" aria-label="Chart range">{RANGES.map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => { setRange(item); setLoading(true); setError(""); }} aria-pressed={range === item}>{item}</button>)}</div>
    </div>

    {loading && !data ? <div className="chart-state"><LoaderCircle className="spin"/><span>Loading verified chart response…</span></div> : error ? <div className="chart-state error"><CircleAlert/><span>{error} Trading remains blocked; no substitute price was created.</span></div> : chart && data ? <>
      <div className="chart-summary">
        <strong>{money(data.metrics.last)}</strong>
        <span className={data.metrics.change >= 0 ? "positive" : "negative"}>{data.metrics.change >= 0 ? "+" : ""}{money(data.metrics.change)} · {percent(data.metrics.changePct)}</span>
        <small>{range} · {data.session.state.toLowerCase()} · display only</small>
      </div>
      <svg className="candlestick-chart" viewBox="0 0 720 280" role="img" aria-label={`${name} ${range} candlestick chart. Green candles closed above open; red candles closed below open.`} onPointerLeave={() => setHovered(null)}>
        {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} className="chart-grid" x1="12" x2="708" y1={14 + ratio * 191} y2={14 + ratio * 191}/>)}
        {chart.candles.map((candle, index) => {
          const x = chart.left + index * chart.step + chart.step / 2;
          const up = candle.close >= candle.open;
          const bodyTop = chart.y(Math.max(candle.open, candle.close));
          const bodyHeight = Math.max(1.5, Math.abs(chart.y(candle.open) - chart.y(candle.close)));
          const volumeHeight = candle.volume / chart.maximumVolume * (chart.volumeBottom - chart.volumeTop);
          return <g key={candle.timestamp} className={up ? "candle up" : "candle down"} onPointerEnter={() => setHovered(index)}>
            <line x1={x} x2={x} y1={chart.y(candle.high)} y2={chart.y(candle.low)}/>
            <rect x={x - chart.candleWidth / 2} y={bodyTop} width={chart.candleWidth} height={bodyHeight} rx=".7"/>
            <rect className="volume" x={x - chart.candleWidth / 2} y={chart.volumeBottom - volumeHeight} width={chart.candleWidth} height={volumeHeight}/>
          </g>;
        })}
        <polyline className="sma-line" points={chart.candles.flatMap((candle, index) => candle.sma20 === null ? [] : [`${chart.left + index * chart.step + chart.step / 2},${chart.y(candle.sma20)}`]).join(" ")}/>
      </svg>
      <div className="candle-readout">
        {(() => { const candle = chart.candles[chart.activeIndex]; return <><span><small>Time</small><strong>{new Date(candle.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: range === "24H" || range === "1W" ? "short" : undefined })}</strong></span><span><small>Open</small><strong>{money(candle.open)}</strong></span><span><small>High</small><strong>{money(candle.high)}</strong></span><span><small>Low</small><strong>{money(candle.low)}</strong></span><span><small>Close</small><strong>{money(candle.close)}</strong></span><span><small>Volume</small><strong>{compact(candle.volume)}</strong></span></>; })()}
      </div>
      <div className="decision-metrics">
        <span><BarChart3/><small>Range high / low</small><strong>{money(data.metrics.high)} / {money(data.metrics.low)}</strong></span>
        <span><Activity/><small>RSI · 14</small><strong>{data.metrics.rsi14 === null ? "—" : data.metrics.rsi14.toFixed(1)}</strong></span>
        <span><Activity/><small>SMA · 20</small><strong>{data.metrics.sma20 === null ? "—" : money(data.metrics.sma20)}</strong></span>
        <span><Activity/><small>Annualized volatility</small><strong>{percent(data.metrics.annualizedVolatility)}</strong></span>
        <span><Activity/><small>Max drawdown</small><strong>{percent(data.metrics.maxDrawdown)}</strong></span>
        <span><BarChart3/><small>Average volume</small><strong>{compact(data.metrics.averageVolume)}</strong></span>
      </div>
      <div className="chart-boundary"><CircleAlert size={14}/><span>Candles and indicators support research only. They are not settlement data, a recommendation or proof that a LevPlay market is executable.</span></div>
    </> : null}
  </section>;
}
