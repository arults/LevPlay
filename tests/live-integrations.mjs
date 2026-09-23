import assert from "node:assert/strict";
import { PRESTOCKS, TESSERA } from "../lib/product-registry.ts";

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

const prestocksResponse = await fetchWithRetry("https://prestocks.com/api/prestocks");
assert.equal(prestocksResponse.status, 200);
const prestocks = await prestocksResponse.json();
assert.ok(Array.isArray(prestocks));
const published = new Set(prestocks.map((item) => item.contract_address));
for (const asset of PRESTOCKS) assert.ok(published.has(asset.publishedMint), `${asset.symbol} mint must match the issuer catalog`);

const tesseraResponse = await fetchWithRetry("https://rest-api.tessera.pe/v1/public/token-details");
assert.equal(tesseraResponse.status, 200);
const tessera = await tesseraResponse.json();
assert.ok(Array.isArray(tessera));
const tesseraMints = new Set(tessera.map((item) => item.mint));
for (const asset of TESSERA) assert.ok(tesseraMints.has(asset.publishedMint), `${asset.symbol} mint must match Tessera`);

const pinnedMint = PRESTOCKS[0].publishedMint;
let account;
for (const rpc of ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"]) {
  try {
    const response = await fetchWithRetry(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [pinnedMint, { encoding: "jsonParsed", commitment: "confirmed" }] }) });
    if (response.ok) { account = (await response.json()).result?.value; if (account) break; }
  } catch { /* try next RPC */ }
}
assert.ok(account, "an independent Solana RPC must return the pinned PreStocks mint");
assert.ok(["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"].includes(account.owner));
assert.equal(account.data?.parsed?.info?.isInitialized, true);
console.log("LevPlay live integrations: PreStocks, Tessera and pinned Solana mint identities verified");
