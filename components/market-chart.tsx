"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CircleAlert, LoaderCircle } from "lucide-react";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type ChartResponse = { status: "display" | "unavailable"; candles: Candle[]; reason?: string; pool?: string; checkedAt?: string };
type Range = "24H" | "7D" | "30D" | "120D";
const ranges: Range[] = ["24H", "7D", "30D", "120D"];
const money = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: value >= 1 ? 2 : 6 })}`;

export function MarketChart({ symbol, ticker }: { symbol: string; ticker: string }) {
  const [range, setRange] = useState<Range>("24H");
  const [result, setResult] = useState<{ key: string; response: ChartResponse } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const requestKey = `${symbol}:${range}`;
  const response = result?.key === requestKey ? result.response : null;
  const loading = response === null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { signal: controller.signal })
      .then((result) => { if (!result.ok) throw new Error("Chart request failed"); return result.json() as Promise<ChartResponse>; })
      .then((data) => { if (!controller.signal.aborted) setResult({ key: requestKey, response: data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, response: { status: "unavailable", candles: [], reason: "Price history is unavailable right now." } }); });
    return () => controller.abort();
  }, [symbol, range, requestKey]);

  const candles = useMemo(() => response?.status === "display" ? response.candles : [], [response]);
  const chart = useMemo(() => {
    if (candles.length < 2) return null;
    const low = Math.min(...candles.map((item) => item.low));
    const high = Math.max(...candles.map((item) => item.high));
    const min = Math.max(0, low - (high - low) * .08);
    const span = Math.max(high - min, high * .001);
    const maxVolume = Math.max(1, ...candles.map((item) => item.volume));
    const y = (price: number) => 14 + (1 - (price - min) / span) * 192;
    const step = 760 / candles.length;
    const width = Math.max(2, step * .58);
    return { min, span, y, step, width, maxVolume };
  }, [candles]);
  const selected = candles[hover !== null && hover < candles.length ? hover : candles.length - 1];
  const change = candles.length > 1 ? (candles[candles.length - 1].close / candles[0].open - 1) * 100 : 0;

  return <section className="decision-chart" aria-label={`${ticker} historical price chart`}>
    <div className="chart-heading"><div><span className="eyebrow">DEX pool history · display only</span><h3>{ticker} candlesticks</h3><p>Secondary-market trades in USD can differ from the issuer token price above. Neither can settle a LevPlay position.</p></div><div className="range-tabs" aria-label="Chart range">{ranges.map((item) => <button key={item} aria-pressed={range === item} className={range === item ? "active" : ""} onClick={() => { setHover(null); setRange(item); }}>{item}</button>)}</div></div>
    {loading ? <div className="chart-state"><LoaderCircle className="spin" size={19}/>Loading price history…</div>
      : !chart || !selected ? <div className="chart-state error"><CircleAlert size={20}/>{response?.reason || "No historical candles available for this market."}</div>
      : <>
        <div className="chart-summary"><strong>{money(selected.close)}</strong><span className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span><small>{new Date(selected.time * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small></div>
        <svg className="candlestick-chart" viewBox="0 0 800 260" role="img" aria-label={`${candles.length} ${range} historical candles for ${ticker}, displayed from a DEX pool`} onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((line) => <g key={line}><line className="chart-grid" x1="25" x2="785" y1={18 + line * 47} y2={18 + line * 47}/><text x="1" y={21 + line * 47} fontSize="10" fill="#8a7868">{line === 0 ? "H" : line === 4 ? "L" : ""}</text></g>)}
          {candles.map((item, index) => { const x = 25 + (index + .5) * chart.step; const up = item.close >= item.open; const top = Math.min(chart.y(item.open), chart.y(item.close)); const body = Math.max(1.5, Math.abs(chart.y(item.open) - chart.y(item.close))); return <g key={item.time} className={up ? "candle up" : "candle down"} onMouseEnter={() => setHover(index)}><line x1={x} x2={x} y1={chart.y(item.high)} y2={chart.y(item.low)}/><rect x={x - chart.width / 2} y={top} width={chart.width} height={body}/><rect className="volume" x={x - chart.width / 2} y={252 - item.volume / chart.maxVolume * 35} width={chart.width} height={item.volume / chart.maxVolume * 35}/><rect x={x - chart.step / 2} y="0" width={chart.step} height="260" opacity="0"/></g>; })}
        </svg>
        <div className="candle-readout"><span><small>Open</small><strong>{money(selected.open)}</strong></span><span><small>High</small><strong>{money(selected.high)}</strong></span><span><small>Low</small><strong>{money(selected.low)}</strong></span><span><small>Close</small><strong>{money(selected.close)}</strong></span><span><small>Volume</small><strong>{money(selected.volume)}</strong></span><span><small>Data</small><strong>{candles.length} bars</strong></span></div>
        <p className="chart-boundary"><BarChart3 size={14}/>GeckoTerminal pool history is a secondary-market display reference. 120D shows up to 120 daily candles; gaps and thin liquidity can distort a chart.</p>
      </>}
  </section>;
}
