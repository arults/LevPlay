import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of [
  "AUDIT_SCOPE.md","SECURITY_AUDIT.md","MAINNET_LAUNCH_CHECKLIST.md","SECURITY_INVARIANTS.md",
  "ORACLE_ARCHITECTURE.md","TESSERA_INTEGRATION.md","REFERENCE_DATA_POLICY.md",
  "programs/levplay-core/src/lib.rs","programs/levplay-sbf/src/lib.rs",
]) await access(new URL(`../${path}`, import.meta.url));

const [markets, products, protocol, release, venue, ui, api] = await Promise.all([
  read("lib/markets.ts"), read("lib/product-registry.ts"), read("lib/protocol.ts"),
  read("lib/release-manifest.ts"), read("lib/venue-registry.ts"), read("app/trade/page.tsx"), read("app/api/markets/route.ts"),
]);
assert.equal([...markets.matchAll(/provider: "PreStocks"/g)].length, 8);
assert.equal([...markets.matchAll(/provider: "Tessera"/g)].length, 2);
assert.ok(!markets.includes("Ondo") && !markets.includes("xStocks"));
assert.match(products, /const leverages: Leverage\[\] = \[2\]/);
assert.match(products, /usesBorrowOrMargin/);
assert.match(products, /permissionlessClose/);
assert.match(products, /independentExitLiquidity/);
assert.match(venue, /provider set must be exactly PreStocks and Tessera/);
assert.match(venue, /short-gain collateral is below the full 2x downside payout/);
assert.match(release, /markets: \{ ANTH2L: ReleaseMarket; ANTH2S: ReleaseMarket \}/);
assert.match(protocol, /VALUE_MOVING_HANDLERS_IMPLEMENTED = false/);
assert.match(protocol, /EXTERNAL_EVIDENCE_SIGNATURES_VERIFIED = false/);
assert.match(protocol, /ANTH2L,ANTH2S/);
assert.ok(!ui.includes("Ondo") && !ui.includes("xStocks"));
assert.match(api, /verified: false/);
assert.match(api, /status: "fail-closed"/);
assert.doesNotMatch(api, /privateKey|secretKey|mnemonic/i);
console.log("LevPlay audit package: pre-IPO scope, collateral, oracle and hard-lock evidence passed");
