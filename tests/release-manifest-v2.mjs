import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PREIPO_VAULT, MINIMUM_BLOCKED_COUNTRIES } from "../lib/venue-registry.ts";
import { PRESTOCKS } from "../lib/product-registry.ts";
import { parseReleaseManifestV2 } from "../lib/release-manifest.ts";
import { protocolStatus } from "../lib/protocol.ts";
import { SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "../lib/markets.ts";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const hash = (value) => createHash("sha256").update(value).digest("hex");
function encode(bytes) { let zeros = 0; while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1; const digits = [0]; for (let i = zeros; i < bytes.length; i += 1) { let carry = bytes[i]; for (let j = 0; j < digits.length; j += 1) { const x = digits[j] * 256 + carry; digits[j] = x % 58; carry = Math.floor(x / 58); } while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); } } return "1".repeat(zeros) + digits.reverse().map((x) => alphabet[x]).join(""); }
function decode(value) { const bytes = [0]; for (const character of value) { let carry = alphabet.indexOf(character); for (let i = 0; i < bytes.length; i += 1) { const x = bytes[i] * 58 + carry; bytes[i] = x & 255; carry = x >> 8; } while (carry) { bytes.push(carry & 255); carry >>= 8; } } for (let i = 0; value[i] === "1" && i < value.length - 1; i += 1) bytes.push(0); return Uint8Array.from(bytes.reverse()); }
const address = (byte) => encode(new Uint8Array(32).fill(byte));
const h = "a".repeat(64);
const programId = address(1), configState = address(2), programDataAddress = address(3), feeRecipient = address(4), treasury = address(5), governance = address(6), guardian = address(7), multisigProgram = address(8), multisigProgramDataAddress = address(9);
const programLoader = "BPFLoaderUpgradeab1e11111111111111111111111";
const sbf = Uint8Array.from([9, 8, 7, 6]);
const sourceMintBytes = new Uint8Array(82); sourceMintBytes[45] = 1;
const governanceBytes = Uint8Array.from([2, 3, 5, 7]);
const guardianBytes = Uint8Array.from([11, 13, 17, 19]);

const market = (side, seed) => ({
  marketState: address(seed), clearingVault: address(seed + 1), sourceVault: address(seed + 2), reserveVault: address(seed + 3), productMint: address(seed + 4),
  sourceProvider: "prestocks", sourceAssetSymbol: "ANTHROPIC", sourceMint: PRESTOCKS[0].publishedMint, sourceMintAccountSha256: hash(sourceMintBytes), sourceRegistryHash: h,
  primaryOracleAccount: address(seed + 5), primaryOracleOwner: address(seed + 6), primaryOracleFeedId: h, primaryOracleProviderId: "pyth",
  secondaryOracleAccount: address(seed + 7), secondaryOracleOwner: address(seed + 8), secondaryOracleFeedId: "b".repeat(64), secondaryOracleProviderId: "independent",
  adapterProgram: address(seed + 9), adapterMarket: address(seed + 10), adapterBinaryHash: h, leverage: 2, side, standbyBps: 100,
  transactionCap: 100000000, walletCap: 100000000, tvlCap: 1000000000, dailyMintCap: 1000000000, dailyRedeemCap: 1000000000,
});
const long = market("long", 20), short = market("short", 40);

const product = (productId, item) => ({
  productId, provider: "prestocks", sourceSymbol: "ANTHROPIC", sourceMint: item.sourceMint, productMint: item.productMint, marketPda: item.marketState,
  collateralVault: item.clearingVault, feeVault: feeRecipient, primaryOracle: item.primaryOracleAccount, secondaryOracle: item.secondaryOracleAccount,
  primaryOracleProviderId: item.primaryOracleProviderId, secondaryOracleProviderId: item.secondaryOracleProviderId,
  sourceRegistryHash: h, providerApprovalHash: h, legalApprovalHash: h, productAuditHash: h, economicAuditHash: h, auditorRetestHash: h, deploymentHash: h, eligibilityPolicyHash: h,
  aggregateCapitalCap: "1000000000", perWalletCapitalCap: "100000000", makerLongCapital: "1000000000", shortGainCollateral: "2000000000", standbyFloorReserve: "10000000", maximumRedemptionLiability: "2000000000", independentExitLiquidity: "2000000000", minimumNavBps: 100,
  maxOracleAgeSeconds: 30, maxOracleDeviationBps: 75, maxOracleConfidenceBps: 75, permissionlessClose: true, isolatedCollateral: true, usesBorrowOrMargin: false, mintsDisabledOnHalt: true, permissionlessRebalance: true, sourceOutageMode: "close-only-pro-rata",
  rpcDomains: ["a.example", "b.example", "c.example"], rpcProviderIds: ["a", "b", "c"], keeperAuthorities: [address(70), address(71), address(72)], keeperOperatorIds: ["a", "b", "c"],
  governanceMultisig: governance, guardianMultisig: guardian, governanceSigners: [address(73), address(74), address(75)], guardianSigners: [address(76), address(77), address(78)], governanceThreshold: 2, guardianThreshold: 2,
  primaryExitOperator: address(79), emergencyExitOperator: address(80), primaryExitOperatorId: "primary", emergencyExitOperatorId: "emergency", upgradeDelaySeconds: 172800, expiresAtUnix: 2000000000,
});
const productsSource = JSON.stringify([product("ANTH2L", long), product("ANTH2S", short)]);
const venueSource = JSON.stringify({
  venueId: PREIPO_VAULT.id, chainId: PREIPO_VAULT.chainId, providerIds: [...PREIPO_VAULT.providers], providerApiOrigins: [...PREIPO_VAULT.providerApiOrigins],
  sourceMints: [...PREIPO_VAULT.sourceMints], collateralMint: PREIPO_VAULT.collateralMint, tokenProgramIds: [...PREIPO_VAULT.tokenProgramIds],
  allowedCountries: ["IN"], blockedCountries: [...MINIMUM_BLOCKED_COUNTRIES],
  eligibilityAttestor: address(81), eligibilityPolicyHash: h, legalApprovalHash: h, prestocksApprovalHash: h, tesseraApprovalHash: h, independentAuditHash: h, auditorRetestHash: h,
  deploymentManifestHash: h, reserveAttestationHash: h, makerCommitmentHash: h, primaryFailureDomain: "primary", emergencyFailureDomain: "emergency",
  longRiskCapital: "1000000000", shortGainCollateral: "2000000000", standbyReserve: "10000000", aggregateCapitalCap: "1000000000", expiresAtUnix: 2000000000, closesRemainPermissionless: true,
});
const release = {
  schemaVersion: 2, releaseCommit: "f".repeat(40), releaseArtifacts: { sourceSha256: h, sbfSha256: hash(sbf), idlSha256: h, sbomSha256: h, toolchainImageDigest: `sha256:${h}` },
  evidence: { independentAuditSha256: h, economicAuditSha256: h, auditorRetestSha256: h, backingAttestationSha256: h, reserveAttestationSha256: h, venueManifestSha256: hash(venueSource), productManifestsSha256: hash(productsSource), governanceAccountSha256: hash(governanceBytes), guardianAccountSha256: hash(guardianBytes), legalApprovalSha256: h, goLiveVoteSha256: h },
  programId, configState, programDataAddress, programLoader, upgradePolicy: "frozen", upgradeAuthority: null, upgradeTimelockSeconds: 0,
  feeRecipient, treasuryAuthority: treasury, governance, guardian, multisigProgram, markets: { ANTH2L: long, ANTH2S: short },
};
const releaseSource = JSON.stringify(release);
assert.equal(parseReleaseManifestV2(releaseSource).markets.ANTH2S.side, "short");
assert.throws(() => parseReleaseManifestV2(JSON.stringify({ ...release, surprise: true })), /missing or extra/);
assert.throws(() => parseReleaseManifestV2(JSON.stringify({ ...release, markets: { ANTH2L: long } })), /missing or extra/);
assert.throws(() => parseReleaseManifestV2(JSON.stringify({ ...release, markets: { ANTH2L: long, ANTH2S: { ...short, sourceVault: short.clearingVault } } })), /aliased/);

function writeAddress(bytes, offset, value) { bytes.set(decode(value), offset); }
function stateBytes(item) { const bytes = new Uint8Array(392); bytes.set(new TextEncoder().encode("LVPMKT01")); bytes[8] = 1; bytes[9] = 1; bytes[11] = item.side === "long" ? 0 : 1; const view = new DataView(bytes.buffer); view.setBigUint64(24, BigInt(item.transactionCap), true); view.setBigUint64(32, BigInt(item.walletCap), true); view.setBigUint64(40, BigInt(item.tvlCap), true); view.setBigUint64(48, BigInt(item.dailyMintCap), true); view.setBigUint64(56, BigInt(item.dailyRedeemCap), true); view.setUint16(64, item.standbyBps, true); view.setUint16(66, 20000, true); view.setUint16(68, 50, true); writeAddress(bytes, 72, item.productMint); writeAddress(bytes, 104, TOKEN_2022_PROGRAM); writeAddress(bytes, 136, item.clearingVault); writeAddress(bytes, 168, item.reserveVault); writeAddress(bytes, 200, item.adapterProgram); writeAddress(bytes, 232, item.adapterMarket); writeAddress(bytes, 264, item.primaryOracleAccount); writeAddress(bytes, 296, item.secondaryOracleAccount); writeAddress(bytes, 328, item.primaryOracleOwner); writeAddress(bytes, 360, item.secondaryOracleOwner); return bytes; }
function configBytes() { const bytes = new Uint8Array(208); bytes.set(new TextEncoder().encode("LVPCFG01")); bytes[8] = 1; bytes[9] = 1; writeAddress(bytes, 16, governance); writeAddress(bytes, 48, guardian); writeAddress(bytes, 80, treasury); writeAddress(bytes, 112, feeRecipient); writeAddress(bytes, 144, SOLANA_USDC_MINT); writeAddress(bytes, 176, TOKEN_PROGRAM); return bytes; }
const base64 = (bytes) => [Buffer.from(bytes).toString("base64"), "base64"];
const parsedAccount = (owner, type, info) => ({ owner, executable: false, data: { parsed: { type, info } } });
const initializedToken = (mint, owner) => parsedAccount(TOKEN_PROGRAM, "account", { mint, owner, state: "initialized", delegate: null, closeAuthority: null, isNative: false, delegatedAmount: "0" });
const accounts = new Map();
const put = (key, value) => accounts.set(key, value);
const programBytes = new Uint8Array(36); new DataView(programBytes.buffer).setUint32(0, 2, true); programBytes.set(decode(programDataAddress), 4);
const programDataBytes = new Uint8Array(13 + sbf.length); new DataView(programDataBytes.buffer).setUint32(0, 3, true); programDataBytes[12] = 0; programDataBytes.set(sbf, 13);
const multisigProgramBytes = new Uint8Array(36); new DataView(multisigProgramBytes.buffer).setUint32(0, 2, true); multisigProgramBytes.set(decode(multisigProgramDataAddress), 4);
const multisigProgramDataBytes = new Uint8Array(14); new DataView(multisigProgramDataBytes.buffer).setUint32(0, 3, true); multisigProgramDataBytes[12] = 0; multisigProgramDataBytes[13] = 1;
put(programId, { owner: programLoader, executable: true, data: base64(programBytes) }); put(programDataAddress, { owner: programLoader, executable: false, data: base64(programDataBytes) }); put(configState, { owner: programId, executable: false, data: base64(configBytes()) });
put(feeRecipient, initializedToken(SOLANA_USDC_MINT, treasury));
put(governance, { owner: multisigProgram, executable: false, data: base64(governanceBytes) });
put(guardian, { owner: multisigProgram, executable: false, data: base64(guardianBytes) });
put(multisigProgram, { owner: programLoader, executable: true, data: base64(multisigProgramBytes) });
put(multisigProgramDataAddress, { owner: programLoader, executable: false, data: base64(multisigProgramDataBytes) });
for (const item of [long, short]) {
  put(item.marketState, { owner: programId, executable: false, data: base64(stateBytes(item)) });
  put(item.clearingVault, initializedToken(SOLANA_USDC_MINT, item.marketState));
  put(item.sourceVault, { ...initializedToken(item.sourceMint, item.marketState), owner: TOKEN_2022_PROGRAM });
  put(item.reserveVault, initializedToken(SOLANA_USDC_MINT, item.marketState));
  put(item.productMint, parsedAccount(TOKEN_2022_PROGRAM, "mint", { isInitialized: true, mintAuthority: item.marketState, freezeAuthority: null, extensions: [] }));
  put(item.sourceMint, { owner: TOKEN_2022_PROGRAM, executable: false, data: base64(sourceMintBytes) });
  put(item.primaryOracleAccount, { owner: item.primaryOracleOwner, executable: false }); put(item.secondaryOracleAccount, { owner: item.secondaryOracleOwner, executable: false }); put(item.adapterProgram, { owner: programLoader, executable: true }); put(item.adapterMarket, { owner: item.adapterProgram, executable: false });
}

const previousFetch = globalThis.fetch;
globalThis.fetch = async (_url, init) => { const body = JSON.parse(init.body); const result = body.method === "getGenesisHash" ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" : { value: accounts.get(body.params[0]) || null }; return Response.json({ jsonrpc: "2.0", id: 1, result }); };
Object.assign(process.env, { LEVPLAY_SVM_RPC_URLS_JSON: JSON.stringify(["https://rpc-a.example", "https://rpc-b.example"]), LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON: releaseSource, LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH: hash(releaseSource), LEVPLAY_SVM_VENUE_MANIFEST_JSON: venueSource, LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON: productsSource, LEVPLAY_SVM_EXECUTION_ENABLED: "true" });
try {
  const status = await protocolStatus(1900000000);
  assert.equal(status.rpcQuorum, 2, "two mocked RPC domains must reproduce the exact deployment");
  assert.equal(status.checks.find((item) => item.id === "onchain").passed, true);
  assert.equal(status.executionEnabled, false, "missing value-moving handlers must keep execution locked even with perfect evidence");
  const extra = JSON.stringify([...JSON.parse(productsSource), product("ANTH2L", long)]); process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON = extra;
  const rejected = await protocolStatus(1900000000); assert.equal(rejected.checks.find((item) => item.id === "manifest").passed, false, "extra product manifests must fail closed");
} finally { globalThis.fetch = previousFetch; for (const key of ["LEVPLAY_SVM_RPC_URLS_JSON", "LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON", "LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH", "LEVPLAY_SVM_VENUE_MANIFEST_JSON", "LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON", "LEVPLAY_SVM_EXECUTION_ENABLED"]) delete process.env[key]; }

console.log("LevPlay release manifest v2: schema, cross-binding, decoded RPC state and hard execution lock passed");
