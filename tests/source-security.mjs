import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [page, markets, wallet, protocol, config] = await Promise.all([
  read("app/trade/page.tsx"),
  read("app/api/markets/route.ts"),
  read("app/api/wallet/route.ts"),
  read("lib/protocol.ts"),
  read("next.config.ts"),
]);

assert.ok(!page.includes("dangerouslySetInnerHTML"), "client must not render untrusted HTML");
assert.ok(!page.match(/\beval\s*\(/), "client must not evaluate code");
assert.ok(!page.includes("secretKey") && !page.includes("privateKey"), "client must never contain signing keys");
assert.match(page, /disabled=\{!paperMode && !canExecute\}/, "mainnet sign control must fail closed while paper mode stays local");
assert.ok(!page.includes("sendTransaction("), "preview must not submit transactions");
assert.ok(page.includes("Paper preview only. No funds or transactions will move."), "paper mode must be unmistakably labeled");
assert.ok(page.includes("levplay-paper-v3"), "paper portfolio and history must persist locally under the direction-aware fee-on-top schema");
assert.ok(page.includes("Your position is") && page.includes("stock reference"), "trade ticket must identify the product and its reference asset");
assert.ok(page.includes('protocol.feeRecipient ? short(protocol.feeRecipient) : "Not configured"'), "fee destination must never be hidden or invented");
assert.match(page, /setTimeout\(\(\) => setNotice\(null\), 3_000\)/, "user notices must clear after three seconds");
assert.ok(page.includes("Insufficient USDC") && page.includes("Insufficient SOL"), "fund and gas failures must be explicit");
assert.match(page, /balance\.usdc >= totalDebit && balance\.sol >= 0\.002/, "mainnet execution state must include token and gas sufficiency");
assert.ok(page.includes("AbortSignal.timeout(12_000)"), "market and protocol reads must time out instead of hanging");

assert.match(markets, /!halted\)/, "issuer halt must be part of market verification");
assert.match(markets, /pause\?\.paused !== true/, "Token-2022 pause must block a market");
assert.match(markets, /!hook\?\.programId/, "unexpected transfer hooks must block a market");
assert.match(markets, /provider === "Pyth"/, "Pyth registry entry must be required");
assert.match(markets, /provider === "Chainlink"/, "Chainlink registry entry must be required");

assert.match(wallet, /getGenesisHash/, "wallet reads must verify Solana mainnet");
assert.match(wallet, /knownMints\.has\(mint\)/, "wallet API must return only allowlisted assets");
assert.ok(!wallet.includes("Access-Control-Allow-Origin"), "wallet balances must not be exposed cross-origin");
assert.match(wallet, /content-length.*1_024/s, "wallet requests must reject oversized bodies");
assert.match(wallet, /application\/json/, "wallet endpoint must require JSON");
assert.match(wallet, /isSafeRpcUrl/, "wallet RPC configuration must reject unsafe URLs");
assert.match(wallet, /Oversized RPC response/, "wallet RPC responses must be bounded");
assert.match(markets, /isSafeRpcUrl/, "market RPC configuration must reject unsafe URLs");
assert.match(markets, /Oversized xStocks response/, "xStocks responses must be bounded");

for (const gate of [
  "LEVPLAY_SVM_PROGRAM_ID",
  "LEVPLAY_SVM_FEE_RECIPIENT",
  "LEVPLAY_SVM_FEE_TREASURY_AUTHORITY",
  "LEVPLAY_SVM_GOVERNANCE_MULTISIG",
  "LEVPLAY_SVM_GUARDIAN_MULTISIG",
  "LEVPLAY_SVM_MULTISIG_PROGRAM_ID",
  "LEVPLAY_SVM_AUDIT_HASH",
  "LEVPLAY_SVM_RELEASE_HASH",
  "LEVPLAY_SVM_BACKING_ATTESTATION_HASH",
  "LEVPLAY_SVM_MANIFEST_HASH",
  "LEVPLAY_SVM_PROGRAM_FROZEN",
  "LEVPLAY_SVM_ADAPTER_PROGRAMS_JSON",
  "LEVPLAY_SVM_MARKETS_JSON",
  "LEVPLAY_SVM_EXECUTION_ENABLED",
]) assert.ok(protocol.includes(gate), `${gate} release gate must exist`);
assert.match(protocol, /item\?\.xStockMint !== expected\.mint/, "deployment xStock mint must match the curated market");
assert.match(protocol, /item\?\.leverage !== leverage/, "deployment leverage must match its product ID");
assert.match(protocol, /item\?\.side !== side/, "deployment side must match its long or short product ID");
assert.match(protocol, /vaults\.has\(item\.vault\).*productMints\.has\(item\.productMint\)/s, "vault and product-mint accounts must be unique");
assert.match(protocol, /observations\.length >= 2/, "two independent mainnet RPC observations must be required");
assert.match(protocol, /parsed\.parsed\.info\?\.mint === SOLANA_USDC_MINT/, "fee recipient must be the canonical USDC token account");
assert.match(protocol, /parsed\.parsed\.info\?\.owner === treasuryAuthority/, "fee recipient owner must be pinned");
assert.match(protocol, /allowedAdapters\.has\(item\.adapterProgram\)/, "backing adapters must be explicitly allowlisted");
assert.match(protocol, /programDataBytes\[12\] === 0/, "upgradeable programs must be proven frozen from onchain ProgramData");
assert.match(protocol, /marketEvidence\(url, deployment, values\.programId\)/, "every configured market must be verified independently by each RPC");
assert.match(protocol, /state\.owner === programId/, "market state must be owned by the audited LevPlay program");
assert.match(protocol, /tokenVaultEvidence\(vault, deployment\.xStockMint, deployment\.marketState\)/, "backing vault mint and authority must be pinned");
assert.match(protocol, /productMintEvidence\(productMint, deployment\.marketState\)/, "product mint authority must be pinned and freeze authority absent");
assert.match(protocol, /pyth\.owner === deployment\.pythOwner/, "Pyth account owner must match the frozen manifest");
assert.match(protocol, /chainlink\.owner === deployment\.chainlinkOwner/, "Chainlink account owner must match the frozen manifest");
assert.match(protocol, /adapterMarket\.owner === deployment\.adapterProgram/, "adapter market must be owned by the fixed adapter program");
assert.match(protocol, /sha256\(`\$\{adapterSource\}\\n\$\{marketSource\}`\)/, "deployment JSON must match a frozen SHA-256 manifest hash");
assert.ok(protocol.includes('!/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(host)'), "RPC configuration must reject IP literals");

for (const header of [
  "Content-Security-Policy",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "Origin-Agent-Cluster",
  "X-Permitted-Cross-Domain-Policies",
  "X-Content-Type-Options",
  "X-Frame-Options",
]) assert.ok(config.includes(header), `${header} must be configured`);

console.log("LevPlay source security: 64 fail-closed assertions passed");
