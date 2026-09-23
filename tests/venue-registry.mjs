import assert from "node:assert/strict";
import { assessVenueAdmission, MINIMUM_BLOCKED_COUNTRIES, PREIPO_VAULT, parseVenueManifest, venueStatusFromEnvironment } from "../lib/venue-registry.ts";

const hash = "a".repeat(64);
const manifest = (overrides = {}) => ({
  venueId: PREIPO_VAULT.id,
  chainId: PREIPO_VAULT.chainId,
  providerIds: [...PREIPO_VAULT.providers],
  providerApiOrigins: [...PREIPO_VAULT.providerApiOrigins],
  sourceMints: [...PREIPO_VAULT.sourceMints],
  collateralMint: PREIPO_VAULT.collateralMint,
  tokenProgramIds: [...PREIPO_VAULT.tokenProgramIds],
  allowedCountries: ["IN"],
  blockedCountries: [...MINIMUM_BLOCKED_COUNTRIES],
  eligibilityAttestor: "Attestor111111111111111111111111111111111",
  eligibilityPolicyHash: hash, legalApprovalHash: hash, prestocksApprovalHash: hash, tesseraApprovalHash: hash,
  independentAuditHash: hash, auditorRetestHash: hash, deploymentManifestHash: hash,
  reserveAttestationHash: hash, makerCommitmentHash: hash,
  primaryFailureDomain: "primary-market-maker", emergencyFailureDomain: "independent-exit-provider",
  longRiskCapital: 1_000_000_000n, shortGainCollateral: 2_000_000_000n,
  standbyReserve: 50_000_000n, aggregateCapitalCap: 1_000_000_000n,
  expiresAtUnix: 2_000_000_000, closesRemainPermissionless: true, ...overrides,
});

assert.equal(assessVenueAdmission(manifest(), 1_900_000_000).admitted, true);
for (const [field, replacement, reason] of [
  ["providerIds", ["prestocks"], "provider set"],
  ["sourceMints", PREIPO_VAULT.sourceMints.slice(1), "mint allowlist"],
  ["prestocksApprovalHash", "", "PreStocks approval"],
  ["tesseraApprovalHash", "", "Tessera approval"],
  ["independentAuditHash", "", "audit"],
  ["shortGainCollateral", 1_999_999_999n, "short-gain"],
  ["closesRemainPermissionless", false, "exits"],
]) {
  const result = assessVenueAdmission(manifest({ [field]: replacement }), 1_900_000_000);
  assert.equal(result.admitted, false);
  assert.ok(result.reasons.some((value) => value.includes(reason)), field);
}
assert.equal(assessVenueAdmission(manifest({ blockedCountries: MINIMUM_BLOCKED_COUNTRIES.slice(1) }), 1_900_000_000).admitted, false);
assert.equal(assessVenueAdmission(manifest({ allowedCountries: ["US"] }), 1_900_000_000).admitted, false);
assert.equal(assessVenueAdmission(manifest({ expiresAtUnix: 1_900_000_000 }), 1_900_000_000).admitted, false);
assert.equal(venueStatusFromEnvironment(1_900_000_000).admitted, false);

const serializable = { ...manifest(), longRiskCapital: "1000000000", shortGainCollateral: "2000000000", standbyReserve: "50000000", aggregateCapitalCap: "1000000000" };
assert.equal(assessVenueAdmission(parseVenueManifest(JSON.stringify(serializable)), 1_900_000_000).admitted, true);
assert.throws(() => parseVenueManifest(JSON.stringify({ ...serializable, longRiskCapital: "-1" })));
console.log("LevPlay pre-IPO vault registry: admission and fail-closed cases passed");
