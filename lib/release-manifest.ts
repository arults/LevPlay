import { PRESTOCKS } from "./product-registry.ts";

export const RELEASE_MANIFEST_VERSION = 2 as const;
const OPENAI_SOURCE_MINT = PRESTOCKS.find((asset) => asset.symbol === "OPENAI")?.publishedMint;

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^[a-fA-F0-9]{64}$/;
const COMMIT = /^[a-fA-F0-9]{40}$/;
const IMAGE = /^sha256:[a-fA-F0-9]{64}$/;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodedAddressLength(value: string) {
  const bytes = [0];
  for (const character of value) {
    let carry = BASE58_ALPHABET.indexOf(character);
    if (carry < 0) return 0;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 255;
      carry = next >> 8;
    }
    while (carry > 0) { bytes.push(carry & 255); carry >>= 8; }
  }
  let leadingZeroes = 0;
  while (leadingZeroes < value.length - 1 && value[leadingZeroes] === "1") leadingZeroes += 1;
  return bytes.length + leadingZeroes;
}

export type ReleaseMarket = {
  marketState: string;
  clearingVault: string;
  sourceVault: string;
  reserveVault: string;
  productMint: string;
  sourceProvider: "prestocks";
  sourceAssetSymbol: "OPENAI";
  sourceMint: string;
  sourceMintAccountSha256: string;
  sourceRegistryHash: string;
  primaryOracleAccount: string;
  primaryOracleOwner: string;
  primaryOracleFeedId: string;
  primaryOracleProviderId: string;
  secondaryOracleAccount: string;
  secondaryOracleOwner: string;
  secondaryOracleFeedId: string;
  secondaryOracleProviderId: string;
  adapterProgram: string;
  adapterMarket: string;
  adapterBinaryHash: string;
  leverage: 2;
  side: "long" | "short";
  standbyBps: number;
  transactionCap: number;
  walletCap: number;
  tvlCap: number;
  dailyMintCap: number;
  dailyRedeemCap: number;
};

export type ReleaseManifestV2 = {
  schemaVersion: 2;
  releaseCommit: string;
  releaseArtifacts: {
    sourceSha256: string;
    sbfSha256: string;
    idlSha256: string;
    sbomSha256: string;
    toolchainImageDigest: string;
  };
  evidence: {
    independentAuditSha256: string;
    economicAuditSha256: string;
    auditorRetestSha256: string;
    backingAttestationSha256: string;
    reserveAttestationSha256: string;
    venueManifestSha256: string;
    productManifestsSha256: string;
    governanceAccountSha256: string;
    guardianAccountSha256: string;
    legalApprovalSha256: string;
    goLiveVoteSha256: string;
  };
  programId: string;
  configState: string;
  programDataAddress: string;
  programLoader: string;
  upgradePolicy: "frozen";
  upgradeAuthority: null;
  upgradeTimelockSeconds: 0;
  feeRecipient: string;
  treasuryAuthority: string;
  governance: string;
  guardian: string;
  multisigProgram: string;
  markets: { OPENAI2L: ReleaseMarket; OPENAI2S: ReleaseMarket };
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has missing or extra fields`);
  }
}

function text(value: unknown, pattern: RegExp, label: string) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`${label} is invalid`);
  if (pattern === ADDRESS && decodedAddressLength(value) !== 32) throw new Error(`${label} is not a 32-byte address`);
  return value;
}

const MARKET_KEYS = [
  "marketState", "clearingVault", "sourceVault", "reserveVault", "productMint",
  "sourceProvider", "sourceAssetSymbol", "sourceMint", "sourceMintAccountSha256", "sourceRegistryHash",
  "primaryOracleAccount", "primaryOracleOwner", "primaryOracleFeedId", "primaryOracleProviderId",
  "secondaryOracleAccount", "secondaryOracleOwner", "secondaryOracleFeedId", "secondaryOracleProviderId",
  "adapterProgram", "adapterMarket", "adapterBinaryHash", "leverage", "side", "standbyBps",
  "transactionCap", "walletCap", "tvlCap", "dailyMintCap", "dailyRedeemCap",
] as const;

function market(value: unknown, productId: "OPENAI2L" | "OPENAI2S"): ReleaseMarket {
  const item = record(value, productId);
  exactKeys(item, MARKET_KEYS, productId);
  for (const field of [
    "marketState", "clearingVault", "sourceVault", "reserveVault", "productMint", "sourceMint",
    "primaryOracleAccount", "primaryOracleOwner", "secondaryOracleAccount", "secondaryOracleOwner",
    "adapterProgram", "adapterMarket",
  ] as const) text(item[field], ADDRESS, `${productId}.${field}`);
  for (const field of [
    "sourceMintAccountSha256", "sourceRegistryHash", "primaryOracleFeedId", "secondaryOracleFeedId", "adapterBinaryHash",
  ] as const) text(item[field], HASH, `${productId}.${field}`);
  if (!OPENAI_SOURCE_MINT || item.sourceProvider !== "prestocks" || item.sourceAssetSymbol !== "OPENAI" ||
      item.sourceMint !== OPENAI_SOURCE_MINT || item.leverage !== 2 ||
      item.side !== (productId === "OPENAI2L" ? "long" : "short") ||
      !Number.isInteger(item.standbyBps) || Number(item.standbyBps) < 1 || Number(item.standbyBps) > 500) {
    throw new Error(`${productId} product identity is invalid`);
  }
  const caps = [item.transactionCap, item.walletCap, item.tvlCap, item.dailyMintCap, item.dailyRedeemCap];
  if (caps.some((cap) => !Number.isSafeInteger(cap) || Number(cap) <= 0) ||
      Number(item.transactionCap) > Number(item.walletCap) || Number(item.walletCap) > Number(item.tvlCap)) {
    throw new Error(`${productId} caps are invalid`);
  }
  if (typeof item.primaryOracleProviderId !== "string" || !item.primaryOracleProviderId.trim() ||
      typeof item.secondaryOracleProviderId !== "string" || !item.secondaryOracleProviderId.trim() ||
      item.primaryOracleProviderId === item.secondaryOracleProviderId ||
      item.primaryOracleAccount === item.secondaryOracleAccount || item.primaryOracleOwner === item.secondaryOracleOwner) {
    throw new Error(`${productId} oracle identities are not independent`);
  }
  const distinct = [item.marketState, item.clearingVault, item.sourceVault, item.reserveVault, item.productMint, item.sourceMint];
  if (new Set(distinct).size !== distinct.length) throw new Error(`${productId} critical accounts are aliased`);
  return item as ReleaseMarket;
}

export function parseReleaseManifestV2(source: string): ReleaseManifestV2 {
  const root = record(JSON.parse(source) as unknown, "release manifest");
  exactKeys(root, [
    "schemaVersion", "releaseCommit", "releaseArtifacts", "evidence", "programId", "configState",
    "programDataAddress", "programLoader", "upgradePolicy", "upgradeAuthority", "upgradeTimelockSeconds",
    "feeRecipient", "treasuryAuthority", "governance", "guardian", "multisigProgram", "markets",
  ], "release manifest");
  if (root.schemaVersion !== RELEASE_MANIFEST_VERSION || root.upgradePolicy !== "frozen" ||
      root.upgradeAuthority !== null || root.upgradeTimelockSeconds !== 0) throw new Error("release policy is not immutable v2");
  text(root.releaseCommit, COMMIT, "releaseCommit");
  for (const field of ["programId", "configState", "programDataAddress", "programLoader", "feeRecipient", "treasuryAuthority", "governance", "guardian", "multisigProgram"] as const) {
    text(root[field], ADDRESS, field);
  }
  if (root.governance === root.guardian) throw new Error("governance and guardian must be distinct");

  const artifacts = record(root.releaseArtifacts, "releaseArtifacts");
  exactKeys(artifacts, ["sourceSha256", "sbfSha256", "idlSha256", "sbomSha256", "toolchainImageDigest"], "releaseArtifacts");
  for (const field of ["sourceSha256", "sbfSha256", "idlSha256", "sbomSha256"] as const) text(artifacts[field], HASH, field);
  text(artifacts.toolchainImageDigest, IMAGE, "toolchainImageDigest");

  const evidence = record(root.evidence, "evidence");
  const evidenceKeys = [
    "independentAuditSha256", "economicAuditSha256", "auditorRetestSha256", "backingAttestationSha256",
    "reserveAttestationSha256", "venueManifestSha256", "productManifestsSha256", "governanceAccountSha256",
    "guardianAccountSha256", "legalApprovalSha256",
    "goLiveVoteSha256",
  ] as const;
  exactKeys(evidence, evidenceKeys, "evidence");
  for (const field of evidenceKeys) text(evidence[field], HASH, field);

  const markets = record(root.markets, "markets");
  exactKeys(markets, ["OPENAI2L", "OPENAI2S"], "markets");
  const parsed = {
    ...root,
    releaseArtifacts: artifacts,
    evidence,
    markets: { OPENAI2L: market(markets.OPENAI2L, "OPENAI2L"), OPENAI2S: market(markets.OPENAI2S, "OPENAI2S") },
  } as ReleaseManifestV2;
  if (parsed.markets.OPENAI2L.sourceMint !== parsed.markets.OPENAI2S.sourceMint) {
    throw new Error("long and short source mints disagree");
  }
  if (parsed.markets.OPENAI2L.marketState === parsed.markets.OPENAI2S.marketState ||
      parsed.markets.OPENAI2L.productMint === parsed.markets.OPENAI2S.productMint ||
      parsed.markets.OPENAI2L.clearingVault === parsed.markets.OPENAI2S.clearingVault ||
      parsed.markets.OPENAI2L.sourceVault === parsed.markets.OPENAI2S.sourceVault ||
      parsed.markets.OPENAI2L.reserveVault === parsed.markets.OPENAI2S.reserveVault ||
      parsed.markets.OPENAI2L.adapterMarket === parsed.markets.OPENAI2S.adapterMarket) {
    throw new Error("long and short markets are not isolated");
  }
  return parsed;
}
