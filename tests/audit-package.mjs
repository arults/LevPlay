import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const required = [
  "AUDIT_SCOPE.md",
  "AUDIT_EVIDENCE.md",
  "SECURITY_INVARIANTS.md",
  "SECURITY.md",
  "PROTOCOL_SPEC.md",
  "lib/risk-engine.ts",
  "tests/risk-engine.mjs",
  "programs/levplay/INTERFACE.md",
  "programs/levplay/THREAT_MODEL.md",
  "audit/deployment-manifest.schema.json"
];

const files = await Promise.all(required.map(async (path) => [path, await read(path)]));
for (const [path, content] of files) assert.ok(content.trim().length > 200, `${path} must be substantive`);

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

const marketSource = await read("lib/markets.ts");
assert.equal([...marketSource.matchAll(/category: "Stocks"/g)].length, 15, "exactly 15 public-stock references must be pinned");
assert.equal([...marketSource.matchAll(/category: "Pre-IPO"/g)].length, 7, "the observed PreStocks catalog must contain seven live-priced pinned references");
for (const name of ["Anthropic", "OpenAI", "Anduril", "Neuralink", "Kalshi", "Polymarket", "SpaceX"]) assert.ok(marketSource.includes(`name: "${name}"`), `${name} PreStocks reference must be pinned`);

console.log("LevPlay audit package: scope, evidence index, schema and invariants passed");
