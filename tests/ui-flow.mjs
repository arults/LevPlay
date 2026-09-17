import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const stockTickers = ["aapl", "msft", "nvda", "googl", "amzn", "tsla", "amd", "nflx", "spy", "dis", "uber", "hood", "sofi", "orcl", "qqq"];
const additionalLogos = ["gld", "slv", "pplt", "uso", "copx", "anth", "openai", "anduril", "neural", "figure", "kalshi", "poly", "spacex", "ondo", "prestocks", "solana"];
const [landing, layout, docs, proof, proxy, app, chart, historyApi, css, markets, marketApi, stockLogos, otherLogos] = await Promise.all([
  read("app/page.tsx"),
  read("app/layout.tsx"),
  read("app/docs/page.tsx"),
  read("app/proof/page.tsx"),
  read("proxy.ts"),
  read("app/trade/page.tsx"),
  read("components/market-decision-chart.tsx"),
  read("app/api/markets/history/route.ts"),
  read("app/globals.css"),
  read("lib/markets.ts"),
  read("app/api/markets/route.ts"),
  Promise.all(stockTickers.map((ticker) => read(`public/brands/${ticker}.svg`))),
  Promise.all(additionalLogos.map((ticker) => read(`public/brands/${ticker}.svg`))),
]);

assert.match(landing, /Defined risk\.<br\/><em>Leveraged stocks\.<\/em>/, "homepage must describe the instrument without an absolute safety headline");
assert.match(landing, /No holder margin account\./, "homepage must state the bounded holder benefit");
assert.match(landing, /principal and recovery are never guaranteed/i, "homepage hero must preserve loss and recovery limits");
assert.match(layout, /LevPlay — Leveraged Tokenized Stocks/, "metadata title must use the bounded product description");
assert.match(layout, /Token NAV can approach zero/, "metadata must preserve the material loss boundary");
assert.match(landing, /Leverage you can inspect/, "homepage must explain the instrument without redundant exclusivity language");
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
assert.match(app, /aria-label="Market truth"/, "each market must expose its execution, pricing, mint and backing truth without another click");
assert.match(app, /aria-label="Reference and execution status"/, "the order ticket must expose reference source, freshness, session and execution state on mobile");
assert.match(app, /MarketDecisionChart/, "selected markets must expose a decision chart before order entry");
for (const range of ["24H", "1W", "1M", "1Y", "ALL"]) assert.ok(chart.includes(`"${range}"`), `${range} chart range must be available`);
assert.match(chart, /candlestick-chart/, "chart must render true OHLC candlesticks");
assert.match(chart, /RSI · 14/, "chart must expose RSI");
assert.match(chart, /Annualized volatility/, "chart must expose volatility");
assert.match(chart, /Max drawdown/, "chart must expose drawdown");
assert.match(chart, /settlement data/, "display charts must disclose that they cannot settle trades");
assert.match(historyApi, /const ALLOWED = new Map\(CURATED_MARKETS/, "history requests must be restricted to curated markets");
assert.match(historyApi, /readJsonResponseBounded\(response, 2_000_000\)/, "history payloads must be bounded");
assert.match(historyApi, /settlementEligible: false/, "history data must never be marked settlement eligible");
for (const label of ["Reference", "Freshness", "Session", "Trading blocked"]) assert.ok(app.includes(label), `${label} must appear at the point of action`);
assert.match(app, /selected\.verificationNote \|\| selected\.referenceLabel/, "blocked orders must explain the provider-specific reason without inventing readiness");
for (const label of ["Market state", "Reference use", "Source mint", "Backing \\+ hedge"]) assert.match(app, new RegExp(label), `${label} must be visible in the market truth panel`);
assert.match(app, /\$\{selected\.provider\} research reference/, "review dialog must identify the selected pre-IPO provider");
assert.ok(!app.includes('"PreStocks research reference"'), "Tessera products must never be mislabeled as PreStocks");
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
assert.ok(app.includes("One atomic, wallet-funded") && app.includes("Signing not implemented"), "wallet-direct design and the absent signing implementation must both be explicit");
assert.match(app, /ELIGIBILITY_ATTESTATION_VERSION = "levplay-eligibility-2026-09-17-v1"/, "real-money eligibility acknowledgement must be explicitly versioned");
assert.match(app, /const canExecute = releaseReady && eligibilityAccepted && TRANSACTION_HANDLER_IMPLEMENTED/, "signing must require release readiness, eligibility evidence and an implemented handler");
assert.match(app, /TRANSACTION_HANDLER_IMPLEMENTED = false/, "this release must not expose a non-existent signing path");
assert.match(app, /eligibilityAttestation\.walletAddress === walletAddress/, "eligibility acceptance must be bound to the connected wallet");
assert.match(app, /Paper preview never requires this acknowledgement/, "paper preview must remain usable without a real-money eligibility gate");
for (const disclosure of ["not a U.S. Person", "may not confer stock ownership", "loss of most or all invested capital", "confirmed Solana transactions are final"]) assert.ok(app.includes(disclosure), `${disclosure} must be acknowledged before future real-money signing`);
assert.match(app, /forgeable browser record is a UX prototype, not a security control or legal approval/i, "the UI must not misrepresent client storage as a security or legal boundary");
assert.ok(app.includes("Signing not implemented") && app.includes("No audited transaction construction or signing handler exists"), "no CTA may imply that an absent signing handler exists");
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
assert.match(css, /\.ticket-evidence>div\{display:grid;grid-template-columns:repeat\(3,1fr\)\}/, "reference evidence must stay compact in the order ticket");
assert.match(proof, /Demo ready · real-money execution locked/, "public proof must separate deployment readiness from fund readiness");
assert.match(proof, /No market currently has two admitted feeds/, "public proof must disclose the current oracle blocker");
assert.match(proof, /A Solana specialist audit, economic review and retest are still required/, "public proof must not imply an external audit exists");

console.log("LevPlay UI flow: lifecycle, wallet, Ondo/PreStocks catalog, Standby and responsive assertions passed");
