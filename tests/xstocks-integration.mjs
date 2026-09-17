import assert from "node:assert/strict";
import { XSTOCKS_AAPL, assessXStocksAdmission } from "../lib/xstocks-integration.ts";

const address = (char) => char.repeat(32);
const hash = (char) => char.repeat(64);
const manifest = {
  symbol: "AAPLx",
  sourceMint: XSTOCKS_AAPL.solanaMint,
  tokenProgramId: address("1"),
  vaultAuthority: address("2"),
  registeredWallet: address("3"),
  partnerApprovalHash: hash("a"),
  wrapperApprovalHash: hash("b"),
  legalApprovalHash: hash("c"),
  sourceRegistryHash: hash("d"),
  tokenExtensionAuditHash: hash("e"),
  xchangeCompositionAuditHash: hash("f"),
  redemptionTestHash: hash("1"),
  oracleAuditHash: hash("2"),
  primaryOracle: address("4"),
  secondaryOracle: address("5"),
  sourceInventoryUnits: 5_000n,
  requiredInventoryUnits: 5_000n,
  standbyReserve: 100n,
  issuerHaltBlocksOpen: true,
  multiplierActivationBlocksOpen: true,
  permanentDelegateAccepted: true,
  permissionlessCloseWithoutApi: true,
  emergencyExitFunded: true,
  programControlledWalletApproved: true,
  transactionCompositionProven: true,
  expiresAtUnix: 2_000_000_000,
};

assert.equal(assessXStocksAdmission(manifest, 1_900_000_000).admitted, true);

for (const [field, value, reason] of [
  ["sourceMint", address("6"), "AAPLx mint mismatch"],
  ["secondaryOracle", address("4"), "oracle failure domains are not independent"],
  ["sourceInventoryUnits", 4_999n, "prepositioned xStocks inventory is below required leverage backing"],
  ["issuerHaltBlocksOpen", false, "issuer halt does not block new risk"],
  ["multiplierActivationBlocksOpen", false, "multiplier activation is not guarded"],
  ["permissionlessCloseWithoutApi", false, "holder exit depends on xStocks API"],
  ["programControlledWalletApproved", false, "Backed has not approved the program-controlled vault wallet"],
  ["transactionCompositionProven", false, "xChange/LevPlay atomic composition is unproven"],
]) {
  const result = assessXStocksAdmission({ ...manifest, [field]: value }, 1_900_000_000);
  assert.equal(result.admitted, false, field);
  assert.ok(result.reasons.includes(reason), field);
}

assert.equal(
  assessXStocksAdmission({ ...manifest, expiresAtUnix: 1_899_999_999 }, 1_900_000_000).admitted,
  false,
);

console.log("xStocks admission gate: 9 fail-closed vectors passed");
