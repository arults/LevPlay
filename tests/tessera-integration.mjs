import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [markets, route, ui] = await Promise.all([
  readFile(new URL("../lib/markets.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/markets/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/trade/page.tsx", import.meta.url), "utf8"),
]);
assert.match(markets, /provider: "Tessera"/);
assert.match(markets, /TESSERA_OPENAI/);
assert.match(markets, /TESSERA_KALSHI/);
assert.match(route, /rest-api\.tessera\.pe\/v1\/public\/token-details/);
assert.match(route, /timestamp_unavailable/);
assert.match(route, /cannot settle a trade/);
assert.match(ui, /setPreIpoProvider\("Tessera"\)/);
assert.match(ui, /2× long and short/);
assert.ok(!ui.includes("Ondo"));
console.log("LevPlay Tessera boundary: pinned mints, 2x catalog and fail-closed settlement passed");
