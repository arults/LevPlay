import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [page, markets, wallet, protocol, products, config] = await Promise.all([
  read("app/trade/page.tsx"), read("app/api/markets/route.ts"), read("app/api/wallet/route.ts"),
  read("lib/protocol.ts"), read("lib/product-registry.ts"), read("next.config.ts"),
]);

assert.ok(!page.includes("dangerouslySetInnerHTML"));
assert.ok(!page.match(/\beval\s*\(/));
assert.ok(!page.includes("sendTransaction("));
assert.match(page, /TRANSACTION_HANDLER_IMPLEMENTED = false/);
assert.match(page, /const canExecute = releaseReady && eligibilityAccepted && TRANSACTION_HANDLER_IMPLEMENTED/);
assert.match(page, /disabled=\{!paperMode && \(!releaseReady \|\| eligibilityAccepted\)\}/);
assert.match(page, /setTimeout\(\(\) => setNotice\(null\), 3_000\)/);
assert.ok(page.includes("Paper preview only. No funds or transactions will move."));
assert.ok(!page.includes("Ondo") && !page.includes("xStocks"));
assert.match(markets, /prestocks\.com\/api\/prestocks/);
assert.match(markets, /rest-api\.tessera\.pe\/v1\/public\/token-details/);
assert.match(markets, /api\.dexscreener\.com\/latest\/dex\/tokens/);
assert.match(markets, /candidate\.chainId === "solana"/);
assert.match(markets, /candidate\.baseToken\?\.address === mint/);
assert.match(markets, /verified: false/);
assert.match(markets, /status: "fail-closed"/);
assert.doesNotMatch(markets, /verified:\s*true/);
assert.doesNotMatch(markets, /response\.json\(\)/);
assert.match(markets, /readJsonResponseBounded\(response, 2_000_000\)/);
assert.match(markets, /TOKEN_PROGRAM \|\| tokenProgram === TOKEN_2022_PROGRAM/);
assert.match(wallet, /getGenesisHash/);
assert.match(wallet, /knownMints\.has\(mint\)/);
assert.match(wallet, /PREIPO_MARKETS/);
assert.match(wallet, /TESSERA_MARKETS/);
assert.ok(!wallet.includes("Access-Control-Allow-Origin"));
assert.match(wallet, /InstanceRateLimiter/);
for (const gate of ["LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON","LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH","LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON","LEVPLAY_SVM_EXECUTION_ENABLED"]) assert.ok(`${protocol}\n${products}`.includes(gate));
assert.match(protocol, /VALUE_MOVING_HANDLERS_IMPLEMENTED = false/);
assert.match(protocol, /ids\.join\(","\) !== "OPENAI2L,OPENAI2S"/);
assert.match(protocol, /observations\.length >= 2/);
assert.match(protocol, /bytes\[12\] === 0/);
for (const header of ["Content-Security-Policy","Cross-Origin-Opener-Policy","Permissions-Policy","Referrer-Policy","Strict-Transport-Security","X-Content-Type-Options","X-Frame-Options"]) assert.ok(config.includes(header));
console.log("LevPlay source security: pre-IPO display isolation, wallet allowlist and release locks passed");
