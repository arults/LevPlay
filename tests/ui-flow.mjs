import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const stockTickers = ["aapl", "msft", "nvda", "googl", "amzn", "tsla", "amd", "nflx", "spy", "dis", "uber", "hood", "sofi", "orcl", "qqq"];
const additionalLogos = ["gld", "slv", "pplt", "uso", "copx", "anth", "openai", "anduril", "neural", "figure", "kalshi", "poly", "spacex", "ondo", "prestocks", "solana"];
const [landing, docs, proxy, app, css, markets, marketApi, stockLogos, otherLogos] = await Promise.all([
  read("app/page.tsx"),
  read("app/docs/page.tsx"),
  read("proxy.ts"),
  read("app/trade/page.tsx"),
  read("app/globals.css"),
  read("lib/markets.ts"),
  read("app/api/markets/route.ts"),
  Promise.all(stockTickers.map((ticker) => read(`public/brands/${ticker}.svg`))),
  Promise.all(additionalLogos.map((ticker) => read(`public/brands/${ticker}.svg`))),
]);

assert.match(landing, /Liquidation-Free/, "homepage must state the primary product promise");
assert.match(landing, /Leveraged stock tokens, made clear/, "homepage must explain the instrument without redundant exclusivity language");
assert.match(landing, /No forced wallet liquidation/, "homepage must explain the near-zero holder experience");
assert.match(landing, /real reserve collateral/, "homepage must distinguish funded Standby from cosmetic token dust");
assert.match(landing, /Standby does not guarantee recovery/, "homepage must disclose Standby recovery limits");
assert.match(landing, /https:\/\/app\.levplay\.tech/, "homepage must use the canonical trading-app domain");
assert.ok(!landing.includes("google.com/s2/favicons"), "homepage logos must not depend on a third-party favicon endpoint");
assert.match(landing, /mailto:info@levplay\.tech/, "homepage must publish the support address");
assert.match(landing, /https:\/\/x\.com\/lev__play/, "homepage must link the official X account");
assert.match(docs, /Display is not settlement/, "public documentation must explain the oracle boundary");
assert.match(proxy, /host === "app\.levplay\.tech"/, "app subdomain root must route to trading");
assert.ok(!landing.includes("LevPlay SVM"), "customer-facing brand must be LevPlay");
assert.match(app, /type AppView = "trade" \| "portfolio" \| "history"/, "trade, portfolio and history views must exist");
assert.match(app, /setView\("portfolio"\)/, "successful entry must open the portfolio");
assert.match(app, /setView\("history"\)/, "history must be directly navigable");
assert.match(app, /Open positions \(\{positions\.length\}\)/, "portfolio and history must share a compact activity switcher");
assert.match(app, /pnlPercent\.toFixed\(2\)/, "positions must show unrealized P\/L percentage");
assert.match(app, /paperMode \? "Close"/, "positions must expose a direct close action");
assert.match(app, /setDirection\("Short"\)/, "the audit scope must expose a short position flow");
assert.match(app, /position\.direction === "Long" \? 1 : -1/, "long and short P&L must use opposite signed exposure");
assert.match(app, /Funded Standby floor/, "trade UI must explain the residual-value protection boundary");
assert.match(app, /\[2, 3, 5\]/, "Ondo stocks and commodity-linked products must expose 2x, 3x and 5x choices");
assert.match(app, /selected\.category === "Pre-IPO" \? \[2\]/, "PreStocks must remain limited to 2x");
assert.match(app, /TabsTrigger value="Pre-IPO"/, "pre-IPO references must have a distinct market category");
assert.match(app, /markets\.find\(\(market\) => market\.category === next && \(next !== "Pre-IPO" \|\| market\.provider === preIpoProvider\)\)/, "changing categories must select a visible provider market");
assert.match(app, /PreStocks.*Tessera/s, "pre-IPO view must expose both admitted reference providers");
assert.match(app, /settlement-ready.*display references online/, "footer must distinguish settlement admission from display-price availability");
assert.ok(!app.includes('TabsTrigger value="Hong Kong"'), "Hong Kong products must remain shelved");
assert.match(app, /Public stocks \+ commodities via Ondo/, "active providers must be clear");
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
assert.match(app, /getWallets\(\)/, "wallet discovery must use the Wallet Standard registry");
for (const wallet of ["Phantom", "Backpack", "Jupiter", "Rabby", "OKX Wallet", "Search with WalletConnect"]) assert.ok(app.includes(wallet), `${wallet} must appear in wallet discovery`);
assert.match(app, /Detected on this device/, "installed wallets must be visibly distinguished");
assert.match(app, /Connecting does not approve a trade or move funds/, "wallet selector must explain connection permissions");
assert.match(app, /function AssetLogo/, "market rows and position views must use real asset logos with a safe fallback");
assert.ok(!app.includes("BRAND_DOMAINS[market.ticker]"), "market logos must not depend on a runtime favicon provider");
assert.match(markets, /\/brands\/\$\{ticker\.toLowerCase\(\)\}\.svg/, "every stock must bind to a committed local SVG");
assert.equal(stockLogos.length, 15, "all 15 launch stocks must have committed SVG assets");
assert.equal(otherLogos.length, 16, "commodities, PreStocks and partners must have committed SVG assets");
otherLogos.forEach((logo, index) => assert.match(logo, /<svg[^>]+viewBox=/, `${additionalLogos[index]} must be a valid local vector asset`));
stockLogos.forEach((logo, index) => assert.match(logo, /<svg[^>]+viewBox=/, `${stockTickers[index]} must be a valid local vector asset`));
assert.match(stockLogos[0], /<title>Apple<\/title>/, "AAPL must use the Apple mark rather than a letter tile");
assert.ok(app.includes("Reference unavailable"), "UI must render an explicit missing-reference state without inventing a quote");
assert.match(marketApi, /provider_unconfigured/, "missing credentials must be distinguished from an upstream outage");
assert.match(marketApi, /Last verified display/, "stale display quotes must be labeled rather than treated as live");
assert.match(marketApi, /settlement: \{ required: 2, admitted: 0, status: "fail-closed" \}/, "display provider health must never admit a settlement feed");
assert.match(css, /@media\(max-width:800px\)/, "mobile breakpoint must exist");
assert.match(css, /\.app-nav\{position:fixed;left:0;right:0;bottom:0/, "mobile app navigation must remain thumb-accessible");
assert.match(css, /\.position-card\{grid-template-columns:1fr 1fr/, "positions must collapse to a mobile grid");
assert.match(css, /\.history-head\{display:none\}/, "dense table headers must be removed on mobile");
assert.match(css, /\.workspace-tabs\{width:100%\}/, "mobile activity tabs must use the available width");

console.log("LevPlay UI flow: lifecycle, wallet, Ondo/PreStocks catalog, Standby and responsive assertions passed");
