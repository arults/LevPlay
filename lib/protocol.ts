import { SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./markets.ts";
import { BodyTooLargeError, readJsonResponseBounded } from "./http-safety.ts";
import { assessProductAdmission, parseProductManifest } from "./product-registry.ts";
import { parseReleaseManifestV2, type ReleaseManifestV2, type ReleaseMarket } from "./release-manifest.ts";
import { assessVenueAdmission, parseVenueManifest } from "./venue-registry.ts";

const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const PROGRAM_LOADERS = new Set([UPGRADEABLE_LOADER, "BPFLoader2111111111111111111111111111111111"]);
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RPC_RESPONSE_LIMIT_BYTES = 12_000_000;
const VALUE_MOVING_HANDLERS_IMPLEMENTED = false;
const EXTERNAL_EVIDENCE_SIGNATURES_VERIFIED = false;
type RpcAccount = { executable?: boolean; owner?: string; data?: unknown };
type RpcResult = { result?: unknown; error?: { message?: string } };

export function isSolanaAddress(value: unknown): value is string { return typeof value === "string" && ADDRESS.test(value); }
export function isSafeRpcUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/[^@\s]+$/.test(value)) return false;
  try { const parsed = new URL(value); const host = parsed.hostname.toLowerCase(); return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.port && host !== "localhost" && !host.endsWith(".local") && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes(":"); }
  catch { return false; }
}
function configuredRpcs() {
  try { const value = JSON.parse(process.env.LEVPLAY_SVM_RPC_URLS_JSON || "[]") as unknown; if (!Array.isArray(value)) return []; const valid = value.filter(isSafeRpcUrl); return [...new Map(valid.map((url) => [new URL(url).hostname, url])).values()].slice(0, 4); }
  catch { return []; }
}
async function sha256(value: string | Uint8Array) { const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value; const payload = new Uint8Array(bytes.byteLength); payload.set(bytes); const digest = await crypto.subtle.digest("SHA-256", payload.buffer); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(7_000) });
  let payload: RpcResult;
  try { payload = await readJsonResponseBounded(response, RPC_RESPONSE_LIMIT_BYTES) as RpcResult; }
  catch (error) { if (error instanceof BodyTooLargeError) throw new Error("Oversized RPC response"); throw error; }
  if (!response.ok || payload.error || payload.result === undefined) throw new Error(payload.error?.message || "RPC error"); return payload.result;
}
async function account(url: string, address: string, encoding: "base64" | "jsonParsed" = "base64") { const result = await rpc(url, "getAccountInfo", [address, { encoding, commitment: "finalized" }]) as { value?: RpcAccount | null }; if (!result.value) throw new Error("Missing account"); return result.value; }
function accountBytes(value: RpcAccount) { if (!Array.isArray(value.data) || typeof value.data[0] !== "string") return null; try { return Uint8Array.from(atob(value.data[0]), (character) => character.charCodeAt(0)); } catch { return null; } }
function base58(bytes: Uint8Array) { let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1; const digits = [0]; for (let index = zeros; index < bytes.length; index += 1) { let carry = bytes[index]; for (let cursor = 0; cursor < digits.length; cursor += 1) { const value = digits[cursor] * 256 + carry; digits[cursor] = value % 58; carry = Math.floor(value / 58); } while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); } } return "1".repeat(zeros) + digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join(""); }
function addressAt(bytes: Uint8Array, offset: number) { return base58(bytes.slice(offset, offset + 32)); }
function u16At(bytes: Uint8Array, offset: number) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true); }
function u64At(bytes: Uint8Array, offset: number) { const value = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, true); return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : -1; }
function header(bytes: Uint8Array, discriminator: string, length: number) { return bytes.length === length && new TextDecoder().decode(bytes.slice(0, 8)) === discriminator && bytes[8] === 1 && bytes[9] !== 0; }
function parsedInfo(value: RpcAccount) { return (value.data as { parsed?: { type?: string; info?: Record<string, unknown> } })?.parsed; }
function tokenAccount(value: RpcAccount, program: string, mintAddress: string, authority: string) { const parsed = parsedInfo(value); return value.owner === program && parsed?.type === "account" && parsed.info?.mint === mintAddress && parsed.info?.owner === authority && parsed.info?.state === "initialized" && parsed.info?.delegate == null && parsed.info?.closeAuthority == null && parsed.info?.isNative !== true && (parsed.info?.delegatedAmount == null || parsed.info.delegatedAmount === "0" || parsed.info.delegatedAmount === 0); }
function validateProductMint(value: RpcAccount, authority: string) { const parsed = parsedInfo(value); const extensions = parsed?.info?.extensions; return value.owner === TOKEN_2022_PROGRAM && parsed?.type === "mint" && parsed.info?.isInitialized === true && parsed.info?.mintAuthority === authority && parsed.info?.freezeAuthority == null && Array.isArray(extensions) && extensions.length === 0; }
async function exactAccountHash(value: RpcAccount, expected: string) { const bytes = accountBytes(value); return Boolean(bytes && await sha256(bytes) === expected.toLowerCase()); }

function configEvidence(value: RpcAccount, manifest: ReleaseManifestV2) {
  const bytes = accountBytes(value); return value.owner === manifest.programId && value.executable !== true && Boolean(bytes && header(bytes, "LVPCFG01", 208) && bytes.slice(11, 16).every((byte) => byte === 0) && addressAt(bytes, 16) === manifest.governance && addressAt(bytes, 48) === manifest.guardian && addressAt(bytes, 80) === manifest.treasuryAuthority && addressAt(bytes, 112) === manifest.feeRecipient && addressAt(bytes, 144) === SOLANA_USDC_MINT && addressAt(bytes, 176) === TOKEN_PROGRAM);
}
function marketStateEvidence(value: RpcAccount, item: ReleaseMarket, programId: string) {
  const bytes = accountBytes(value); return value.owner === programId && value.executable !== true && Boolean(bytes && header(bytes, "LVPMKT01", 392) && bytes[11] === (item.side === "long" ? 0 : 1) && bytes[12] === 0 && bytes.slice(13, 16).every((byte) => byte === 0) && bytes.slice(70, 72).every((byte) => byte === 0) && u64At(bytes, 24) === item.transactionCap && u64At(bytes, 32) === item.walletCap && u64At(bytes, 40) === item.tvlCap && u64At(bytes, 48) === item.dailyMintCap && u64At(bytes, 56) === item.dailyRedeemCap && u16At(bytes, 64) === item.standbyBps && u16At(bytes, 66) === 20_000 && u16At(bytes, 68) === 50 && addressAt(bytes, 72) === item.productMint && addressAt(bytes, 104) === TOKEN_2022_PROGRAM && addressAt(bytes, 136) === item.clearingVault && addressAt(bytes, 168) === item.reserveVault && addressAt(bytes, 200) === item.adapterProgram && addressAt(bytes, 232) === item.adapterMarket && addressAt(bytes, 264) === item.primaryOracleAccount && addressAt(bytes, 296) === item.secondaryOracleAccount && addressAt(bytes, 328) === item.primaryOracleOwner && addressAt(bytes, 360) === item.secondaryOracleOwner);
}
async function programEvidence(url: string, manifest: ReleaseManifestV2) {
  const program = await account(url, manifest.programId); const programBytes = accountBytes(program);
  if (program.owner !== UPGRADEABLE_LOADER || program.owner !== manifest.programLoader || program.executable !== true || !programBytes || programBytes.length < 36 || new DataView(programBytes.buffer, programBytes.byteOffset, 4).getUint32(0, true) !== 2 || base58(programBytes.slice(4, 36)) !== manifest.programDataAddress) return false;
  const programData = await account(url, manifest.programDataAddress); const bytes = accountBytes(programData);
  return programData.owner === UPGRADEABLE_LOADER && Boolean(bytes && bytes.length > 13 && new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) === 3 && bytes[12] === 0 && await sha256(bytes.slice(13)) === manifest.releaseArtifacts.sbfSha256.toLowerCase());
}
async function executableProgramFrozen(url: string, value: RpcAccount) {
  if (value.owner !== UPGRADEABLE_LOADER || value.executable !== true) return false;
  const programBytes = accountBytes(value);
  if (!programBytes || programBytes.length < 36 || new DataView(programBytes.buffer, programBytes.byteOffset, 4).getUint32(0, true) !== 2) return false;
  const programData = await account(url, base58(programBytes.slice(4, 36))); const bytes = accountBytes(programData);
  return programData.owner === UPGRADEABLE_LOADER && Boolean(bytes && bytes.length > 13 && new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) === 3 && bytes[12] === 0);
}
async function marketEvidence(url: string, item: ReleaseMarket, programId: string) {
  const [state, clearing, sourceVault, reserve, productMint, sourceMint, primary, secondary, adapterProgram, adapterMarket] = await Promise.all([account(url, item.marketState), account(url, item.clearingVault, "jsonParsed"), account(url, item.sourceVault, "jsonParsed"), account(url, item.reserveVault, "jsonParsed"), account(url, item.productMint, "jsonParsed"), account(url, item.sourceMint), account(url, item.primaryOracleAccount), account(url, item.secondaryOracleAccount), account(url, item.adapterProgram), account(url, item.adapterMarket)]);
  const sourceBytes = accountBytes(sourceMint);
  return marketStateEvidence(state, item, programId) && tokenAccount(clearing, TOKEN_PROGRAM, SOLANA_USDC_MINT, item.marketState) && tokenAccount(sourceVault, TOKEN_2022_PROGRAM, item.sourceMint, item.marketState) && tokenAccount(reserve, TOKEN_PROGRAM, SOLANA_USDC_MINT, item.marketState) && validateProductMint(productMint, item.marketState) && sourceMint.owner === TOKEN_2022_PROGRAM && Boolean(sourceBytes && sourceBytes.length >= 82 && sourceBytes[45] === 1 && await sha256(sourceBytes) === item.sourceMintAccountSha256.toLowerCase()) && primary.owner === item.primaryOracleOwner && primary.executable !== true && secondary.owner === item.secondaryOracleOwner && secondary.executable !== true && adapterProgram.executable === true && PROGRAM_LOADERS.has(String(adapterProgram.owner || "")) && adapterMarket.owner === item.adapterProgram && adapterMarket.executable !== true;
}
async function liveEvidence(url: string, manifest: ReleaseManifestV2) {
  const [genesis, program, config, treasury, governance, guardian, multisigProgram, markets] = await Promise.all([rpc(url, "getGenesisHash", []), programEvidence(url, manifest), account(url, manifest.configState), account(url, manifest.feeRecipient, "jsonParsed"), account(url, manifest.governance), account(url, manifest.guardian), account(url, manifest.multisigProgram), Promise.all(Object.entries(manifest.markets).map(async ([key, item]) => [key, await marketEvidence(url, item, manifest.programId)] as const))]);
  if (genesis !== MAINNET_GENESIS) throw new Error("Wrong Solana cluster");
  return { program, config: configEvidence(config, manifest), treasury: tokenAccount(treasury, TOKEN_PROGRAM, SOLANA_USDC_MINT, manifest.treasuryAuthority), multisigs: governance.owner === manifest.multisigProgram && guardian.owner === manifest.multisigProgram && await exactAccountHash(governance, manifest.evidence.governanceAccountSha256) && await exactAccountHash(guardian, manifest.evidence.guardianAccountSha256) && await executableProgramFrozen(url, multisigProgram), markets: Object.fromEntries(markets) as Record<string, boolean> };
}

async function releaseInputs(nowUnix: number) {
  const source = process.env.LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON || ""; const expectedHash = process.env.LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH || ""; const venueSource = process.env.LEVPLAY_SVM_VENUE_MANIFEST_JSON || ""; const productsSource = process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON || "";
  try {
    const manifest = parseReleaseManifestV2(source); const [manifestHash, venueHash, productsHash] = await Promise.all([sha256(source), sha256(venueSource), sha256(productsSource)]);
    if (manifestHash !== expectedHash.toLowerCase() || venueHash !== manifest.evidence.venueManifestSha256.toLowerCase() || productsHash !== manifest.evidence.productManifestsSha256.toLowerCase()) throw new Error("release or admission hash mismatch");
    const venueManifest = parseVenueManifest(venueSource); const venue = assessVenueAdmission(venueManifest, nowUnix); const rawProducts = JSON.parse(productsSource) as unknown;
    if (!Array.isArray(rawProducts) || rawProducts.length !== 2) throw new Error("pilot requires exactly two product manifests");
    const parsedProducts = rawProducts.map((item) => parseProductManifest(item as Record<string, unknown>)); const admissions = parsedProducts.map((item) => assessProductAdmission(item, nowUnix)); const ids = admissions.map((item) => item.productId).sort();
    if (!venue.admitted || admissions.some((item) => !item.admitted) || ids.join(",") !== "AAPL2L,AAPL2S") throw new Error("venue or exact pilot products are not admitted");
    if (venueManifest.deploymentManifestHash.replace(/^0x/, "").toLowerCase() !== manifest.releaseArtifacts.sourceSha256.toLowerCase() || parsedProducts.some((item) => item.deploymentHash.replace(/^0x/, "").toLowerCase() !== manifest.releaseArtifacts.sourceSha256.toLowerCase())) throw new Error("admission manifests target a different release");
    for (const product of parsedProducts) { const deployed = manifest.markets[product.productId as keyof typeof manifest.markets]; if (!deployed || product.sourceMint !== deployed.sourceMint || product.productMint !== deployed.productMint || product.marketPda !== deployed.marketState || product.collateralVault !== deployed.clearingVault || product.feeVault !== manifest.feeRecipient || product.primaryOracle !== deployed.primaryOracleAccount || product.secondaryOracle !== deployed.secondaryOracleAccount || product.primaryOracleProviderId !== deployed.primaryOracleProviderId || product.secondaryOracleProviderId !== deployed.secondaryOracleProviderId) throw new Error("product and deployment manifests disagree"); }
    return { manifest, manifestHash, venue, productIds: ids as string[], reasons: [] as string[] };
  } catch {
    // Configuration and parser details belong in private operator telemetry. The
    // public status endpoint exposes one stable, actionable fail-closed reason.
    return { manifest: null, manifestHash: null, venue: { admitted: false, venueId: null, reasons: [] as string[] }, productIds: [] as string[], reasons: ["Release manifest is missing or invalid"] };
  }
}

export async function protocolStatus(nowUnix = Math.floor(Date.now() / 1_000)) {
  const release = await releaseInputs(nowUnix); const manifest = release.manifest; const rpcs = configuredRpcs();
  const observations = manifest && rpcs.length >= 2 ? (await Promise.allSettled(rpcs.map((url) => liveEvidence(url, manifest)))).flatMap((result) => result.status === "fulfilled" ? [result.value] : []) : [];
  const live = observations.length >= 2 && observations.every((item) => item.program && item.config && item.treasury && item.multisigs && Object.keys(item.markets).length === 2 && Object.values(item.markets).every(Boolean));
  const checks = [
    { id: "manifest", label: "Canonical release manifest v2", passed: Boolean(manifest), failure: release.reasons[0] || "Release manifest is missing" },
    { id: "venue", label: "Venue evidence bound to release", passed: Boolean(manifest && release.venue.admitted), failure: "Venue evidence is not admitted and release-bound" },
    { id: "products", label: "Exact AAPL2L/AAPL2S manifests", passed: Boolean(manifest && release.productIds.join(",") === "AAPL2L,AAPL2S"), failure: "Exact pilot product manifests are not admitted and release-bound" },
    { id: "onchain", label: "Program, decoded state and account-identity RPC quorum", passed: live, failure: "Two RPCs have not verified exact program bytes, decoded state, vault semantics and pinned account identities; oracle value checks remain a handler gate" },
    { id: "evidence", label: "Signed external evidence verified", passed: EXTERNAL_EVIDENCE_SIGNATURES_VERIFIED, failure: "Audit, economic, legal and GO-vote hashes are presence commitments only; signed content verification is not implemented" },
    { id: "implementation", label: "Audited value-moving handlers", passed: VALUE_MOVING_HANDLERS_IMPLEMENTED, failure: "Value-moving handlers remain deliberately execution-locked" },
    { id: "switch", label: "Multisig go-live vote", passed: process.env.LEVPLAY_SVM_EXECUTION_ENABLED === "true" && Boolean(manifest?.evidence.goLiveVoteSha256), failure: "Mainnet execution switch or release-bound GO vote is missing" },
  ];
  const blockers = checks.filter((check) => !check.passed).map((check) => check.failure);
  return { executionEnabled: blockers.length === 0, venueId: release.venue.venueId, venueBlockers: release.venue.reasons, admittedProducts: release.productIds, productBlockers: release.reasons, feeBps: 50, maxPilotUsd: 100, programId: manifest?.programId || null, feeRecipient: manifest?.feeRecipient || null, treasuryAuthority: manifest?.treasuryAuthority || null, rpcQuorum: observations.length, configuredMarkets: manifest ? Object.keys(manifest.markets) : [], releaseManifestHash: release.manifestHash, checks: checks.map(({ id, label, passed }) => ({ id, label, passed })), blockers };
}
