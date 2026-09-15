/**
 * Fail-closed release admission for the LevPlay pilot venue.
 *
 * These constants are identifiers published by Ondo. Presence here is not
 * approval: legal, integration, audit, funding and deployment evidence must
 * all bind to one manifest before admitted can become true.
 */
export const ONDO_SOLANA = {
  id: "ondo-stocks-solana",
  chainId: "solana-900",
  apiOrigin: "https://api.gm.ondo.finance",
  gmProgramId: "XzTT4XB8m7sLD2xi6snefSasaswsKCxx5Tifjondogm",
  jupiterOrderEngineProgramId: "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH",
  aaplMint: "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  tokenProgramId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  authorizedSolvers: [
    "AMJ81TnD4EWftmVPxppiEPsSFbmfYAvvLkUaNDXuR7JH",
    "DSqMPMsMAbEJVNuPKv1ZFdzt6YvJaDPDddfeW7ajtqds",
    "2Cq2RNFFxxPXL7teNQAji1beA2vFbBDYW5BGPBFvoN9m",
    "9BB7Tt5uE5VdRsxA5XRqrjwNaq8XtgAUQW8czA6ymUPG",
  ],
} as const;

export const VENUE_CANDIDATES = [
  { id: ONDO_SOLANA.id, label: "Ondo Stocks", state: "candidate", scope: "public stocks and commodity-linked ETFs" },
  { id: "prestocks-solana", label: "PreStocks", state: "candidate", scope: "2x pre-IPO products; integration evidence required" },
  { id: "xstocks-solana", label: "xStocks", state: "shelved", scope: "not an active launch dependency" },
] as const;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^(?:0x)?[a-fA-F0-9]{64}$/;
const ISO_COUNTRY = /^[A-Z]{2}$/;

// Mirrors Ondo's published prohibited-country floor reviewed 2026-09-15.
// A signed legal matrix may add restrictions but cannot silently remove these.
export const MINIMUM_BLOCKED_COUNTRIES = [
  "AF", "BY", "CA", "CU", "IR", "KP", "LY", "MM", "RU", "SO", "SS", "SD", "SY", "US",
] as const;

export type VenueAdmissionManifest = {
  venueId: string;
  chainId: string;
  apiOrigin: string;
  gmProgramId: string;
  orderEngineProgramId: string;
  assetSymbol: "AAPLon";
  assetMint: string;
  collateralMint: string;
  tokenProgramId: string;
  authorizedSolvers: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  eligibilityAttestor: string;
  eligibilityPolicyHash: string;
  legalApprovalHash: string;
  wrapperApprovalHash: string;
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

export type VenueAdmission = {
  admitted: boolean;
  venueId: string | null;
  reasons: string[];
};

function exactSet(actual: string[], expected: readonly string[]) {
  return actual.length === expected.length &&
    new Set(actual).size === expected.length &&
    expected.every((value) => actual.includes(value));
}

function validCountries(values: string[]) {
  return values.length > 0 && new Set(values).size === values.length && values.every((value) => ISO_COUNTRY.test(value));
}

export function assessVenueAdmission(manifest: VenueAdmissionManifest, nowUnix: number): VenueAdmission {
  const reasons: string[] = [];
  if (manifest.venueId !== ONDO_SOLANA.id) reasons.push("pilot venue is not the reviewed Ondo route");
  if (manifest.chainId !== ONDO_SOLANA.chainId) reasons.push("wrong Ondo chain identifier");
  if (manifest.apiOrigin !== ONDO_SOLANA.apiOrigin) reasons.push("unapproved Ondo API origin");
  if (manifest.gmProgramId !== ONDO_SOLANA.gmProgramId) reasons.push("Ondo GM program mismatch");
  if (manifest.orderEngineProgramId !== ONDO_SOLANA.jupiterOrderEngineProgramId) reasons.push("Jupiter order-engine program mismatch");
  if (manifest.assetSymbol !== "AAPLon" || manifest.assetMint !== ONDO_SOLANA.aaplMint) reasons.push("AAPLon mint mismatch");
  if (manifest.collateralMint !== ONDO_SOLANA.usdcMint) reasons.push("collateral is not canonical Solana USDC");
  if (manifest.tokenProgramId !== ONDO_SOLANA.tokenProgramId) reasons.push("Ondo asset is not bound to Token-2022");
  if (!exactSet(manifest.authorizedSolvers, ONDO_SOLANA.authorizedSolvers)) reasons.push("authorized solver allowlist mismatch");
  if (!validCountries(manifest.allowedCountries) || !validCountries(manifest.blockedCountries)) reasons.push("country policy is invalid");
  if (manifest.allowedCountries.some((country) => manifest.blockedCountries.includes(country))) reasons.push("country appears in both allow and block lists");
  if (!MINIMUM_BLOCKED_COUNTRIES.every((country) => manifest.blockedCountries.includes(country))) reasons.push("published prohibited-country floor is incomplete");
  if (!BASE58.test(manifest.eligibilityAttestor)) reasons.push("eligibility attestor is not pinned");
  for (const [label, value] of [
    ["eligibility policy", manifest.eligibilityPolicyHash],
    ["legal approval", manifest.legalApprovalHash],
    ["Ondo wrapper approval", manifest.wrapperApprovalHash],
    ["independent audit", manifest.independentAuditHash],
    ["auditor retest", manifest.auditorRetestHash],
    ["deployment manifest", manifest.deploymentManifestHash],
    ["reserve attestation", manifest.reserveAttestationHash],
    ["maker commitment", manifest.makerCommitmentHash],
  ]) {
    if (!HASH.test(value)) reasons.push(label + " hash is missing");
  }
  if (!manifest.primaryFailureDomain.trim() || !manifest.emergencyFailureDomain.trim() ||
      manifest.primaryFailureDomain === manifest.emergencyFailureDomain) {
    reasons.push("primary and emergency exits lack independent failure domains");
  }
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

export function parseVenueManifest(source: string): VenueAdmissionManifest {
  const value = JSON.parse(source) as Record<string, unknown>;
  return {
    venueId: String(value.venueId || ""),
    chainId: String(value.chainId || ""),
    apiOrigin: String(value.apiOrigin || ""),
    gmProgramId: String(value.gmProgramId || ""),
    orderEngineProgramId: String(value.orderEngineProgramId || ""),
    assetSymbol: String(value.assetSymbol || "") as "AAPLon",
    assetMint: String(value.assetMint || ""),
    collateralMint: String(value.collateralMint || ""),
    tokenProgramId: String(value.tokenProgramId || ""),
    authorizedSolvers: Array.isArray(value.authorizedSolvers) ? value.authorizedSolvers.map(String) : [],
    allowedCountries: Array.isArray(value.allowedCountries) ? value.allowedCountries.map(String) : [],
    blockedCountries: Array.isArray(value.blockedCountries) ? value.blockedCountries.map(String) : [],
    eligibilityAttestor: String(value.eligibilityAttestor || ""),
    eligibilityPolicyHash: String(value.eligibilityPolicyHash || ""),
    legalApprovalHash: String(value.legalApprovalHash || ""),
    wrapperApprovalHash: String(value.wrapperApprovalHash || ""),
    independentAuditHash: String(value.independentAuditHash || ""),
    auditorRetestHash: String(value.auditorRetestHash || ""),
    deploymentManifestHash: String(value.deploymentManifestHash || ""),
    reserveAttestationHash: String(value.reserveAttestationHash || ""),
    makerCommitmentHash: String(value.makerCommitmentHash || ""),
    primaryFailureDomain: String(value.primaryFailureDomain || ""),
    emergencyFailureDomain: String(value.emergencyFailureDomain || ""),
    longRiskCapital: bigint(value.longRiskCapital),
    shortGainCollateral: bigint(value.shortGainCollateral),
    standbyReserve: bigint(value.standbyReserve),
    aggregateCapitalCap: bigint(value.aggregateCapitalCap),
    expiresAtUnix: Number(value.expiresAtUnix),
    closesRemainPermissionless: value.closesRemainPermissionless === true,
  };
}

export function venueStatusFromEnvironment(nowUnix = Math.floor(Date.now() / 1_000)): VenueAdmission {
  try {
    const source = process.env.LEVPLAY_SVM_VENUE_MANIFEST_JSON;
    if (!source) return { admitted: false, venueId: null, reasons: ["signed venue admission manifest is missing"] };
    return assessVenueAdmission(parseVenueManifest(source), nowUnix);
  } catch {
    return { admitted: false, venueId: null, reasons: ["signed venue admission manifest is invalid"] };
  }
}
