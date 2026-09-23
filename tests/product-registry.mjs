import assert from "node:assert/strict";
import {
  PRESTOCKS, TESSERA, PRESTOCKS_CATALOG_SNAPSHOT, PRODUCT_CANDIDATES,
  assessProductAdmission, catalogSummary, parseProductManifest, productStatusFromEnvironment,
} from "../lib/product-registry.ts";

assert.deepEqual(catalogSummary(), { prestocks: 8, tessera: 2, products: 20 });
assert.equal(PRESTOCKS.length, 8);
assert.equal(TESSERA.length, 2);
assert.equal(PRESTOCKS_CATALOG_SNAPSHOT.productCount, 8);
assert.deepEqual([...PRESTOCKS_CATALOG_SNAPSHOT.excludedSymbols], ["XAI"]);
assert.equal(new Set([...PRESTOCKS, ...TESSERA].map((asset) => asset.publishedMint)).size, 10);
assert.equal(PRODUCT_CANDIDATES.filter((product) => product.provider === "prestocks").length, 16);
assert.equal(PRODUCT_CANDIDATES.filter((product) => product.provider === "tessera").length, 4);
assert.equal(PRODUCT_CANDIDATES.every((product) => product.leverage === 2), true);

const addr = (char) => char.repeat(32);
const hash = "a".repeat(64);
const manifest = (productId, overrides = {}) => {
  const product = PRODUCT_CANDIDATES.find((item) => item.id === productId);
  if (!product) throw new Error("unknown fixture product");
  return {
    productId, provider: product.provider, sourceSymbol: product.symbol,
    sourceMint: product.publishedMint, productMint: addr("P"), marketPda: addr("M"),
    collateralVault: addr("C"), feeVault: addr("F"), primaryOracle: addr("B"), secondaryOracle: addr("Q"),
    primaryOracleProviderId: "pyth", secondaryOracleProviderId: "independent-provider",
    sourceRegistryHash: hash, providerApprovalHash: hash, legalApprovalHash: hash,
    productAuditHash: hash, economicAuditHash: hash, auditorRetestHash: hash,
    deploymentHash: hash, eligibilityPolicyHash: hash,
    aggregateCapitalCap: 1_000_000_000n, perWalletCapitalCap: 100_000_000n,
    makerLongCapital: 1_000_000_000n, shortGainCollateral: 2_000_000_000n,
    standbyFloorReserve: 10_000_000n, minimumNavBps: 100,
    maximumRedemptionLiability: 2_000_000_000n, independentExitLiquidity: 2_000_000_000n,
    maxOracleAgeSeconds: 30, maxOracleDeviationBps: 75, maxOracleConfidenceBps: 75,
    permissionlessClose: true, isolatedCollateral: true, usesBorrowOrMargin: false,
    mintsDisabledOnHalt: true, permissionlessRebalance: true, sourceOutageMode: "close-only-pro-rata",
    rpcDomains: ["rpc-a.example", "rpc-b.example", "rpc-c.example"],
    rpcProviderIds: ["provider-a", "provider-b", "provider-c"],
    keeperAuthorities: [addr("K"), addr("R"), addr("T")], keeperOperatorIds: ["keeper-a", "keeper-b", "keeper-c"],
    governanceMultisig: addr("G"), guardianMultisig: addr("H"),
    governanceSigners: [addr("1"), addr("2"), addr("3")], guardianSigners: [addr("4"), addr("5"), addr("6")],
    governanceThreshold: 2, guardianThreshold: 2,
    primaryExitOperator: addr("E"), emergencyExitOperator: addr("Z"),
    primaryExitOperatorId: "exit-primary", emergencyExitOperatorId: "exit-emergency",
    upgradeDelaySeconds: 172_800, expiresAtUnix: 2_000_000_000, ...overrides,
  };
};

for (const id of ["ANTH2L", "ANTH2S", "OPENAI2L", "FIGURE2S", "tOPENAI2L", "tKALSHI2S"]) {
  assert.equal(assessProductAdmission(manifest(id), 1_900_000_000).admitted, true, id);
}
for (const [id, overrides, expected] of [
  ["ANTH2L", { makerLongCapital: 999_999_999n }, "maker long"],
  ["ANTH2S", { shortGainCollateral: 1_999_999_999n }, "short gain"],
  ["OPENAI2L", { providerApprovalHash: "" }, "provider approval"],
  ["SPACEX2S", { isolatedCollateral: false }, "shared"],
  ["tOPENAI2L", { primaryOracle: addr("B"), secondaryOracle: addr("B") }, "oracle accounts"],
  ["tKALSHI2S", { permissionlessClose: false }, "exits"],
]) {
  const result = assessProductAdmission(manifest(id, overrides), 1_900_000_000);
  assert.equal(result.admitted, false);
  assert.ok(result.reasons.some((reason) => reason.includes(expected)));
}

const serializable = (value) => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "bigint" ? item.toString() : item]));
assert.equal(assessProductAdmission(parseProductManifest(serializable(manifest("ANTH2L"))), 1_900_000_000).admitted, true);
delete process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON;
assert.equal(productStatusFromEnvironment(1_900_000_000).admitted, false);
process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON = JSON.stringify([serializable(manifest("ANTH2L")), serializable(manifest("ANTH2L"))]);
assert.ok(productStatusFromEnvironment(1_900_000_000).reasons.some((reason) => reason.includes("duplicate")));
delete process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON;
console.log("LevPlay product registry: 20 pre-IPO candidates and fail-closed admission paths passed");
