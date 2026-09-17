/**
 * Production settlement identities for the first LevPlay pilot.
 *
 * An entry here is evidence, not a release switch. A product is settlement-ready
 * only when every required source is production-verified, independently owned,
 * parsed by the SBF program, and bound to the frozen deployment manifest.
 */
export const PYTH_SOLANA = {
  provider: "Pyth Network",
  receiverProgramId: "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  pushOracleProgramId: "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT",
  aaplFeedId: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  symbol: "Equity.US.AAPL/USD",
  status: "verified-candidate",
  evidence: [
    "https://hermes.pyth.network/v2/price_feeds?query=AAPL&asset_type=equity",
    "https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/solana/pyth_solana_receiver_sdk/src/lib.rs",
  ],
} as const;

export const ONDO_SETTLEMENT = {
  provider: "Ondo Stocks",
  displayApiIsOracle: false,
  officialOracleStatus: "not-published",
  status: "blocked",
  evidence: [
    "https://docs.ondo.finance/api-reference/assets/get-current-price-for-an-asset",
    "https://docs.ondo.finance/api-reference/overview",
  ],
} as const;

export const AAPL_SETTLEMENT_GATE = {
  requiredIndependentSources: 2,
  sources: [
    {
      id: "pyth-aapl",
      provider: PYTH_SOLANA.provider,
      verifierProgramId: PYTH_SOLANA.receiverProgramId,
      feedId: PYTH_SOLANA.aaplFeedId,
      productionVerified: true,
    },
    {
      id: "secondary-aapl",
      provider: null,
      verifierProgramId: null,
      feedId: null,
      productionVerified: false,
    },
  ],
} as const;

export function assessAaplSettlementGate() {
  const admitted = AAPL_SETTLEMENT_GATE.sources.filter(
    (source) => source.productionVerified && source.provider && source.verifierProgramId && source.feedId,
  );
  const independentProviders = new Set(admitted.map((source) => source.provider));
  return {
    ready:
      admitted.length === AAPL_SETTLEMENT_GATE.requiredIndependentSources &&
      independentProviders.size === AAPL_SETTLEMENT_GATE.requiredIndependentSources,
    verifiedSources: admitted.length,
    requiredSources: AAPL_SETTLEMENT_GATE.requiredIndependentSources,
    reasons:
      admitted.length < AAPL_SETTLEMENT_GATE.requiredIndependentSources
        ? ["second independent Solana AAPL verifier/feed is not production-pinned"]
        : [],
  };
}
