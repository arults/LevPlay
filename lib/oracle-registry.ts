/**
 * Settlement policy for LevPlay pre-IPO markets.
 *
 * Provider APIs and DEX prices are useful discovery signals, never settlement
 * authority. Each product must pin two independently operated onchain sources
 * that provide timestamps and can be parsed by the frozen SBF program.
 */
export const PRESTOCKS_REFERENCE = {
  provider: "PreStocks",
  displayApiIsOracle: false,
  identityEndpoint: "https://prestocks.com/api/prestocks",
  status: "display-only",
} as const;

export const TESSERA_REFERENCE = {
  provider: "Tessera",
  displayApiIsOracle: false,
  identityEndpoint: "https://rest-api.tessera.pe/v1/public/token-details",
  status: "display-only",
} as const;

export const ORACLE_POLICY = {
  primaryPreference: "pyth",
  requiredIndependentSources: 2,
  maxAgeSeconds: 60,
  maxDeviationBps: 100,
  maxConfidenceBps: 100,
  displayOnlyProviderIds: ["prestocks-api", "prestocks-dex", "tessera-api"],
  unselectedProviders: ["chainlink"],
} as const;

export function isDisplayOnlyProvider(providerId: string) {
  return ORACLE_POLICY.displayOnlyProviderIds.includes(providerId as (typeof ORACLE_POLICY.displayOnlyProviderIds)[number]);
}

export type SettlementSource = {
  provider: string;
  verifierProgramId: string;
  feedId: string;
  productionVerified: boolean;
};

export function assessSettlementGate(sources: readonly SettlementSource[]) {
  const admitted = sources.filter((source) => source.productionVerified && source.provider && source.verifierProgramId && source.feedId);
  const independentProviders = new Set(admitted.map((source) => source.provider));
  const ready = admitted.length === ORACLE_POLICY.requiredIndependentSources && independentProviders.size === ORACLE_POLICY.requiredIndependentSources;
  return {
    ready,
    verifiedSources: admitted.length,
    requiredSources: ORACLE_POLICY.requiredIndependentSources,
    reasons: ready ? [] : ["two independent timestamped onchain settlement sources are not production-pinned for this pre-IPO product"],
  };
}

export const ANTHROPIC_SETTLEMENT_GATE = {
  requiredIndependentSources: ORACLE_POLICY.requiredIndependentSources,
  sources: [] as SettlementSource[],
} as const;

export function assessAnthropicSettlementGate() {
  return assessSettlementGate(ANTHROPIC_SETTLEMENT_GATE.sources);
}
