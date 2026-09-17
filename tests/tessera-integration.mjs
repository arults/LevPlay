import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const markets = await readFile(new URL("../lib/markets.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/markets/route.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../app/trade/page.tsx", import.meta.url), "utf8");
const registry = await readFile(new URL("../lib/product-registry.ts", import.meta.url), "utf8");

assert.match(markets, /oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ/);
assert.match(markets, /TKLSidmLVt3cqGaaodG8tyRzoANfQwoh67AccjmubeZ/);
assert.match(markets, /provider: "Tessera"/);
assert.match(route, /rest-api\.tessera\.pe\/v1\/public\/token-details/);
assert.match(route, /referenceStatus: available \? "timestamp_unavailable"/);
assert.match(route, /pythFeedId: null/);
assert.match(route, /verified: false/);
assert.match(route, /reference\?\.mint === item\.mint/);
assert.match(ui, /setPreIpoProvider\("Tessera"\)/);
assert.match(ui, /Issuer marks lack an observation timestamp/);
assert.doesNotMatch(registry, /TESSERA_OPENAI|TESSERA_KALSHI/, "paper references must not enter the production admission registry");

console.log("LevPlay Tessera boundary: pinned mints, display-only marks and fail-closed settlement passed");
