import { CURATED_MARKETS, SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/markets";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^[a-fA-F0-9]{64}$/;
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const PROGRAM_LOADERS = new Set([
  "BPFLoaderUpgradeab1e11111111111111111111111",
  "BPFLoader2111111111111111111111111111111111",
]);
const UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isSolanaAddress(value: unknown): value is string {
  return typeof value === "string" && BASE58.test(value);
}

export function isSafeRpcUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/[^@\s]+$/.test(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.port &&
      host !== "localhost" && !host.endsWith(".local") && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes(":");
  } catch { return false; }
}

type Deployment = {
  marketState: string;
  vault: string;
  productMint: string;
  xStockMint: string;
  pythAccount: string;
  pythOwner: string;
  pythFeedId: string;
  chainlinkAccount: string;
  chainlinkOwner: string;
  chainlinkFeedId: string;
  adapterProgram: string;
  adapterMarket: string;
  leverage: 2 | 3 | 5;
  side: "long" | "short";
};

type RpcAccount = { executable?: boolean; owner?: string; data?: unknown; lamports?: number };
type RpcResult = { result?: unknown; error?: { message?: string } };

function hash(value: string) {
  return HASH.test(value.replace(/^0x/, ""));
}

function configuredRpcs() {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_RPC_URLS_JSON || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    const valid = value.filter(isSafeRpcUrl);
    return [...new Map(valid.map((url) => [new URL(url).hostname, url])).values()].slice(0, 4);
  } catch {
    return [];
  }
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(7_000),
  });
  if (Number(response.headers.get("content-length") || 0) > 2_000_000) throw new Error("Oversized RPC response");
  const payload = await response.json() as RpcResult;
  if (!response.ok || payload.error || payload.result === undefined) throw new Error(payload.error?.message || "RPC error");
  return payload.result;
}

async function account(url: string, address: string, encoding: "base64" | "jsonParsed" = "base64") {
  const result = await rpc(url, "getAccountInfo", [address, { encoding, commitment: "finalized" }]) as { value?: RpcAccount | null };
  if (!result.value) throw new Error("Missing account");
  return result.value;
}

function accountBytes(value: RpcAccount) {
  if (!Array.isArray(value.data) || typeof value.data[0] !== "string") return null;
  try { return Uint8Array.from(atob(value.data[0]), (character) => character.charCodeAt(0)); }
  catch { return null; }
}

function base58(bytes: Uint8Array) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  const digits = [0];
  for (let index = zeros; index < bytes.length; index += 1) {
    let carry = bytes[index];
    for (let cursor = 0; cursor < digits.length; cursor += 1) {
      const value = digits[cursor] * 256 + carry;
      digits[cursor] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  return "1".repeat(zeros) + digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join("");
}

async function programIsFrozen(url: string, value: RpcAccount) {
  if (value.owner !== UPGRADEABLE_LOADER) return value.executable === true && PROGRAM_LOADERS.has(String(value.owner || ""));
  const bytes = accountBytes(value);
  if (!bytes || bytes.length < 36 || new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) !== 2) return false;
  const programDataAddress = base58(bytes.slice(4, 36));
  const programData = await account(url, programDataAddress);
  const programDataBytes = accountBytes(programData);
  return programData.owner === UPGRADEABLE_LOADER && Boolean(programDataBytes && programDataBytes.length >= 13 &&
    new DataView(programDataBytes.buffer, programDataBytes.byteOffset, 4).getUint32(0, true) === 3 && programDataBytes[12] === 0);
}

function tokenAccountEvidence(value: RpcAccount, treasuryAuthority: string) {
  const parsed = value.data as { parsed?: { type?: string; info?: { mint?: string; owner?: string; state?: string } } };
  return value.owner === TOKEN_PROGRAM && parsed?.parsed?.type === "account" &&
    parsed.parsed.info?.mint === SOLANA_USDC_MINT && parsed.parsed.info?.owner === treasuryAuthority &&
    parsed.parsed.info?.state === "initialized";
}

function parsedInfo(value: RpcAccount) {
  return (value.data as { parsed?: { type?: string; info?: Record<string, unknown> } })?.parsed;
}

function tokenVaultEvidence(value: RpcAccount, mint: string, authority: string) {
  const parsed = parsedInfo(value);
  return value.owner === TOKEN_2022_PROGRAM && parsed?.type === "account" &&
    parsed.info?.mint === mint && parsed.info?.owner === authority && parsed.info?.state === "initialized";
}

function productMintEvidence(value: RpcAccount, authority: string) {
  const parsed = parsedInfo(value);
  return value.owner === TOKEN_2022_PROGRAM && parsed?.type === "mint" && parsed.info?.isInitialized === true &&
    parsed.info?.mintAuthority === authority && parsed.info?.freezeAuthority == null;
}

async function marketEvidence(url: string, deployment: Deployment, programId: string) {
  const [state, vault, productMint, xStockMint, pyth, chainlink, adapterProgram, adapterMarket] = await Promise.all([
    account(url, deployment.marketState),
    account(url, deployment.vault, "jsonParsed"),
    account(url, deployment.productMint, "jsonParsed"),
    account(url, deployment.xStockMint, "jsonParsed"),
    account(url, deployment.pythAccount),
    account(url, deployment.chainlinkAccount),
    account(url, deployment.adapterProgram),
    account(url, deployment.adapterMarket),
  ]);
  const xStockParsed = parsedInfo(xStockMint);
  return state.owner === programId && state.executable !== true &&
    tokenVaultEvidence(vault, deployment.xStockMint, deployment.marketState) &&
    productMintEvidence(productMint, deployment.marketState) &&
    xStockMint.owner === TOKEN_2022_PROGRAM && xStockParsed?.type === "mint" && xStockParsed.info?.isInitialized === true &&
    pyth.owner === deployment.pythOwner && pyth.executable !== true &&
    chainlink.owner === deployment.chainlinkOwner && chainlink.executable !== true &&
    adapterProgram.executable === true && PROGRAM_LOADERS.has(String(adapterProgram.owner || "")) &&
    adapterMarket.owner === deployment.adapterProgram && adapterMarket.executable !== true;
}

async function liveEvidence(url: string, values: { programId: string; feeRecipient: string; treasuryAuthority: string; governance: string; guardian: string; multisigProgram: string }, configuredMarkets: Record<string, Deployment>) {
  const [genesis, program, treasury, governance, guardian, multisigProgram] = await Promise.all([
    rpc(url, "getGenesisHash", []),
    account(url, values.programId),
    account(url, values.feeRecipient, "jsonParsed"),
    account(url, values.governance),
    account(url, values.guardian),
    account(url, values.multisigProgram),
  ]);
  if (genesis !== MAINNET_GENESIS) throw new Error("Wrong Solana cluster");
  const programLive = program.executable === true && PROGRAM_LOADERS.has(String(program.owner || ""));
  const marketChecks = await Promise.all(Object.entries(configuredMarkets).map(async ([key, deployment]) => [key, await marketEvidence(url, deployment, values.programId)] as const));
  return {
    program: programLive,
    frozen: programLive && await programIsFrozen(url, program),
    treasury: tokenAccountEvidence(treasury, values.treasuryAuthority),
    multisigs: governance.owner === values.multisigProgram && guardian.owner === values.multisigProgram &&
      multisigProgram.executable === true && PROGRAM_LOADERS.has(String(multisigProgram.owner || "")),
    markets: Object.fromEntries(marketChecks) as Record<string, boolean>,
  };
}

function deployments(allowedAdapters: Set<string>): Record<string, Deployment> {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_MARKETS_JSON || "{}") as Record<string, Deployment>;
    const accepted: Record<string, Deployment> = {};
    const vaults = new Set<string>();
    const productMints = new Set<string>();
    for (const [key, item] of Object.entries(value)) {
      const match = key.match(/^(AAPL|MSFT|NVDA|GOOGL|AMZN|META|TSLA|MSTR|COIN|HOOD|GLD|SLV|PPLT|GDX|COPX)(2|3|5)(L|S)$/);
      const expected = match ? CURATED_MARKETS.find((market) => market.ticker === match[1]) : undefined;
      const leverage = Number(match?.[2]);
      const side = match?.[3] === "S" ? "short" : "long";
      if (!expected || item?.xStockMint !== expected.mint || item?.leverage !== leverage || item?.side !== side ||
        !isSolanaAddress(item?.marketState) || !isSolanaAddress(item?.vault) || !isSolanaAddress(item?.productMint) ||
        !isSolanaAddress(item?.adapterProgram) || !allowedAdapters.has(item.adapterProgram) || !isSolanaAddress(item?.adapterMarket) ||
        !isSolanaAddress(item?.pythAccount) || !isSolanaAddress(item?.pythOwner) ||
        !isSolanaAddress(item?.chainlinkAccount) || !isSolanaAddress(item?.chainlinkOwner) ||
        item.vault === item.productMint || vaults.has(item.vault) || productMints.has(item.productMint) ||
        typeof item?.pythFeedId !== "string" || !/^[a-fA-F0-9]{64}$/.test(item.pythFeedId) ||
        typeof item?.chainlinkFeedId !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(item.chainlinkFeedId)) continue;
      vaults.add(item.vault);
      productMints.add(item.productMint);
      accepted[key] = item;
    }
    return accepted;
  } catch {
    return {};
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adapterAllowlist() {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_ADAPTER_PROGRAMS_JSON || "[]") as unknown;
    return new Set(Array.isArray(value) ? value.filter(isSolanaAddress) : []);
  } catch {
    return new Set<string>();
  }
}

export async function protocolStatus() {
  const programId = process.env.LEVPLAY_SVM_PROGRAM_ID || "";
  const feeRecipient = process.env.LEVPLAY_SVM_FEE_RECIPIENT || "";
  const treasuryAuthority = process.env.LEVPLAY_SVM_FEE_TREASURY_AUTHORITY || "";
  const governance = process.env.LEVPLAY_SVM_GOVERNANCE_MULTISIG || "";
  const guardian = process.env.LEVPLAY_SVM_GUARDIAN_MULTISIG || "";
  const multisigProgram = process.env.LEVPLAY_SVM_MULTISIG_PROGRAM_ID || "";
  const auditHash = process.env.LEVPLAY_SVM_AUDIT_HASH || "";
  const releaseHash = process.env.LEVPLAY_SVM_RELEASE_HASH || "";
  const backingHash = process.env.LEVPLAY_SVM_BACKING_ATTESTATION_HASH || "";
  const manifestHash = process.env.LEVPLAY_SVM_MANIFEST_HASH || "";
  const adapterSource = process.env.LEVPLAY_SVM_ADAPTER_PROGRAMS_JSON || "[]";
  const marketSource = process.env.LEVPLAY_SVM_MARKETS_JSON || "{}";
  const adapters = adapterAllowlist();
  const markets = deployments(adapters);
  const manifestMatches = hash(manifestHash) && await sha256(`${adapterSource}\n${marketSource}`) === manifestHash.toLowerCase();
  const rpcs = configuredRpcs();
  const addressesReady = [programId, feeRecipient, treasuryAuthority, governance, guardian, multisigProgram].every(isSolanaAddress) && governance !== guardian;
  const observations = addressesReady && rpcs.length >= 2
    ? (await Promise.allSettled(rpcs.map((url) => liveEvidence(url, { programId, feeRecipient, treasuryAuthority, governance, guardian, multisigProgram }, markets)))).flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
    : [];
  const live = observations.length >= 2 && observations.every((value) => value.program && value.treasury && value.multisigs);
  const marketsLive = live && Object.keys(markets).length > 0 && observations.every((value) => Object.keys(markets).every((key) => value.markets[key] === true));

  const checks = [
    { id: "program", label: "Program verified by RPC quorum", passed: live, failure: "Two independent mainnet RPCs have not verified the program and authorities" },
    { id: "treasury", label: "Pinned USDC fee treasury", passed: live && observations.every((value) => value.treasury), failure: "The fee account is not a quorum-verified USDC account owned by the treasury multisig" },
    { id: "multisigs", label: "Independent multisigs", passed: live && observations.every((value) => value.multisigs), failure: "Governance and guardian are not independent quorum-verified multisig accounts" },
    { id: "audit", label: "Independent audit", passed: hash(auditHash), failure: "Independent audit hash is missing" },
    { id: "release", label: "Frozen release hash", passed: hash(releaseHash), failure: "Frozen release hash is missing" },
    { id: "frozen", label: "Program authority frozen", passed: process.env.LEVPLAY_SVM_PROGRAM_FROZEN === "true" && live && observations.every((value) => value.frozen), failure: "Audited program release is not verifiably immutable onchain" },
    { id: "backing", label: "Backing venue attestation", passed: hash(backingHash) && adapters.size > 0, failure: "Audited backing venue and adapter evidence is missing" },
    { id: "manifest", label: "Frozen deployment manifest", passed: manifestMatches, failure: "Deployment manifest does not match its frozen SHA-256 hash" },
    { id: "markets", label: "Audited vault deployment", passed: manifestMatches && marketsLive, failure: "No market deployment passed quorum verification of its state, vault, mints, oracles and fixed adapter" },
    { id: "switch", label: "Multisig go-live vote", passed: process.env.LEVPLAY_SVM_EXECUTION_ENABLED === "true", failure: "Mainnet execution switch is off" },
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => check.failure);

  return {
    executionEnabled: blockers.length === 0,
    feeBps: 50,
    maxPilotUsd: 100,
    programId: isSolanaAddress(programId) ? programId : null,
    feeRecipient: isSolanaAddress(feeRecipient) ? feeRecipient : null,
    treasuryAuthority: isSolanaAddress(treasuryAuthority) ? treasuryAuthority : null,
    rpcQuorum: observations.length,
    configuredMarkets: Object.keys(markets),
    checks: checks.map((check) => ({ id: check.id, label: check.label, passed: check.passed })),
    blockers,
  };
}
