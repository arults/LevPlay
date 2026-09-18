import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const marketsSource = await readFile(new URL("../lib/markets.ts", import.meta.url), "utf8");
const productsSource = await readFile(new URL("../lib/product-registry.ts", import.meta.url), "utf8");
const xstocksRouteSource = await readFile(new URL("../app/api/integrations/xstocks/route.ts", import.meta.url), "utf8");
assert.ok(!marketsSource.includes("XSTOCKS_API") && !marketsSource.includes("xstocks.fi"), "xStocks must remain outside active execution markets");
assert.match(productsSource, /products: PRODUCT_CANDIDATES\.length/);
assert.match(productsSource, /XSTOCKS_STATE = "candidate-read-only"/);
assert.match(xstocksRouteSource, /mode: "public-read-only"/);
assert.match(xstocksRouteSource, /executionEnabled: false/);

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(25_000) });
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

for (const [name, url] of [
  ["Ondo", "https://ondo.finance/ondo-stocks"],
  ["PreStocks", "https://prestocks.com/products"],
]) {
  const response = await fetchWithRetry(url);
  assert.equal(response.status, 200, `${name} public product source must respond`);
}

const aaplMint = "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo";
let account;
for (const rpc of ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"]) {
  try {
    const response = await fetchWithRetry(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [aaplMint, { encoding: "jsonParsed", commitment: "confirmed" }] }) });
    if (response.ok) { account = (await response.json()).result?.value; if (account) break; }
  } catch { /* try independent RPC */ }
}
assert.ok(account, "an independent Solana RPC must return the pinned AAPLon mint");
assert.equal(account.owner, "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "AAPLon must use Token-2022");
assert.equal(account.data?.parsed?.info?.isInitialized, true, "AAPLon mint must be initialized");

console.log("LevPlay live integrations: Ondo, PreStocks and pinned AAPLon Token-2022 source verified");
