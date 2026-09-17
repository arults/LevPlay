/**
 * Fail-closed admission for using xStocks as source inventory.
 *
 * This does not add xStocks products to the public catalog. It describes the
 * evidence required before AAPLx may back an isolated LevPlay market.
 */
export const XSTOCKS_AAPL = {
  provider: "xStocks / Backed Assets (JE) Limited",
  symbol: "AAPLx",
  underlying: "AAPL",
  solanaMint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
  apiOrigin: "https://api.xstocks.fi/api/v2",
  supportsAtomicSwaps: true,
  publicAssetPath: "/public/assets/AAPLx",
  integrationState: "feasibility-candidate",
} as const;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^(?:0x)?[a-fA-F0-9]{64}$/;

export type XStocksAdmissionManifest = {
  symbol: string;
  sourceMint: string;
  tokenProgramId: string;
  vaultAuthority: string;
  registeredWallet: string;
  partnerApprovalHash: string;
  wrapperApprovalHash: string;
  legalApprovalHash: string;
  sourceRegistryHash: string;
  tokenExtensionAuditHash: string;
  xchangeCompositionAuditHash: string;
  redemptionTestHash: string;
  oracleAuditHash: string;
  primaryOracle: string;
  secondaryOracle: string;
  sourceInventoryUnits: bigint;
  requiredInventoryUnits: bigint;
  standbyReserve: bigint;
  issuerHaltBlocksOpen: boolean;
  multiplierActivationBlocksOpen: boolean;
  permanentDelegateAccepted: boolean;
  permissionlessCloseWithoutApi: boolean;
  emergencyExitFunded: boolean;
  programControlledWalletApproved: boolean;
  transactionCompositionProven: boolean;
  expiresAtUnix: number;
};

export function assessXStocksAdmission(
  manifest: XStocksAdmissionManifest,
  nowUnix: number,
) {
  const reasons: string[] = [];
  if (manifest.symbol !== XSTOCKS_AAPL.symbol) reasons.push("wrong xStocks symbol");
  if (manifest.sourceMint !== XSTOCKS_AAPL.solanaMint) reasons.push("AAPLx mint mismatch");

  for (const [label, value] of [
    ["token program", manifest.tokenProgramId],
    ["vault authority", manifest.vaultAuthority],
    ["registered wallet", manifest.registeredWallet],
    ["primary oracle", manifest.primaryOracle],
    ["secondary oracle", manifest.secondaryOracle],
  ] as const) {
    if (!BASE58.test(value)) reasons.push(label + " is not pinned");
  }

  if (manifest.primaryOracle === manifest.secondaryOracle) {
    reasons.push("oracle failure domains are not independent");
  }

  for (const [label, value] of [
    ["partner approval", manifest.partnerApprovalHash],
    ["wrapper approval", manifest.wrapperApprovalHash],
    ["legal approval", manifest.legalApprovalHash],
    ["source registry", manifest.sourceRegistryHash],
    ["token extension audit", manifest.tokenExtensionAuditHash],
    ["xChange composition audit", manifest.xchangeCompositionAuditHash],
    ["redemption test", manifest.redemptionTestHash],
    ["oracle audit", manifest.oracleAuditHash],
  ] as const) {
    if (!HASH.test(value)) reasons.push(label + " hash is missing");
  }

  if (manifest.sourceInventoryUnits < manifest.requiredInventoryUnits) {
    reasons.push("prepositioned xStocks inventory is below required leverage backing");
  }
  if (manifest.requiredInventoryUnits <= 0n) reasons.push("required inventory is invalid");
  if (manifest.standbyReserve <= 0n) reasons.push("Standby reserve is unfunded");
  if (!manifest.issuerHaltBlocksOpen) reasons.push("issuer halt does not block new risk");
  if (!manifest.multiplierActivationBlocksOpen) reasons.push("multiplier activation is not guarded");
  if (!manifest.permanentDelegateAccepted) reasons.push("issuer permanent-delegate risk is not accepted");
  if (!manifest.permissionlessCloseWithoutApi) reasons.push("holder exit depends on xStocks API");
  if (!manifest.emergencyExitFunded) reasons.push("emergency exit is unfunded");
  if (!manifest.programControlledWalletApproved) {
    reasons.push("Backed has not approved the program-controlled vault wallet");
  }
  if (!manifest.transactionCompositionProven) {
    reasons.push("xChange/LevPlay atomic composition is unproven");
  }
  if (!Number.isSafeInteger(manifest.expiresAtUnix) || manifest.expiresAtUnix <= nowUnix) {
    reasons.push("xStocks admission is expired");
  }

  return { admitted: reasons.length === 0, reasons };
}
