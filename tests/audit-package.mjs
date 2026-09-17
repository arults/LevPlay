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
  "programs/levplay-core/src/risk_vault.rs",
  "programs/levplay-core/src/program_boundary.rs",
  "programs/levplay-core/src/state_accounts.rs",
  "PROGRAM_STATE_V1.md",
  "programs/levplay-sbf/Cargo.toml",
  "programs/levplay-sbf/src/lib.rs",
  "programs/levplay-sbf/src/account_validation.rs",
  "programs/levplay-sbf/src/open_validation.rs",
  "programs/levplay-sbf/src/token_validation.rs",
  "programs/levplay-sbf/README.md",
  ".github/workflows/sbf-build.yml",
  "lib/backing-engine.ts",
  "lib/venue-registry.ts",
  "lib/product-registry.ts",
  "tests/backing-engine.mjs",
  "tests/venue-registry.mjs",
  "tests/product-registry.mjs",
  "lib/release-evidence.mjs",
  "scripts/generate-release-evidence.mjs",
  "tests/release-evidence.mjs",
  "lib/risk-engine.ts",
  "tests/risk-engine.mjs",
  "programs/levplay/INTERFACE.md",
  "RISK_VAULT_V1.md",
  "PROGRAM_BOUNDARY.md",
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
assert.equal(schema.$defs.baseMarket.properties.sourceProvider.const, "ondo");
assert.equal(schema.$defs.baseMarket.properties.sourceAssetSymbol.const, "AAPLon");
assert.ok(schema.$defs.baseMarket.required.includes("sourceMint"));
assert.ok(schema.$defs.baseMarket.required.includes("sourceRegistryHash"));
assert.ok(schema.$defs.baseMarket.required.includes("adapterBinaryHash"));
assert.ok(!("xStockMint" in schema.$defs.baseMarket.properties), "shelved xStocks must not remain in deployment schema");
assert.deepEqual(schema.properties.releaseArtifacts.required, ["sourceSha256", "sbfSha256", "idlSha256", "sbomSha256", "toolchainImageDigest"]);
assert.equal(schema.properties.upgradePolicy.enum.includes("frozen"), true);
assert.equal(schema.properties.upgradePolicy.enum.includes("timelocked"), true);

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
assert.match(multiVenue, /136-product audit candidate/);
assert.match(multiVenue, /three RPC endpoints spanning three named providers/);
assert.match(multiVenue, /external issuer\/provider trust boundaries/);

const rustCore = files.find(([path]) => path === "programs/levplay-core/src/lib.rs")[1];
assert.match(rustCore, /#!\[no_std\]/, "Rust core must remain SBF-compatible at the language boundary");
assert.match(rustCore, /#!\[forbid\(unsafe_code\)\]/, "unsafe Rust is forbidden");
assert.ok(!/\bf(32|64)\b/.test(rustCore), "protocol arithmetic must not use floating-point values");
for (const primitive of ["checked_add", "checked_sub", "checked_mul", "checked_div"]) assert.ok(rustCore.includes(primitive), `${primitive} must remain explicit`);

const stateSource = files.find(([path]) => path === "programs/levplay-core/src/state_accounts.rs")[1];
assert.match(stateSource, /CONFIG_STATE_LEN: usize = 208/);
assert.match(stateSource, /MARKET_STATE_LEN: usize = 392/);
assert.match(stateSource, /usdc_token_program/);
assert.match(stateSource, /product_token_program/);
assert.match(stateSource, /reader\.zeroes/);
assert.match(stateSource, /validate_addresses/);

const sbfManifest = files.find(([path]) => path === "programs/levplay-sbf/Cargo.toml")[1];
assert.match(sbfManifest, /solana-program = "=2\.2\.1"/, "Solana SDK must remain exactly pinned");
assert.match(sbfManifest, /spl-token = \{ version = "=8\.0\.0"/, "legacy SPL parser must remain exactly pinned");
assert.match(sbfManifest, /spl-token-2022 = \{ version = "=8\.0\.1"/, "Token-2022 parser must remain exactly pinned");
const sbfSource = files.find(([path]) => path === "programs/levplay-sbf/src/lib.rs")[1];
assert.match(sbfSource, /EXECUTION_LOCKED_ERROR/);
assert.match(sbfSource, /decode_instruction\(instruction_data\)/);
assert.ok(!sbfSource.includes("invoke("), "SBF shell must not gain an unaudited CPI path");
const accountValidation = files.find(([path]) => path === "programs/levplay-sbf/src/account_validation.rs")[1];
assert.match(accountValidation, /account\.owner != program_id/);
assert.match(accountValidation, /canonical_config_address/);
assert.match(accountValidation, /canonical_market_address/);
assert.match(accountValidation, /account\.is_writable != writable/);
const tokenValidation = files.find(([path]) => path === "programs/levplay-sbf/src/token_validation.rs")[1];
assert.match(tokenValidation, /validate_legacy_mint/);
assert.match(tokenValidation, /validate_product_mint/);
assert.match(tokenValidation, /ExtensionType::ImmutableOwner/);
assert.match(tokenValidation, /extensions\.is_empty\(\)/);
assert.match(tokenValidation, /delegate != COption::None/);
assert.match(tokenValidation, /close_authority != COption::None/);
const openValidation = files.find(([path]) => path === "programs/levplay-sbf/src/open_validation.rs")[1];
assert.match(openValidation, /validate_open_account_set/);
assert.match(openValidation, /market\.primary_oracle_program/);
assert.match(openValidation, /market\.secondary_oracle_program/);
assert.match(openValidation, /validate_descriptor_set/);
assert.match(openValidation, /validate_product_mint/);
const boundarySource = files.find(([path]) => path === "programs/levplay-core/src/program_boundary.rs")[1];
assert.match(boundarySource, /usdc_token_program/);
assert.match(boundarySource, /product_token_program/);
const sbfWorkflow = files.find(([path]) => path === ".github/workflows/sbf-build.yml")[1];
assert.match(sbfWorkflow, /AGAVE_VERSION: v4\.2\.1/);
assert.match(sbfWorkflow, /AGAVE_ARCHIVE_SHA256: [a-f0-9]{64}/);
assert.match(sbfWorkflow, /sha256sum --check --strict/);
assert.match(sbfWorkflow, /-keypair\.json/);

const marketSource = await read("lib/markets.ts");
assert.equal([...marketSource.matchAll(/market\("[A-Z]+on"[^\n]+"Stocks"/g)].length, 15, "exactly 15 Ondo stock references must be selected");
assert.equal([...marketSource.matchAll(/market\("[A-Z]+on"[^\n]+"Commodities"/g)].length, 5, "exactly five Ondo commodity-linked references must be selected");
assert.equal([...marketSource.matchAll(/provider: "PreStocks"/g)].length, 8, "the frozen PreStocks launch catalog must contain eight pinned references");
assert.equal([...marketSource.matchAll(/provider: "Tessera"/g)].length, 2, "the paper-only Tessera catalog must contain two pinned references");
assert.ok(!marketSource.includes("xStocks"), "xStocks must remain shelved from the active market source");
assert.ok(!marketSource.includes('symbol: "XAI"'), "xAI must remain excluded from the launch catalog");
for (const name of ["Anthropic", "OpenAI", "Anduril", "Neuralink", "Figure AI", "Kalshi", "Polymarket", "SpaceX"]) assert.ok(marketSource.includes(`name: "${name}"`), `${name} PreStocks reference must be pinned`);

console.log("LevPlay audit package: scope, evidence index, schema and invariants passed");
