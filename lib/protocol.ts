import { CURATED_MARKETS, SOLANA_USDC_MINT, TOKEN_PROGRAM } from "@/lib/markets";

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

type Deployment = {
  vault: string;
  productMint: string;
  xStockMint: string;
  pythFeedId: string;
  chainlinkFeedId: string;
  adapterProgram: string;
  adapterMarket: string;
  leverage: 2 | 3 | 5;
};

type RpcAccount = { executable?: boolean; owner?: string; data?: unknown };
type RpcResult = { result?: unknown; error?: { message?: string } };

function hash(value: string) {
  return HASH.test(value.replace(/^0x/, ""));
}

function configuredRpcs() {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_RPC_URLS_JSON || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    const valid = value.filter((url): url is string => typeof url === "string" && /^https:\/\/[^@\s]+$/.test(url));
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

async function liveEvidence(url: string, values: { programId: string; feeRecipient: string; treasuryAuthority: string; governance: string; guardian: string; multisigProgram: string }) {
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
  return {
    program: programLive,
    frozen: programLive && await programIsFrozen(url, program),
    treasury: tokenAccountEvidence(treasury, values.treasuryAuthority),
    multisigs: governance.owner === values.multisigProgram && guardian.owner === values.multisigProgram &&
      multisigProgram.executable === true && PROGRAM_LOADERS.has(String(multisigProgram.owner || "")),
  };
}

function deployments(allowedAdapters: Set<string>): Record<string, Deployment> {
  try {
    const value = JSON.parse(process.env.LEVPLAY_SVM_MARKETS_JSON || "{}") as Record<string, Deployment>;
    const accepted: Record<string, Deployment> = {};
    const vaults = new Set<string>();
    const productMints = new Set<string>();
    for (const [key, item] of Object.entries(value)) {
      const match = key.match(/^(AAPL|MSFT|NVDA|GOOGL|AMZN|META|TSLA|MSTR|COIN|HOOD|GLD|SLV|PPLT|GDX|COPX)(2|3|5)L$/);
      const expected = match ? CURATED_MARKETS.find((market) => market.ticker === match[1]) : undefined;
      const leverage = Number(match?.[2]);
      if (!expected || item?.xStockMint !== expected.mint || item?.leverage !== leverage ||
        !isSolanaAddress(item?.vault) || !isSolanaAddress(item?.productMint) ||
        !isSolanaAddress(item?.adapterProgram) || !allowedAdapters.has(item.adapterProgram) || !isSolanaAddress(item?.adapterMarket) ||
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
  const adapters = adapterAllowlist();
  const markets = deployments(adapters);
  const rpcs = configuredRpcs();
  const addressesReady = [programId, feeRecipient, treasuryAuthority, governance, guardian, multisigProgram].every(isSolanaAddress) && governance !== guardian;
  const observations = addressesReady && rpcs.length >= 2
    ? (await Promise.allSettled(rpcs.map((url) => liveEvidence(url, { programId, feeRecipient, treasuryAuthority, governance, guardian, multisigProgram })))).flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
    : [];
  const live = observations.length >= 2 && observations.every((value) => value.program && value.treasury && value.multisigs);

  const checks = [
    { id: "program", label: "Program verified by RPC quorum", passed: live, failure: "Two independent mainnet RPCs have not verified the program and authorities" },
    { id: "treasury", label: "Pinned USDC fee treasury", passed: live && observations.every((value) => value.treasury), failure: "The fee account is not a quorum-verified USDC account owned by the treasury multisig" },
    { id: "multisigs", label: "Independent multisigs", passed: live && observations.every((value) => value.multisigs), failure: "Governance and guardian are not independent quorum-verified multisig accounts" },
    { id: "audit", label: "Independent audit", passed: hash(auditHash), failure: "Independent audit hash is missing" },
    { id: "release", label: "Frozen release hash", passed: hash(releaseHash), failure: "Frozen release hash is missing" },
    { id: "frozen", label: "Program authority frozen", passed: process.env.LEVPLAY_SVM_PROGRAM_FROZEN === "true" && live && observations.every((value) => value.frozen), failure: "Audited program release is not verifiably immutable onchain" },
    { id: "backing", label: "Backing venue attestation", passed: hash(backingHash) && adapters.size > 0, failure: "Audited backing venue and adapter evidence is missing" },
    { id: "markets", label: "Audited vault deployment", passed: Object.keys(markets).length > 0, failure: "No audited vault deployment is configured" },
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
