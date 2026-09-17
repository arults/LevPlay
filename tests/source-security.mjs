import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [page, markets, wallet, httpSafety, protocol, products, config] = await Promise.all([
  read("app/trade/page.tsx"),
  read("app/api/markets/route.ts"),
  read("app/api/wallet/route.ts"),
  read("lib/http-safety.ts"),
  read("lib/protocol.ts"),
  read("lib/product-registry.ts"),
  read("next.config.ts"),
]);

assert.ok(!page.includes("dangerouslySetInnerHTML"), "client must not render untrusted HTML");
assert.ok(!page.match(/\beval\s*\(/), "client must not evaluate code");
assert.ok(!page.includes("secretKey") && !page.includes("privateKey"), "client must never contain signing keys");
assert.match(page, /disabled=\{!paperMode && \(!releaseReady \|\| eligibilityAccepted\)\}/, "mainnet action must fail closed unless it is the pre-signing acknowledgement step");
assert.match(page, /const canExecute = releaseReady && eligibilityAccepted && TRANSACTION_HANDLER_IMPLEMENTED/, "real-money signing readiness must require release gates, eligibility evidence and an implemented handler");
assert.match(page, /TRANSACTION_HANDLER_IMPLEMENTED = false/, "the absent transaction handler must be an explicit fail-closed gate");
assert.match(page, /eligibilityAttestation\?\.version === ELIGIBILITY_ATTESTATION_VERSION/, "stale eligibility policy versions must fail closed");
assert.match(page, /eligibilityAttestation\.walletAddress === walletAddress/, "eligibility evidence must not cross wallets");
assert.match(page, /window\.localStorage\.removeItem\(ELIGIBILITY_STORAGE_KEY\)/, "malformed eligibility evidence must be discarded");
assert.match(page, /forgeable browser record is a UX prototype, not a security control or legal approval/i, "client storage must not be described as authoritative");
assert.ok(!page.includes("sendTransaction("), "preview must not submit transactions");
assert.ok(page.includes("Paper preview only. No funds or transactions will move."), "paper mode must be unmistakably labeled");
assert.ok(page.includes("levplay-paper-v3"), "paper portfolio and history must persist locally under the direction-aware fee-on-top schema");
assert.ok(page.includes("Your position is") && page.includes("stock reference"), "trade ticket must identify the product and its reference asset");
assert.ok(page.includes('protocol.feeRecipient ? short(protocol.feeRecipient) : "Not configured"'), "fee destination must never be hidden or invented");
assert.match(page, /setTimeout\(\(\) => setNotice\(null\), 3_000\)/, "user notices must clear after three seconds");
assert.ok(page.includes("Insufficient USDC") && page.includes("Insufficient SOL"), "fund and gas failures must be explicit");
assert.match(page, /balance\.usdc >= totalDebit && balance\.sol >= 0\.002/, "mainnet execution state must include token and gas sufficiency");
assert.ok(page.includes("AbortSignal.timeout(12_000)"), "market and protocol reads must time out instead of hanging");

assert.match(markets, /ONDO_API/, "Ondo API origin must be imported from the pinned registry");
assert.match(markets, /process\.env\.ONDO_API_KEY/, "Ondo credentials must remain server-side");
assert.match(markets, /assets\/all\/prices\/latest/, "Ondo display prices must use the documented endpoint");
assert.match(markets, /verified: false/, "provider and DEX display prices must never become settlement verification");
assert.match(markets, /api\.dexscreener\.com\/latest\/dex\/tokens/, "pre-IPO display references must use a pinned HTTPS endpoint");
assert.match(markets, /pair\.chainId === "solana"/, "pre-IPO references must reject other chains");
assert.match(markets, /pair\.baseToken\?\.address === mint/, "pre-IPO references must match the pinned mint");
assert.match(markets, /sourceMintVerified/, "pinned source mints must be independently checked onchain");
assert.match(markets, /Math\.abs\(Date\.now\(\) - timestampMs\) <= DISPLAY_FRESHNESS_MS/, "stale display prices must be identified");
assert.match(markets, /provider_unconfigured/, "missing display credentials must fail with an explicit state");
assert.match(markets, /status: "fail-closed"/, "display provider availability must not unlock settlement");
assert.ok(!markets.includes("XSTOCKS_API"), "xStocks must remain shelved");
assert.ok(!markets.match(/verified:\s*true/), "no server-side display provider may manufacture settlement readiness");

assert.match(wallet, /getGenesisHash/, "wallet reads must verify Solana mainnet");
assert.match(wallet, /knownMints\.has\(mint\)/, "wallet API must return only allowlisted assets");
assert.ok(!wallet.includes("Access-Control-Allow-Origin"), "wallet balances must not be exposed cross-origin");
assert.match(wallet, /readJsonBodyBounded\(request, REQUEST_LIMIT_BYTES\)/, "wallet requests must use a streaming body limit");
assert.match(wallet, /InstanceRateLimiter/, "wallet reads must have a best-effort instance rate limit");
assert.match(wallet, /status: 429/, "wallet rate-limit failures must be explicit");
assert.match(wallet, /retry-after/, "wallet rate limits must tell clients when to retry");
assert.match(wallet, /application\/json/, "wallet endpoint must require JSON");
assert.match(wallet, /isSafeRpcUrl/, "wallet RPC configuration must reject unsafe URLs");
assert.match(wallet, /Oversized RPC response/, "wallet RPC responses must be bounded");
assert.match(wallet, /readJsonResponseBounded\(response, RPC_RESPONSE_LIMIT_BYTES\)/, "chunked RPC responses must be bounded while streaming");
assert.match(httpSafety, /length > maxBytes/, "streamed bodies must stop after their byte limit");
assert.match(httpSafety, /maxKeys = 2_048/, "the in-memory limiter must cap attacker-controlled keys");
assert.match(markets, /isSafeRpcUrl/, "market RPC configuration must reject unsafe URLs");
assert.match(markets, /readJsonResponseBounded\(response, 2_000_000\)/, "Ondo and DEX responses must be bounded while streaming");
assert.match(markets, /readJsonResponseBounded\(response, 500_000\)/, "Tessera responses must be bounded while streaming");
assert.match(markets, /readJsonResponseBounded\(response, 1_000_000\)/, "batched RPC responses must be bounded while streaming");
assert.doesNotMatch(markets, /response\.json\(\)/, "market providers must not bypass bounded response parsing");

for (const gate of [
  "LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON",
  "LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH",
  "LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON",
  "LEVPLAY_SVM_EXECUTION_ENABLED",
]) assert.ok(`${protocol}\n${products}`.includes(gate), `${gate} release gate must exist`);
assert.ok(!protocol.includes("xStockMint"), "shelved xStocks terminology must not remain in the runtime manifest");
assert.match(protocol, /item\.sourceMint/, "source mint must be cross-bound to the product manifest");
assert.match(protocol, /item\.clearingVault/, "USDC clearing vault must be explicit");
assert.match(protocol, /item\.sourceVault/, "source-token vault must be explicit");
assert.match(protocol, /item\.reserveVault/, "Standby USDC reserve must be explicit");
assert.match(protocol, /observations\.length >= 2/, "two independent mainnet RPC observations must be required");
assert.match(protocol, /bytes\[12\] === 0/, "upgradeable programs must be proven frozen from onchain ProgramData");
assert.match(protocol, /sha256\(bytes\.slice\(13\)\).*sbfSha256/s, "deployed SBF bytes must match the release artifact hash");
assert.match(protocol, /LVPCFG01/, "config account bytes must be decoded");
assert.match(protocol, /LVPMKT01/, "market account bytes must be decoded");
assert.match(protocol, /VALUE_MOVING_HANDLERS_IMPLEMENTED = false/, "execution must stay locked while handlers are absent");
assert.match(protocol, /Release manifest is missing or invalid/, "public protocol status must use a stable release-manifest blocker");
assert.doesNotMatch(protocol, /reasons: \[error instanceof Error \? error\.message/, "public protocol status must not expose parser internals");
assert.match(protocol, /rawProducts\.length !== 2/, "extra or missing pilot products must fail closed");
assert.match(protocol, /ids\.join\(","\) !== "AAPL2L,AAPL2S"/, "only the exact pilot pair can pass");
assert.match(protocol, /venueManifestSha256/, "venue evidence must be release-bound");
assert.match(protocol, /productManifestsSha256/, "product evidence must be release-bound");
assert.ok(protocol.includes('!/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(host)'), "RPC configuration must reject IP literals");
assert.match(protocol, /readJsonResponseBounded\(response, RPC_RESPONSE_LIMIT_BYTES\)/, "protocol RPC responses must use bounded streaming reads");

for (const header of [
  "Content-Security-Policy",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "Origin-Agent-Cluster",
  "X-Permitted-Cross-Domain-Policies",
  "X-Content-Type-Options",
  "X-Frame-Options",
]) assert.ok(config.includes(header), `${header} must be configured`);

console.log("LevPlay source security: provider display data, wallet and release gates passed");
