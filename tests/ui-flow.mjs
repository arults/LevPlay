import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [landing, layout, docs, proof, proxy, app, css, markets, marketApi, chart, chartApi] = await Promise.all([
  read("app/page.tsx"), read("app/layout.tsx"), read("app/docs/page.tsx"), read("app/proof/page.tsx"),
  read("proxy.ts"), read("app/trade/page.tsx"), read("app/globals.css"), read("lib/markets.ts"), read("app/api/markets/route.ts"),
  read("components/market-chart.tsx"), read("app/api/chart/route.ts"),
]);
assert.match(landing, /Pre-IPO stocks\.<br\/><em>2× your direction\.<\/em>/);
assert.match(landing, /No holder margin debt\./);
assert.match(landing, /8 PreStocks references/);
assert.match(landing, /2 Tessera references/);
assert.match(landing, /2× long \/ short candidates/);
assert.ok(!landing.includes("Ondo") && !landing.includes("xStocks"));
assert.match(layout, /LevPlay — Leveraged Tokenized Stocks/);
assert.match(landing, /https:\/\/app\.levplay\.tech/);
assert.match(landing, /mailto:info@levplay\.tech/);
assert.match(docs, /Display is not settlement/);
assert.match(proxy, /host === "app\.levplay\.tech"/);
assert.match(app, /type AppView = "trade" \| "portfolio" \| "history"/);
assert.match(app, /setDirection\("Short"\)/);
assert.match(app, /enum: \[2\]/);
assert.match(app, /setPreIpoProvider\("PreStocks"\)/);
assert.match(app, /setPreIpoProvider\("Tessera"\)/);
assert.match(app, /aria-label="Market truth"/);
assert.match(app, /aria-label="Reference and execution status"/);
assert.match(app, /<MarketChart key=\{selected.symbol\}/);
assert.match(chart, /These prices cannot settle a LevPlay position/);
assert.match(chartApi, /ALL_MARKETS.find/);
assert.match(chartApi, /token=\$\{market.mint\}/);
assert.match(app, /const totalDebit = amount \+ fee/);
assert.match(app, /TRANSACTION_HANDLER_IMPLEMENTED = false/);
assert.match(app, /getWallets\(\)/);
for (const wallet of ["Phantom","Backpack","Jupiter","Rabby","OKX Wallet","Search with WalletConnect"]) assert.ok(app.includes(wallet));
assert.match(app, /setTimeout\(\(\) => setNotice\(null\), 3_000\)/);
assert.ok(!app.includes("Ondo") && !app.includes("xStocks"));
assert.equal([...markets.matchAll(/provider: "PreStocks"/g)].length, 8);
assert.equal([...markets.matchAll(/provider: "Tessera"/g)].length, 2);
assert.match(marketApi, /settlement: \{ required: 2, admitted: 0, status: "fail-closed" \}/);
assert.match(css, /@media\(max-width:800px\)/);
assert.match(proof, /Demo ready · real-money execution locked/);
console.log("LevPlay UI flow: 2x pre-IPO long/short, wallet, proof and responsive assertions passed");
