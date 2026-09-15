import assert from "node:assert/strict";
import {
  ONDO_COMMODITIES, ONDO_STOCKS, PRESTOCKS, PRODUCT_CANDIDATES,
  XSTOCKS_STATE, assessProductAdmission, catalogSummary, parseProductManifest, productStatusFromEnvironment,
} from "../lib/product-registry.ts";

assert.deepEqual(catalogSummary(), { ondoStocks: 15, ondoCommodities: 5, prestocks: 7, products: 134, xStocks: "shelved" });
assert.equal(ONDO_STOCKS.length, 15);
assert.equal(ONDO_COMMODITIES.length, 5);
assert.equal(PRESTOCKS.length, 7);
assert.equal(PRODUCT_CANDIDATES.filter((p) => p.provider === "ondo").length, 120);
assert.equal(PRODUCT_CANDIDATES.filter((p) => p.provider === "prestocks").length, 14);
assert.equal(PRODUCT_CANDIDATES.some((p) => p.provider === "prestocks" && p.leverage !== 2), false);
assert.equal(XSTOCKS_STATE, "shelved");

const addr = (char) => char.repeat(32);
const hash = "a".repeat(64);
const manifest = (productId, overrides = {}) => {
  const product = PRODUCT_CANDIDATES.find((item) => item.id === productId);
  if (!product) throw new Error("unknown fixture product");
  return {
    productId, provider: product.provider, sourceSymbol: product.symbol,
    sourceMint: product.publishedMint || addr("S"), productMint: addr("P"), marketPda: addr("M"),
    collateralVault: addr("C"), feeVault: addr("F"), primaryOracle: addr("B"), secondaryOracle: addr("Q"),
    sourceRegistryHash: hash, providerApprovalHash: hash, legalApprovalHash: hash,
    productAuditHash: hash, economicAuditHash: hash, auditorRetestHash: hash,
    deploymentHash: hash, eligibilityPolicyHash: hash,
    aggregateCapitalCap: 1_000_000_000n, perWalletCapitalCap: 100_000_000n,
    makerLongCapital: 4_000_000_000n, shortGainCollateral: 5_000_000_000n,
    standbyFloorReserve: 10_000_000n, minimumNavBps: 100,
    maximumRedemptionLiability: 6_000_000_000n, independentExitLiquidity: 6_000_000_000n,
    maxOracleAgeSeconds: 30, maxOracleDeviationBps: 75, maxOracleConfidenceBps: 75,
    permissionlessClose: true, isolatedCollateral: true, usesBorrowOrMargin: false,
    mintsDisabledOnHalt: true, permissionlessRebalance: true, sourceOutageMode: "close-only-pro-rata",
    rpcDomains: ["rpc-a.example", "rpc-b.example", "rpc-c.example"],
    keeperAuthorities: [addr("K"), addr("R"), addr("T")],
    governanceMultisig: addr("G"), guardianMultisig: addr("H"),
    primaryExitOperator: addr("E"), emergencyExitOperator: addr("Z"),
    upgradeDelaySeconds: 172_800, expiresAtUnix: 2_000_000_000, ...overrides,
  };
};

for (const id of ["AAPL2L", "AAPL3S", "AAPL5L", "GLD5S", "OPENAI2L", "SPACEX2S"]) {
  assert.equal(assessProductAdmission(manifest(id), 1_900_000_000).admitted, true, `${id} positive path`);
}
for (const [id, overrides, expected] of [
  ["AAPL5L", { makerLongCapital: 3_999_999_999n }, "maker long"],
  ["AAPL5S", { shortGainCollateral: 4_999_999_999n }, "short gain"],
  ["OPENAI2L", { providerApprovalHash: "" }, "provider approval"],
  ["SPACEX2S", { isolatedCollateral: false }, "shared"],
  ["AAPL2L", { usesBorrowOrMargin: true }, "borrow or margin"],
  ["AAPL2L", { standbyFloorReserve: 9_999_999n }, "NAV floor"],
  ["AAPL2L", { primaryOracle: addr("B"), secondaryOracle: addr("B") }, "independent"],
  ["AAPL2L", { maxOracleAgeSeconds: 61 }, "60 seconds"],
  ["AAPL2L", { permissionlessClose: false }, "exits"],
  ["AAPL2L", { rpcDomains: ["one", "two"] }, "three independent RPC"],
  ["AAPL2L", { keeperAuthorities: [addr("K"), addr("R")] }, "three independent authorities"],
  ["AAPL2L", { guardianMultisig: addr("G") }, "share one authority"],
  ["AAPL2L", { emergencyExitOperator: addr("E") }, "share one operator"],
  ["AAPL2L", { permissionlessRebalance: false }, "privileged keepers"],
  ["AAPL2L", { independentExitLiquidity: 5_999_999_999n }, "maximum redemption liability"],
  ["AAPL2L", { upgradeDelaySeconds: 86_400 }, "two-day"],
  ["AAPL2L", { expiresAtUnix: 1_900_000_000 }, "expired"],
]) {
  const result = assessProductAdmission(manifest(id, overrides), 1_900_000_000);
  assert.equal(result.admitted, false);
  assert.ok(result.reasons.some((reason) => reason.includes(expected)), `${id}: ${expected}`);
}

assert.deepEqual(assessProductAdmission(manifest("AAPL2L", { productId: "FAKE5L" }), 1_900_000_000).reasons, ["product is outside the reviewed catalog"]);
const serializable = (value) => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "bigint" ? item.toString() : item]));
assert.equal(assessProductAdmission(parseProductManifest(serializable(manifest("AAPL2L"))), 1_900_000_000).admitted, true);
delete process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON;
assert.equal(productStatusFromEnvironment(1_900_000_000).admitted, false);
process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON = JSON.stringify([serializable(manifest("AAPL2L")), serializable(manifest("AAPL2L"))]);
assert.ok(productStatusFromEnvironment(1_900_000_000).reasons.some((reason) => reason.includes("duplicate")));
process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON = JSON.stringify([serializable(manifest("AAPL2L")), serializable(manifest("OPENAI2L"))]);
assert.deepEqual(productStatusFromEnvironment(1_900_000_000).productIds, ["AAPL2L", "OPENAI2L"]);
delete process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON;
console.log("LevPlay product registry: 134 candidates and 27 admission paths passed");
