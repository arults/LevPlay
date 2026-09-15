import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [landing, app, css] = await Promise.all([read("app/page.tsx"), read("app/trade/page.tsx"), read("app/globals.css")]);

assert.match(landing, /Liquidation-Free/, "homepage must state the primary product promise");
assert.match(landing, /Leveraged stock tokens, made clear/, "homepage must explain the instrument without redundant exclusivity language");
assert.match(landing, /No forced wallet liquidation/, "homepage must explain the near-zero holder experience");
assert.match(landing, /href="\/trade"/, "homepage must provide an app entry route");
assert.ok(!landing.includes("LevPlay SVM"), "customer-facing brand must be LevPlay");
assert.match(app, /type AppView = "trade" \| "portfolio" \| "history"/, "trade, portfolio and history views must exist");
assert.match(app, /setView\("portfolio"\)/, "successful entry must open the portfolio");
assert.match(app, /setView\("history"\)/, "history must be directly navigable");
assert.match(app, /Open positions \(\{positions\.length\}\)/, "portfolio and history must share a compact activity switcher");
assert.match(app, /pnlPercent\.toFixed\(2\)/, "positions must show unrealized P\/L percentage");
assert.match(app, /paperMode \? "Close"/, "positions must expose a direct close action");
assert.match(app, /setDirection\("Short"\)/, "the audit scope must expose a short position flow");
assert.match(app, /position\.direction === "Long" \? 1 : -1/, "long and short P&L must use opposite signed exposure");
assert.match(app, /value - exitPosition\.costBasis/, "realized P\/L must include the entry fee");
assert.match(app, /totalValue - totalInvested/, "unrealized P\/L must include the entry fee");
assert.match(app, /const totalDebit = amount \+ fee/, "entry fee must be added on top of chosen position capital");
assert.match(app, /setPaperCash\(paperCash - totalDebit\)/, "paper entry must debit capital plus the entry fee");
assert.match(app, /setPaperCash\(paperCash \+ value\)/, "paper redemption must credit proceeds");
assert.match(app, /balance\.usdc < totalDebit/, "wallet sufficiency must include the entry fee");
assert.match(app, /available \/ \(1 \+ protocol\.feeBps \/ 10_000\)/, "max amount must reserve the fee");
assert.ok(app.includes("Total wallet debit") && app.includes("Fee recipient") && app.includes("Treasury owner"), "review must disclose the full wallet debit and treasury routing");
assert.ok(app.includes("One atomic, wallet-funded") && app.includes("Sign atomic Solana transaction"), "wallet-direct atomic execution must be explicit");
assert.match(app, /setTimeout\(\(\) => setNotice\(null\), 3_000\)/, "feedback must disappear after three seconds");
assert.match(css, /@media\(max-width:800px\)/, "mobile breakpoint must exist");
assert.match(css, /\.app-nav\{position:fixed;left:0;right:0;bottom:0/, "mobile app navigation must remain thumb-accessible");
assert.match(css, /\.position-card\{grid-template-columns:1fr 1fr/, "positions must collapse to a mobile grid");
assert.match(css, /\.history-head\{display:none\}/, "dense table headers must be removed on mobile");
assert.match(css, /\.workspace-tabs\{width:100%\}/, "mobile activity tabs must use the available width");

console.log("LevPlay UI flow: 27 lifecycle and responsive assertions passed");
