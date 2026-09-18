import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { corporateActionPause, normalizeXStocksSymbol, scaledUiAmount } from "../lib/xstocks.ts";

assert.equal(normalizeXStocksSymbol("AAPLx"), "AAPLx");
assert.throws(() => normalizeXStocksSymbol("../AAPL"));
assert.equal(scaledUiAmount(1_000_000n, 6, "1.008"), "1.008");
assert.equal(scaledUiAmount(250_000n, 6, "4"), "1");
assert.equal(corporateActionPause(Date.parse("2026-09-19T00:30:00Z"), "2026-09-19T00:30:00Z"), true);
assert.equal(corporateActionPause(Date.parse("2026-09-19T01:00:01Z"), "2026-09-19T00:30:00Z"), false);
assert.equal(corporateActionPause(Date.now(), "invalid"), true, "invalid activation timestamps must fail closed");

const route = readFileSync(new URL("../app/api/integrations/xstocks/route.ts", import.meta.url), "utf8");
assert.match(route, /executionEnabled: false/);
assert.ok(!route.includes("NEXT_PUBLIC_XSTOCKS"), "xStocks credentials must remain server-only");
assert.match(route, /rawAmountsRequiredForTransactions: true/);
console.log("xStocks adapter: 9 validation and fail-closed cases passed");
