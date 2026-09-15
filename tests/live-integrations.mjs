import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/markets.ts", import.meta.url), "utf8");
const markets = [...source.matchAll(/symbol: "([A-Z]+x)"[^\n]+mint: "([1-9A-HJ-NP-Za-km-z]+)"/g)].map((match) => ({ symbol: match[1], mint: match[2] }));
assert.equal(markets.length, 15, "exactly 15 curated markets must be pinned");

const assets = await Promise.all(markets.map(async (market) => {
  const response = await fetch(`https://api.xstocks.fi/api/v2/public/assets/${market.symbol}`, { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, `${market.symbol} must exist in xStocks`);
  const asset = await response.json();
  const solana = asset.deployments.find((deployment) => deployment.network === "Solana");
  assert.equal(solana?.address, market.mint, `${market.symbol} API mint must match pinned mint`);
  assert.equal(solana?.supportsAtomicSwaps, true, `${market.symbol} must support atomic Solana swaps`);
  assert.equal(asset.isTradingHalted, false, `${market.symbol} must not be halted`);
  return asset;
}));

const oracleResponse = await fetch("https://api.xstocks.fi/api/v2/public/oracles?pageSize=100&network=Solana", { signal: AbortSignal.timeout(20_000) });
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

console.log(`LevPlay live integrations: ${assets.length} xStocks, 10 dual-feed stock markets and ${accounts.length} Token-2022 mints verified`);
