import { PRESTOCKS, TESSERA } from "./product-registry.ts";
import { SOLANA_USDC_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./markets.ts";

export const PREIPO_VAULT = {
  id: "levplay-preipo-vault",
  chainId: "solana-mainnet",
  providers: ["prestocks", "tessera"],
  providerApiOrigins: ["https://prestocks.com", "https://rest-api.tessera.pe"],
  collateralMint: SOLANA_USDC_MINT,
  tokenProgramIds: [TOKEN_PROGRAM, TOKEN_2022_PROGRAM],
  sourceMints: [...PRESTOCKS, ...TESSERA].map((asset) => asset.publishedMint as string),
} as const;

export const VENUE_CANDIDATES = [
  { id: PREIPO_VAULT.id, label: "LevPlay isolated pre-IPO risk vault", state: "candidate", scope: "2x long and short PreStocks and Tessera products" },
] as const;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^(?:0x)?[a-fA-F0-9]{64}$/;
const ISO_COUNTRY = /^[A-Z]{2}$/;
export const MINIMUM_BLOCKED_COUNTRIES = ["AF", "BY", "CA", "CU", "IR", "KP", "LY", "MM", "RU", "SO", "SS", "SD", "SY", "US", "CN"] as const;

export type VenueAdmissionManifest = {
  venueId: string;
  chainId: string;
  providerIds: string[];
  providerApiOrigins: string[];
  sourceMints: string[];
  collateralMint: string;
  tokenProgramIds: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  eligibilityAttestor: string;
  eligibilityPolicyHash: string;
  legalApprovalHash: string;
  prestocksApprovalHash: string;
  tesseraApprovalHash: string;
  independentAuditHash: string;
  auditorRetestHash: string;
  deploymentManifestHash: string;
  reserveAttestationHash: string;
  makerCommitmentHash: string;
  primaryFailureDomain: string;
  emergencyFailureDomain: string;
  longRiskCapital: bigint;
  shortGainCollateral: bigint;
  standbyReserve: bigint;
  aggregateCapitalCap: bigint;
  expiresAtUnix: number;
  closesRemainPermissionless: boolean;
};

export type VenueAdmission = { admitted: boolean; venueId: string | null; reasons: string[] };

function exactSet(actual: string[], expected: readonly string[]) {
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((value) => actual.includes(value));
}
function validCountries(values: string[]) {
  return values.length > 0 && new Set(values).size === values.length && values.every((value) => ISO_COUNTRY.test(value));
}

export function assessVenueAdmission(manifest: VenueAdmissionManifest, nowUnix: number): VenueAdmission {
  const reasons: string[] = [];
  if (manifest.venueId !== PREIPO_VAULT.id) reasons.push("venue is not the reviewed LevPlay pre-IPO risk vault");
  if (manifest.chainId !== PREIPO_VAULT.chainId) reasons.push("wrong Solana chain identifier");
  if (!exactSet(manifest.providerIds, PREIPO_VAULT.providers)) reasons.push("provider set must be exactly PreStocks and Tessera");
  if (!exactSet(manifest.providerApiOrigins, PREIPO_VAULT.providerApiOrigins)) reasons.push("provider API origins do not match the reviewed allowlist");
  if (!exactSet(manifest.sourceMints, PREIPO_VAULT.sourceMints)) reasons.push("source mint allowlist is incomplete or contains an unreviewed mint");
  if (manifest.collateralMint !== PREIPO_VAULT.collateralMint) reasons.push("collateral is not canonical Solana USDC");
  if (!exactSet(manifest.tokenProgramIds, PREIPO_VAULT.tokenProgramIds)) reasons.push("token program allowlist must contain only the classic and Token-2022 programs");
  if (!validCountries(manifest.allowedCountries) || !validCountries(manifest.blockedCountries)) reasons.push("country policy is invalid");
  if (manifest.allowedCountries.some((country) => manifest.blockedCountries.includes(country))) reasons.push("country appears in both allow and block lists");
  if (!MINIMUM_BLOCKED_COUNTRIES.every((country) => manifest.blockedCountries.includes(country))) reasons.push("minimum prohibited-country floor is incomplete");
  if (!BASE58.test(manifest.eligibilityAttestor)) reasons.push("eligibility attestor is not pinned");
  for (const [label, value] of [
    ["eligibility policy", manifest.eligibilityPolicyHash], ["legal approval", manifest.legalApprovalHash],
    ["PreStocks approval", manifest.prestocksApprovalHash], ["Tessera approval", manifest.tesseraApprovalHash],
    ["independent audit", manifest.independentAuditHash], ["auditor retest", manifest.auditorRetestHash],
    ["deployment manifest", manifest.deploymentManifestHash], ["reserve attestation", manifest.reserveAttestationHash],
    ["maker commitment", manifest.makerCommitmentHash],
  ]) if (!HASH.test(value)) reasons.push(`${label} hash is missing`);
  if (!manifest.primaryFailureDomain.trim() || !manifest.emergencyFailureDomain.trim() || manifest.primaryFailureDomain === manifest.emergencyFailureDomain) reasons.push("primary and emergency exits lack independent failure domains");
  if (manifest.aggregateCapitalCap <= 0n) reasons.push("aggregate pilot cap is invalid");
  if (manifest.longRiskCapital < manifest.aggregateCapitalCap) reasons.push("long leverage funding is below the pilot cap");
  if (manifest.shortGainCollateral < manifest.aggregateCapitalCap * 2n) reasons.push("short-gain collateral is below the full 2x downside payout");
  if (manifest.standbyReserve <= 0n) reasons.push("Standby reserve is unfunded");
  if (!Number.isSafeInteger(manifest.expiresAtUnix) || manifest.expiresAtUnix <= nowUnix) reasons.push("venue admission is expired");
  if (!manifest.closesRemainPermissionless) reasons.push("eligibility controls could block holder exits");
  return { admitted: reasons.length === 0, venueId: manifest.venueId || null, reasons };
}

function bigint(value: unknown) {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) throw new Error("invalid integer string");
  return BigInt(value);
}
const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

export function parseVenueManifest(source: string): VenueAdmissionManifest {
  const value = JSON.parse(source) as Record<string, unknown>;
  return {
    venueId: String(value.venueId || ""), chainId: String(value.chainId || ""),
    providerIds: strings(value.providerIds), providerApiOrigins: strings(value.providerApiOrigins),
    sourceMints: strings(value.sourceMints), collateralMint: String(value.collateralMint || ""),
    tokenProgramIds: strings(value.tokenProgramIds), allowedCountries: strings(value.allowedCountries),
    blockedCountries: strings(value.blockedCountries), eligibilityAttestor: String(value.eligibilityAttestor || ""),
    eligibilityPolicyHash: String(value.eligibilityPolicyHash || ""), legalApprovalHash: String(value.legalApprovalHash || ""),
    prestocksApprovalHash: String(value.prestocksApprovalHash || ""), tesseraApprovalHash: String(value.tesseraApprovalHash || ""),
    independentAuditHash: String(value.independentAuditHash || ""), auditorRetestHash: String(value.auditorRetestHash || ""),
    deploymentManifestHash: String(value.deploymentManifestHash || ""), reserveAttestationHash: String(value.reserveAttestationHash || ""),
    makerCommitmentHash: String(value.makerCommitmentHash || ""), primaryFailureDomain: String(value.primaryFailureDomain || ""),
    emergencyFailureDomain: String(value.emergencyFailureDomain || ""), longRiskCapital: bigint(value.longRiskCapital),
    shortGainCollateral: bigint(value.shortGainCollateral), standbyReserve: bigint(value.standbyReserve),
    aggregateCapitalCap: bigint(value.aggregateCapitalCap), expiresAtUnix: Number(value.expiresAtUnix),
    closesRemainPermissionless: value.closesRemainPermissionless === true,
  };
}

export function venueStatusFromEnvironment(nowUnix = Math.floor(Date.now() / 1_000)): VenueAdmission {
  try {
    const source = process.env.LEVPLAY_SVM_VENUE_MANIFEST_JSON;
    if (!source) return { admitted: false, venueId: null, reasons: ["venue admission manifest is missing"] };
    return assessVenueAdmission(parseVenueManifest(source), nowUnix);
  } catch {
    return { admitted: false, venueId: null, reasons: ["venue admission manifest is invalid"] };
  }
}
