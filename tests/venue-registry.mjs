import assert from "node:assert/strict";
import {
  assessVenueAdmission,
  MINIMUM_BLOCKED_COUNTRIES,
  ONDO_SOLANA,
  parseVenueManifest,
  venueStatusFromEnvironment,
} from "../lib/venue-registry.ts";

const hash = "a".repeat(64);
const manifest = (overrides = {}) => ({
  venueId: ONDO_SOLANA.id,
  chainId: ONDO_SOLANA.chainId,
  apiOrigin: ONDO_SOLANA.apiOrigin,
  gmProgramId: ONDO_SOLANA.gmProgramId,
  orderEngineProgramId: ONDO_SOLANA.jupiterOrderEngineProgramId,
  assetSymbol: "AAPLon",
  assetMint: ONDO_SOLANA.aaplMint,
  collateralMint: ONDO_SOLANA.usdcMint,
  tokenProgramId: ONDO_SOLANA.tokenProgramId,
  authorizedSolvers: [...ONDO_SOLANA.authorizedSolvers],
  allowedCountries: ["IN"],
  blockedCountries: [...MINIMUM_BLOCKED_COUNTRIES],
  eligibilityAttestor: "Attestor111111111111111111111111111111111",
  eligibilityPolicyHash: hash,
  legalApprovalHash: hash,
  wrapperApprovalHash: hash,
  independentAuditHash: hash,
  auditorRetestHash: hash,
  deploymentManifestHash: hash,
  reserveAttestationHash: hash,
  makerCommitmentHash: hash,
  primaryFailureDomain: "ondo-jit",
  emergencyFailureDomain: "independent-inventory",
  longRiskCapital: 1_000_000_000n,
  shortGainCollateral: 2_000_000_000n,
  standbyReserve: 50_000_000n,
  aggregateCapitalCap: 1_000_000_000n,
  expiresAtUnix: 2_000_000_000,
  closesRemainPermissionless: true,
  ...overrides,
});

assert.equal(assessVenueAdmission(manifest(), 1_900_000_000).admitted, true);
for (const [field, replacement, reason] of [
  ["gmProgramId", "Wrong11111111111111111111111111111111111", "program"],
  ["assetMint", "Wrong11111111111111111111111111111111111", "mint"],
  ["wrapperApprovalHash", "", "wrapper"],
  ["independentAuditHash", "", "audit"],
  ["shortGainCollateral", 1_999_999_999n, "short-gain"],
  ["closesRemainPermissionless", false, "exits"],
]) {
  const result = assessVenueAdmission(manifest({ [field]: replacement }), 1_900_000_000);
  assert.equal(result.admitted, false);
  assert.ok(result.reasons.some((value) => value.includes(reason)), field + " must fail for " + reason);
}

assert.equal(assessVenueAdmission(manifest({ blockedCountries: MINIMUM_BLOCKED_COUNTRIES.slice(1) }), 1_900_000_000).admitted, false);
assert.equal(assessVenueAdmission(manifest({ allowedCountries: ["US"] }), 1_900_000_000).admitted, false);
assert.equal(assessVenueAdmission(manifest({ expiresAtUnix: 1_900_000_000 }), 1_900_000_000).admitted, false);
assert.equal(venueStatusFromEnvironment(1_900_000_000).admitted, false, "missing environment evidence fails closed");

const serializable = { ...manifest(), longRiskCapital: "1000000000", shortGainCollateral: "2000000000", standbyReserve: "50000000", aggregateCapitalCap: "1000000000" };
assert.equal(assessVenueAdmission(parseVenueManifest(JSON.stringify(serializable)), 1_900_000_000).admitted, true);
assert.throws(() => parseVenueManifest(JSON.stringify({ ...serializable, longRiskCapital: "-1" })));

console.log("LevPlay venue registry: 12 admission and fail-closed cases passed");
