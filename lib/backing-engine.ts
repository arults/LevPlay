/**
 * Deterministic pre-admission model for a LevPlay backing route.
 *
 * Values are integer USDC base units. This module does not authorize a venue:
 * it proves that a proposed, independently evidenced configuration satisfies
 * the minimum economic constraints before it may enter an audited manifest.
 */
export const BACKING_BPS = 10_000n;

export type BackingSide = "long" | "short";
export type BackingKind = "funded-spot" | "bounded-derivative";

export type BackingRoute = {
  name: string;
  kind: BackingKind;
  programId: string;
  marketAccount: string;
  collateralAccount: string;
  failureDomain: string;
  productionApproved: boolean;
  independentlyAudited: boolean;
  fixedAccounts: boolean;
  nonRecourse: boolean;
  recallable: boolean;
  supportsForcedUnwind: boolean;
  committedCapacity: bigint;
  unwindCapacity: bigint;
  lockedLossCollateral: bigint;
  maximumLoss: bigint | null;
  maximumSlippageBps: bigint;
  maximumFundingBps: bigint;
  commitmentExpirySlot: bigint;
};

export type BackingPlan = {
  side: BackingSide;
  leverage: 2 | 3;
  capitalCap: bigint;
  standbyFloor: bigint;
  externalRiskCapital: bigint;
  stressGapBps: bigint;
  unwindCostBps: bigint;
  fundingBuffer: bigint;
  minimumCommitmentExpirySlot: bigint;
  maximumAllowedSlippageBps: bigint;
  maximumAllowedFundingBps: bigint;
  primary: BackingRoute;
  emergencyExit: BackingRoute;
};

export type BackingAssessment = {
  admitted: boolean;
  targetExposure: bigint;
  requiredReserve: bigint;
  maximumMintCapital: bigint;
  reasons: string[];
};

function checkedBps(value: bigint, name: string) {
  if (value < 0n || value > BACKING_BPS) throw new Error(`${name} must be between 0 and 10,000 bps`);
}

function isPinned(route: BackingRoute) {
  return route.programId.trim().length > 0 && route.marketAccount.trim().length > 0 && route.collateralAccount.trim().length > 0;
}

function minimum(values: bigint[]) {
  return values.reduce((lowest, value) => value < lowest ? value : lowest);
}

export function assessBackingPlan(plan: BackingPlan): BackingAssessment {
  if (plan.capitalCap <= 0n || plan.standbyFloor < 0n || plan.externalRiskCapital < 0n || plan.fundingBuffer < 0n) {
    throw new Error("invalid backing amounts");
  }
  checkedBps(plan.stressGapBps, "stressGapBps");
  checkedBps(plan.unwindCostBps, "unwindCostBps");
  checkedBps(plan.maximumAllowedSlippageBps, "maximumAllowedSlippageBps");
  checkedBps(plan.maximumAllowedFundingBps, "maximumAllowedFundingBps");

  const reasons: string[] = [];
  const targetExposure = plan.capitalCap * BigInt(plan.leverage);
  const unwindCost = (targetExposure * plan.unwindCostBps + BACKING_BPS - 1n) / BACKING_BPS;
  const gapLoss = (targetExposure * plan.stressGapBps + BACKING_BPS - 1n) / BACKING_BPS;
  const requiredReserve = plan.standbyFloor + unwindCost + plan.fundingBuffer;
  const additionalExposureFunding = targetExposure - plan.capitalCap;

  for (const [label, route] of [["primary", plan.primary], ["emergency", plan.emergencyExit]] as const) {
    if (route.committedCapacity < 0n || route.unwindCapacity < 0n || route.lockedLossCollateral < 0n || (route.maximumLoss !== null && route.maximumLoss < 0n) || route.commitmentExpirySlot < 0n) {
      throw new Error(`${label} route contains a negative amount`);
    }
    checkedBps(route.maximumSlippageBps, `${label}.maximumSlippageBps`);
    checkedBps(route.maximumFundingBps, `${label}.maximumFundingBps`);
    if (!isPinned(route) || !route.fixedAccounts) reasons.push(`${label} route accounts are not fixed`);
    if (!route.productionApproved) reasons.push(`${label} route lacks production approval`);
    if (!route.independentlyAudited) reasons.push(`${label} route lacks independent audit evidence`);
    if (!route.nonRecourse || route.recallable) reasons.push(`${label} route can create a margin call or recalled funding`);
    if (!route.supportsForcedUnwind) reasons.push(`${label} route cannot execute a deterministic forced unwind`);
    if (route.committedCapacity < targetExposure) reasons.push(`${label} committed capacity is below target exposure`);
    if (route.unwindCapacity < targetExposure) reasons.push(`${label} unwind capacity is below target exposure`);
    if (route.commitmentExpirySlot < plan.minimumCommitmentExpirySlot) reasons.push(`${label} commitment expires before the wind-down horizon`);
    if (route.maximumSlippageBps > plan.maximumAllowedSlippageBps) reasons.push(`${label} slippage exceeds the configured bound`);
    if (route.maximumFundingBps > plan.maximumAllowedFundingBps) reasons.push(`${label} funding exceeds the configured bound`);
  }

  if (plan.primary.failureDomain.trim().length === 0 || plan.emergencyExit.failureDomain.trim().length === 0 || plan.primary.failureDomain === plan.emergencyExit.failureDomain) {
    reasons.push("primary and emergency routes do not have independent failure domains");
  }
  if (plan.primary.programId === plan.emergencyExit.programId && plan.primary.marketAccount === plan.emergencyExit.marketAccount) {
    reasons.push("emergency route duplicates the primary program and market");
  }
  if (plan.primary.collateralAccount === plan.emergencyExit.collateralAccount) reasons.push("primary and emergency routes share collateral custody");

  if (plan.side === "long") {
    if (plan.primary.kind !== "funded-spot") reasons.push("long route is not a funded spot route");
    if (plan.externalRiskCapital < additionalExposureFunding + gapLoss + requiredReserve) {
      reasons.push("long risk capital double-counts or underfunds exposure, gap and reserves");
    }
  } else {
    if (plan.primary.kind !== "bounded-derivative") reasons.push("short route is not a bounded derivative");
    if (plan.primary.maximumLoss === null) reasons.push("short route has unbounded loss");
    else if (plan.primary.lockedLossCollateral < plan.primary.maximumLoss + requiredReserve) reasons.push("short loss collateral does not cover maximum loss and reserves");
  }

  const primaryCapitalCapacity = plan.primary.committedCapacity / BigInt(plan.leverage);
  const exitCapitalCapacity = plan.emergencyExit.unwindCapacity / BigInt(plan.leverage);
  const leverage = BigInt(plan.leverage);
  const longCapitalDenominator = (leverage - 1n) * BACKING_BPS + leverage * plan.stressGapBps;
  const fundedStressCapitalCapacity = plan.side === "long" && plan.externalRiskCapital > requiredReserve
    ? (plan.externalRiskCapital - requiredReserve) * BACKING_BPS / longCapitalDenominator
    : plan.capitalCap;
  const maximumMintCapital = minimum([
    plan.capitalCap,
    primaryCapitalCapacity,
    exitCapitalCapacity,
    fundedStressCapitalCapacity,
  ]);

  return { admitted: reasons.length === 0, targetExposure, requiredReserve, maximumMintCapital, reasons };
}

/** New mints stop before exits when live capacity falls. */
export function capacityAction(input: {
  activeExposure: bigint;
  requestedMintExposure: bigint;
  primaryCapacity: bigint;
  unwindCapacity: bigint;
}) {
  if (Object.values(input).some((value) => value < 0n)) throw new Error("capacity values cannot be negative");
  return {
    mintAllowed: input.activeExposure + input.requestedMintExposure <= input.primaryCapacity && input.activeExposure <= input.unwindCapacity,
    unwindAllowed: input.activeExposure > 0n && input.unwindCapacity > 0n,
    maximumImmediateUnwind: input.activeExposure < input.unwindCapacity ? input.activeExposure : input.unwindCapacity,
  };
}
