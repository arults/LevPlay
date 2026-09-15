import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/markets.ts", import.meta.url), "utf8");
const markets = [...source.matchAll(/symbol: "([A-Z]+x)"[^\n]+category: "([^"]+)"[^\n]+mint: "([1-9A-HJ-NP-Za-km-z]+)"/g)].map((match) => ({ symbol: match[1], category: match[2], mint: match[3] }));
assert.equal(markets.length, 35, "exactly 15 US stocks, 15 Hong Kong stocks and 5 commodity references must be pinned");

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

const assets = await mapLimit(markets, 6, async (market) => {
  let response;
  try { response = await fetchWithRetry(`https://api.xstocks.fi/api/v2/public/assets/${market.symbol}`); }
  catch (error) { throw new Error(`${market.symbol} asset verification failed`, { cause: error }); }
  assert.equal(response.status, 200, `${market.symbol} must exist in xStocks`);
  const asset = await response.json();
  const solana = asset.deployments.find((deployment) => deployment.network === "Solana");
  assert.equal(solana?.address, market.mint, `${market.symbol} API mint must match pinned mint`);
  assert.equal(solana?.supportsAtomicSwaps, true, `${market.symbol} must support atomic Solana swaps`);
  assert.equal(asset.isTradingHalted, false, `${market.symbol} must not be halted`);
  if (market.category === "Hong Kong") {
    assert.equal(asset.underlying?.listingCountry, "HK", `${market.symbol} must be an issuer-identified Hong Kong listing`);
    assert.equal(asset.trading?.exchange?.mic, "XHKG", `${market.symbol} must trade on HKEX`);
  }
  return asset;
});

const oracleResponse = await fetchWithRetry("https://api.xstocks.fi/api/v2/public/oracles?pageSize=100&network=Solana");
assert.equal(oracleResponse.status, 200, "xStocks oracle registry must respond");
const oraclePayload = await oracleResponse.json();
for (const market of markets) {
  const providers = new Set(oraclePayload.nodes.filter((oracle) => oracle.network === "Solana" && oracle.symbol === market.symbol).map((oracle) => oracle.managedBy));
  if (markets.indexOf(market) < 10) {
    assert.ok(providers.has("Pyth"), `${market.symbol} requires a Pyth feed before launch`);
    assert.ok(providers.has("Chainlink"), `${market.symbol} requires a Chainlink feed before launch`);
  }
}

let accounts;
for (const rpc of ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"]) {
  try {
    const response = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(markets.map((market, index) => ({ jsonrpc: "2.0", id: index + 1, method: "getAccountInfo", params: [market.mint, { encoding: "jsonParsed", commitment: "confirmed" }] }))), signal: AbortSignal.timeout(20_000) });
    if (response.ok) { accounts = await response.json(); break; }
  } catch { /* use the next provider */ }
}
assert.ok(Array.isArray(accounts), "an independent Solana mainnet RPC must respond");
for (const item of accounts) {
  const market = markets[item.id - 1];
  const value = item.result?.value;
  const extensions = value?.data?.parsed?.info?.extensions || [];
  const extension = (name) => extensions.find((entry) => entry.extension === name)?.state;
  assert.equal(value?.owner, "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", `${market.symbol} must use Token-2022`);
  assert.equal(extension("tokenMetadata")?.symbol, market.symbol, `${market.symbol} metadata must match`);
  assert.ok(extension("scaledUiAmountConfig"), `${market.symbol} must expose scaled UI amounts`);
  assert.equal(extension("pausableConfig")?.paused, false, `${market.symbol} mint must not be paused`);
  assert.equal(extension("transferHook")?.programId, null, `${market.symbol} must not invoke an unknown transfer hook`);
}

console.log(`LevPlay live integrations: ${assets.length} xStocks, 10 dual-feed launch-gated stock markets and ${accounts.length} Token-2022 mints verified`);
