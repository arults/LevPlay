export type SourceProvider = "ondo" | "prestocks";
export type AssetClass = "stock" | "commodity" | "pre-ipo";
export type Direction = "L" | "S";
export type Leverage = 2 | 3 | 5;

export type SourceAsset = {
  provider: SourceProvider;
  symbol: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  publishedMint?: string;
  sourceUrl: string;
};

const ondo = (symbol: string, ticker: string, name: string, assetClass: "stock" | "commodity", publishedMint?: string): SourceAsset => ({
  provider: "ondo", symbol, ticker, name, assetClass, publishedMint,
  sourceUrl: `https://app.ondo.finance/assets/${symbol.toLowerCase()}`,
});

const prestock = (symbol: string, ticker: string, name: string, publishedMint: string): SourceAsset => ({
  provider: "prestocks", symbol, ticker, name, assetClass: "pre-ipo", publishedMint,
  sourceUrl: "https://prestocks.com/products",
});

export const ONDO_STOCKS = [
  ondo("AAPLon", "AAPL", "Apple", "stock", "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo"),
  ondo("MSFTon", "MSFT", "Microsoft", "stock"),
  ondo("NVDAon", "NVDA", "NVIDIA", "stock"),
  ondo("GOOGLon", "GOOGL", "Alphabet Class A", "stock"),
  ondo("AMZNon", "AMZN", "Amazon", "stock"),
  ondo("TSLAon", "TSLA", "Tesla", "stock"),
  ondo("AMDon", "AMD", "AMD", "stock"),
  ondo("NFLXon", "NFLX", "Netflix", "stock"),
  ondo("SPYon", "SPY", "SPDR S&P 500 ETF", "stock"),
  ondo("DISon", "DIS", "Disney", "stock"),
  ondo("UBERon", "UBER", "Uber", "stock"),
  ondo("HOODon", "HOOD", "Robinhood Markets", "stock"),
  ondo("SOFIon", "SOFI", "SoFi Technologies", "stock"),
  ondo("ORCLon", "ORCL", "Oracle", "stock"),
  ondo("QQQon", "QQQ", "Invesco QQQ", "stock"),
] as const satisfies readonly SourceAsset[];

// These are commodity-linked exchange-traded products, not physical commodities.
export const ONDO_COMMODITIES = [
  ondo("GLDon", "GLD", "SPDR Gold Shares", "commodity"),
  ondo("SLVon", "SLV", "iShares Silver Trust", "commodity"),
  ondo("PPLTon", "PPLT", "abrdn Physical Platinum Shares ETF", "commodity"),
  ondo("USOon", "USO", "United States Oil Fund", "commodity"),
  ondo("COPXon", "COPX", "Global X Copper Miners ETF", "commodity"),
] as const satisfies readonly SourceAsset[];

export const PRESTOCKS = [
  prestock("ANTHROPIC", "ANTH", "Anthropic", "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw"),
  prestock("OPENAI", "OPENAI", "OpenAI", "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF"),
  prestock("ANDURIL", "ANDURIL", "Anduril", "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB"),
  prestock("NEURALINK", "NEURAL", "Neuralink", "PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S"),
  prestock("FIGUREAI", "FIGURE", "Figure AI", "PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd"),
  prestock("KALSHI", "KALSHI", "Kalshi", "PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua"),
  prestock("POLYMARKET", "POLY", "Polymarket", "Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP"),
  prestock("SPACEX", "SPACEX", "SpaceX", "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh"),
] as const satisfies readonly SourceAsset[];

export const PRESTOCKS_CATALOG_SNAPSHOT = {
  observedAt: "2026-09-15",
  sourceUrl: "https://prestocks.com/products",
  productCount: 8,
  excludedSymbols: ["XAI"],
  symbols: PRESTOCKS.map((asset) => asset.symbol),
} as const;

export const SOURCE_ASSETS = [...ONDO_STOCKS, ...ONDO_COMMODITIES, ...PRESTOCKS] as const;
export const XSTOCKS_STATE = "candidate-read-only" as const;

export type ProductCandidate = SourceAsset & {
  id: string;
  leverage: Leverage;
  direction: Direction;
  state: "candidate";
};

function products(asset: SourceAsset): ProductCandidate[] {
  const leverages: Leverage[] = asset.provider === "prestocks" ? [2] : [2, 3, 5];
  return leverages.flatMap((leverage) => (["L", "S"] as const).map((direction) => ({
    ...asset, id: `${asset.ticker}${leverage}${direction}`, leverage, direction, state: "candidate" as const,
  })));
}

export const PRODUCT_CANDIDATES = SOURCE_ASSETS.flatMap(products);

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HASH = /^(?:0x)?[a-fA-F0-9]{64}$/;

export type ProductAdmissionManifest = {
  productId: string;
  provider: SourceProvider;
  sourceSymbol: string;
  sourceMint: string;
  productMint: string;
  marketPda: string;
  collateralVault: string;
  feeVault: string;
  primaryOracle: string;
  secondaryOracle: string;
  primaryOracleProviderId: string;
  secondaryOracleProviderId: string;
  sourceRegistryHash: string;
  providerApprovalHash: string;
  legalApprovalHash: string;
  productAuditHash: string;
  economicAuditHash: string;
  auditorRetestHash: string;
  deploymentHash: string;
  eligibilityPolicyHash: string;
  aggregateCapitalCap: bigint;
  perWalletCapitalCap: bigint;
  makerLongCapital: bigint;
  shortGainCollateral: bigint;
  standbyFloorReserve: bigint;
  maximumRedemptionLiability: bigint;
  independentExitLiquidity: bigint;
  minimumNavBps: number;
  maxOracleAgeSeconds: number;
  maxOracleDeviationBps: number;
  maxOracleConfidenceBps: number;
  permissionlessClose: boolean;
  isolatedCollateral: boolean;
  usesBorrowOrMargin: boolean;
  mintsDisabledOnHalt: boolean;
  permissionlessRebalance: boolean;
  sourceOutageMode: "close-only-pro-rata";
  rpcDomains: string[];
  rpcProviderIds: string[];
  keeperAuthorities: string[];
  keeperOperatorIds: string[];
  governanceMultisig: string;
  guardianMultisig: string;
  governanceSigners: string[];
  guardianSigners: string[];
  governanceThreshold: number;
  guardianThreshold: number;
  primaryExitOperator: string;
  emergencyExitOperator: string;
  primaryExitOperatorId: string;
  emergencyExitOperatorId: string;
  upgradeDelaySeconds: number;
  expiresAtUnix: number;
};

export type ProductAdmission = { admitted: boolean; productId: string | null; reasons: string[] };

export function assessProductAdmission(manifest: ProductAdmissionManifest, nowUnix: number): ProductAdmission {
  const reasons: string[] = [];
  const product = PRODUCT_CANDIDATES.find((item) => item.id === manifest.productId);
  if (!product) return { admitted: false, productId: manifest.productId || null, reasons: ["product is outside the reviewed catalog"] };
  if (manifest.provider !== product.provider || manifest.sourceSymbol !== product.symbol) reasons.push("source provider or symbol mismatch");
  if (!BASE58.test(manifest.sourceMint)) reasons.push("source mint is not pinned");
  if (product.publishedMint && manifest.sourceMint !== product.publishedMint) reasons.push("source mint differs from the published pin");
  for (const [label, value] of [
    ["product mint", manifest.productMint], ["market PDA", manifest.marketPda],
    ["collateral vault", manifest.collateralVault], ["fee vault", manifest.feeVault],
    ["primary oracle", manifest.primaryOracle], ["secondary oracle", manifest.secondaryOracle],
  ]) if (!BASE58.test(value)) reasons.push(`${label} is not pinned`);
  if (manifest.primaryOracle === manifest.secondaryOracle) reasons.push("oracle accounts are not independent");
  if (!manifest.primaryOracleProviderId.trim() || !manifest.secondaryOracleProviderId.trim() || manifest.primaryOracleProviderId === manifest.secondaryOracleProviderId) reasons.push("oracle providers are not independent");
  for (const [label, value] of [
    ["source registry", manifest.sourceRegistryHash], ["provider approval", manifest.providerApprovalHash],
    ["legal approval", manifest.legalApprovalHash], ["product audit", manifest.productAuditHash],
    ["economic audit", manifest.economicAuditHash], ["auditor retest", manifest.auditorRetestHash],
    ["deployment", manifest.deploymentHash], ["eligibility policy", manifest.eligibilityPolicyHash],
  ]) if (!HASH.test(value)) reasons.push(`${label} hash is missing`);
  if (manifest.aggregateCapitalCap <= 0n || manifest.perWalletCapitalCap <= 0n || manifest.perWalletCapitalCap > manifest.aggregateCapitalCap) reasons.push("capital caps are invalid");
  const requiredLong = BigInt(product.leverage - 1) * manifest.aggregateCapitalCap;
  const requiredShort = BigInt(product.leverage) * manifest.aggregateCapitalCap;
  if (product.direction === "L" && manifest.makerLongCapital < requiredLong) reasons.push("maker long capital is below full target exposure");
  if (product.direction === "S" && manifest.shortGainCollateral < requiredShort) reasons.push("short gain collateral is below maximum bounded payout");
  if (!Number.isInteger(manifest.minimumNavBps) || manifest.minimumNavBps < 1 || manifest.minimumNavBps > 100) reasons.push("minimum NAV floor must be between 1 and 100 bps");
  const requiredFloor = manifest.aggregateCapitalCap * BigInt(manifest.minimumNavBps) / 10_000n;
  if (manifest.standbyFloorReserve < requiredFloor) reasons.push("Standby reserve cannot fund the configured NAV floor");
  if (manifest.maximumRedemptionLiability < manifest.aggregateCapitalCap) reasons.push("maximum redemption liability is below deposited capital");
  if (manifest.independentExitLiquidity < manifest.maximumRedemptionLiability) reasons.push("independent exit liquidity is below maximum redemption liability");
  if (!Number.isInteger(manifest.maxOracleAgeSeconds) || manifest.maxOracleAgeSeconds < 1 || manifest.maxOracleAgeSeconds > 60) reasons.push("oracle freshness bound exceeds 60 seconds");
  if (!Number.isInteger(manifest.maxOracleDeviationBps) || manifest.maxOracleDeviationBps < 1 || manifest.maxOracleDeviationBps > 100) reasons.push("oracle deviation bound exceeds 100 bps");
  if (!Number.isInteger(manifest.maxOracleConfidenceBps) || manifest.maxOracleConfidenceBps < 1 || manifest.maxOracleConfidenceBps > 100) reasons.push("oracle confidence bound exceeds 100 bps");
  if (!manifest.permissionlessClose) reasons.push("holder exits are permissioned");
  if (!manifest.isolatedCollateral) reasons.push("product collateral is shared");
  if (manifest.usesBorrowOrMargin) reasons.push("holder product depends on liquidatable borrow or margin");
  if (!manifest.mintsDisabledOnHalt) reasons.push("new mints remain possible during a halt");
  if (!manifest.permissionlessRebalance) reasons.push("rebalancing depends on privileged keepers");
  if (manifest.sourceOutageMode !== "close-only-pro-rata") reasons.push("source outage does not force close-only pro-rata mode");
  if (manifest.rpcDomains.length < 3 || new Set(manifest.rpcDomains).size !== manifest.rpcDomains.length || manifest.rpcDomains.some((domain) => !domain.trim())) reasons.push("fewer than three independent RPC domains are pinned");
  if (manifest.rpcProviderIds.length !== manifest.rpcDomains.length || new Set(manifest.rpcProviderIds).size < 3 || manifest.rpcProviderIds.some((provider) => !provider.trim())) reasons.push("RPC endpoints do not span three independent providers");
  if (manifest.keeperAuthorities.length < 3 || new Set(manifest.keeperAuthorities).size !== manifest.keeperAuthorities.length || manifest.keeperAuthorities.some((authority) => !BASE58.test(authority))) reasons.push("keeper set lacks three independent authorities");
  if (manifest.keeperOperatorIds.length !== manifest.keeperAuthorities.length || new Set(manifest.keeperOperatorIds).size < 3 || manifest.keeperOperatorIds.some((operator) => !operator.trim())) reasons.push("keeper authorities do not span three independent operators");
  for (const [label, value] of [
    ["governance multisig", manifest.governanceMultisig], ["guardian multisig", manifest.guardianMultisig],
    ["primary exit operator", manifest.primaryExitOperator], ["emergency exit operator", manifest.emergencyExitOperator],
  ]) if (!BASE58.test(value)) reasons.push(`${label} is not pinned`);
  if (manifest.governanceMultisig === manifest.guardianMultisig) reasons.push("governance and guardian share one authority");
  const validSignerSet = (signers: string[]) => signers.length >= 3 && new Set(signers).size === signers.length && signers.every((signer) => BASE58.test(signer));
  if (!validSignerSet(manifest.governanceSigners) || !validSignerSet(manifest.guardianSigners)) reasons.push("multisig signer sets are not independently pinned");
  if (manifest.governanceSigners.some((signer) => manifest.guardianSigners.includes(signer))) reasons.push("governance and guardian signer sets overlap");
  if (!Number.isSafeInteger(manifest.governanceThreshold) || manifest.governanceThreshold < 2 || manifest.governanceThreshold > manifest.governanceSigners.length) reasons.push("governance threshold is unsafe");
  if (!Number.isSafeInteger(manifest.guardianThreshold) || manifest.guardianThreshold < 2 || manifest.guardianThreshold > manifest.guardianSigners.length) reasons.push("guardian threshold is unsafe");
  if (manifest.primaryExitOperator === manifest.emergencyExitOperator) reasons.push("primary and emergency exits share one authority");
  if (!manifest.primaryExitOperatorId.trim() || !manifest.emergencyExitOperatorId.trim() || manifest.primaryExitOperatorId === manifest.emergencyExitOperatorId) reasons.push("primary and emergency exits share one operator");
  if (!Number.isSafeInteger(manifest.upgradeDelaySeconds) || manifest.upgradeDelaySeconds < 172_800) reasons.push("program upgrades lack a two-day minimum delay");
  if (!Number.isSafeInteger(manifest.expiresAtUnix) || manifest.expiresAtUnix <= nowUnix) reasons.push("product admission is expired");
  return { admitted: reasons.length === 0, productId: product.id, reasons };
}

export function catalogSummary() {
  return {
    ondoStocks: ONDO_STOCKS.length,
    ondoCommodities: ONDO_COMMODITIES.length,
    prestocks: PRESTOCKS.length,
    products: PRODUCT_CANDIDATES.length,
    xStocks: XSTOCKS_STATE,
  };
}

function bigint(value: unknown) {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) throw new Error("invalid integer string");
  return BigInt(value);
}

export function parseProductManifest(source: Record<string, unknown>): ProductAdmissionManifest {
  const strings = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
  return {
    productId: String(source.productId || ""), provider: String(source.provider || "") as SourceProvider,
    sourceSymbol: String(source.sourceSymbol || ""), sourceMint: String(source.sourceMint || ""),
    productMint: String(source.productMint || ""), marketPda: String(source.marketPda || ""),
    collateralVault: String(source.collateralVault || ""), feeVault: String(source.feeVault || ""),
    primaryOracle: String(source.primaryOracle || ""), secondaryOracle: String(source.secondaryOracle || ""),
    primaryOracleProviderId: String(source.primaryOracleProviderId || ""), secondaryOracleProviderId: String(source.secondaryOracleProviderId || ""),
    sourceRegistryHash: String(source.sourceRegistryHash || ""), providerApprovalHash: String(source.providerApprovalHash || ""),
    legalApprovalHash: String(source.legalApprovalHash || ""), productAuditHash: String(source.productAuditHash || ""),
    economicAuditHash: String(source.economicAuditHash || ""), auditorRetestHash: String(source.auditorRetestHash || ""),
    deploymentHash: String(source.deploymentHash || ""), eligibilityPolicyHash: String(source.eligibilityPolicyHash || ""),
    aggregateCapitalCap: bigint(source.aggregateCapitalCap), perWalletCapitalCap: bigint(source.perWalletCapitalCap),
    makerLongCapital: bigint(source.makerLongCapital), shortGainCollateral: bigint(source.shortGainCollateral),
    standbyFloorReserve: bigint(source.standbyFloorReserve), maximumRedemptionLiability: bigint(source.maximumRedemptionLiability),
    independentExitLiquidity: bigint(source.independentExitLiquidity), minimumNavBps: Number(source.minimumNavBps),
    maxOracleAgeSeconds: Number(source.maxOracleAgeSeconds), maxOracleDeviationBps: Number(source.maxOracleDeviationBps),
    maxOracleConfidenceBps: Number(source.maxOracleConfidenceBps), permissionlessClose: source.permissionlessClose === true,
    isolatedCollateral: source.isolatedCollateral === true, usesBorrowOrMargin: source.usesBorrowOrMargin === true,
    mintsDisabledOnHalt: source.mintsDisabledOnHalt === true, permissionlessRebalance: source.permissionlessRebalance === true,
    sourceOutageMode: String(source.sourceOutageMode || "") as "close-only-pro-rata", rpcDomains: strings(source.rpcDomains),
    rpcProviderIds: strings(source.rpcProviderIds), keeperAuthorities: strings(source.keeperAuthorities),
    keeperOperatorIds: strings(source.keeperOperatorIds), governanceMultisig: String(source.governanceMultisig || ""),
    guardianMultisig: String(source.guardianMultisig || ""), governanceSigners: strings(source.governanceSigners),
    guardianSigners: strings(source.guardianSigners), governanceThreshold: Number(source.governanceThreshold),
    guardianThreshold: Number(source.guardianThreshold), primaryExitOperator: String(source.primaryExitOperator || ""),
    emergencyExitOperator: String(source.emergencyExitOperator || ""), primaryExitOperatorId: String(source.primaryExitOperatorId || ""),
    emergencyExitOperatorId: String(source.emergencyExitOperatorId || ""), upgradeDelaySeconds: Number(source.upgradeDelaySeconds),
    expiresAtUnix: Number(source.expiresAtUnix),
  };
}

export function productStatusFromEnvironment(nowUnix = Math.floor(Date.now() / 1_000)) {
  try {
    const encoded = process.env.LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON;
    if (!encoded) return { admitted: false, productIds: [] as string[], reasons: ["product admission manifests are missing"] };
    const parsed = JSON.parse(encoded) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty product manifest set");
    const ids = new Set<string>();
    const results = parsed.map((item) => {
      if (!item || typeof item !== "object") throw new Error("invalid product manifest");
      const result = assessProductAdmission(parseProductManifest(item as Record<string, unknown>), nowUnix);
      if (result.productId && ids.has(result.productId)) result.reasons.push("duplicate product manifest");
      if (result.productId) ids.add(result.productId);
      return result;
    });
    const reasons = results.flatMap((result) => result.reasons.map((reason) => `${result.productId || "unknown"}: ${reason}`));
    return { admitted: reasons.length === 0, productIds: [...ids], reasons };
  } catch {
    return { admitted: false, productIds: [] as string[], reasons: ["product admission manifests are invalid"] };
  }
}
