import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const required = [
  "AUDIT_SCOPE.md",
  "AUDIT_EVIDENCE.md",
  "SECURITY_INVARIANTS.md",
  "SECURITY.md",
  "PROTOCOL_SPEC.md",
  "BACKING_VENUE_DECISION.md",
  "ONDO_ADAPTER_SPEC.md",
  "MULTI_VENUE_PRODUCT_LAYER.md",
  "Cargo.toml",
  "Cargo.lock",
  "rust-toolchain.toml",
  "programs/levplay-core/Cargo.toml",
  "programs/levplay-core/src/lib.rs",
  "lib/backing-engine.ts",
  "lib/venue-registry.ts",
  "lib/product-registry.ts",
  "tests/backing-engine.mjs",
  "tests/venue-registry.mjs",
  "tests/product-registry.mjs",
  "lib/risk-engine.ts",
  "tests/risk-engine.mjs",
  "programs/levplay/INTERFACE.md",
  "programs/levplay/THREAT_MODEL.md",
  "audit/deployment-manifest.schema.json"
];

const files = await Promise.all(required.map(async (path) => [path, await read(path)]));
for (const [path, content] of files) {
  const minimumLength = path === "Cargo.lock" || path === "rust-toolchain.toml" ? 40 : 200;
  assert.ok(content.trim().length > minimumLength, `${path} must be substantive`);
}

const scope = files.find(([path]) => path === "AUDIT_SCOPE.md")[1];
assert.match(scope, /AAPL2L/);
assert.match(scope, /AAPL2S/);
assert.match(scope, /aggregate mainnet canary ceiling is \$1,000/);

const schema = JSON.parse(files.find(([path]) => path.endsWith(".json"))[1]);
assert.deepEqual(schema.properties.markets.required, ["AAPL2L", "AAPL2S"]);
assert.equal(schema.$defs.baseMarket.additionalProperties, false);
assert.equal(schema.$defs.baseMarket.properties.leverage.const, 2);
assert.ok(schema.$defs.baseMarket.required.includes("reserveVault"));
assert.deepEqual([schema.$defs.baseMarket.properties.standbyBps.minimum, schema.$defs.baseMarket.properties.standbyBps.maximum], [1, 500]);

const invariants = files.find(([path]) => path === "SECURITY_INVARIANTS.md")[1];
assert.match(invariants, /share no vault, product mint, adapter market, nonce namespace or solvency accounting/);
assert.match(invariants, /No instruction accepts generic CPI bytes/);
assert.match(invariants, /Short exposure additionally proves available borrow\/perpetual capacity/);
assert.match(invariants, /A residual NAV floor cannot be synthesized/);

const venueDecision = files.find(([path]) => path === "BACKING_VENUE_DECISION.md")[1];
assert.match(venueDecision, /No production backing route is admitted/);
assert.match(venueDecision, /AAPL2S.*bounded-loss derivative/s);
assert.match(venueDecision, /independent emergency exit route/);
assert.match(venueDecision, /Ondo Stocks on Solana/);

const ondoAdapter = files.find(([path]) => path === "ONDO_ADAPTER_SPEC.md")[1];
assert.match(ondoAdapter, /123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo/);
assert.match(ondoAdapter, /must never accept an arbitrary Ondo program/);
assert.match(ondoAdapter, /Close and pro-rata wind-down remain permissionless/);

const multiVenue = files.find(([path]) => path === "MULTI_VENUE_PRODUCT_LAYER.md")[1];
assert.match(multiVenue, /134-product audit candidate/);
assert.match(multiVenue, /three independent RPC domains/);
assert.match(multiVenue, /external issuer\/provider trust boundaries/);

const rustCore = files.find(([path]) => path === "programs/levplay-core/src/lib.rs")[1];
assert.match(rustCore, /#!\[no_std\]/, "Rust core must remain SBF-compatible at the language boundary");
assert.match(rustCore, /#!\[forbid\(unsafe_code\)\]/, "unsafe Rust is forbidden");
assert.ok(!/\bf(32|64)\b/.test(rustCore), "protocol arithmetic must not use floating-point values");
for (const primitive of ["checked_add", "checked_sub", "checked_mul", "checked_div"]) assert.ok(rustCore.includes(primitive), `${primitive} must remain explicit`);

const marketSource = await read("lib/markets.ts");
assert.equal([...marketSource.matchAll(/market\("[A-Z]+on"[^\n]+"Stocks"/g)].length, 15, "exactly 15 Ondo stock references must be selected");
assert.equal([...marketSource.matchAll(/market\("[A-Z]+on"[^\n]+"Commodities"/g)].length, 5, "exactly five Ondo commodity-linked references must be selected");
assert.equal([...marketSource.matchAll(/category: "Pre-IPO"/g)].length, 7, "the observed PreStocks catalog must contain seven live-priced pinned references");
assert.ok(!marketSource.includes("xStocks"), "xStocks must remain shelved from the active market source");
for (const name of ["Anthropic", "OpenAI", "Anduril", "Neuralink", "Kalshi", "Polymarket", "SpaceX"]) assert.ok(marketSource.includes(`name: "${name}"`), `${name} PreStocks reference must be pinned`);

console.log("LevPlay audit package: scope, evidence index, schema and invariants passed");
