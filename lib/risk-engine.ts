/**
 * Deterministic reference model for LevPlay's onchain risk engine.
 *
 * All monetary values are integer USDC base units and all ratios are basis
 * points. This module deliberately contains no floating point arithmetic so
 * its vectors can be shared with the Solana implementation and auditors.
 */
export const BPS = 10_000n;
export const ENTRY_FEE_BPS = 50n;
export const DEFAULT_STANDBY_BPS = 100n;

export type VaultMode = "active" | "standby" | "paused" | "insolvent" | "wind-down";

export type VaultState = {
  mode: VaultMode;
  side: "long" | "short";
  leverageBps: 20_000n | 30_000n;
  nav: bigint;
  referenceNav: bigint;
  exposure: bigint;
  reserve: bigint;
  standbyBps: bigint;
  epoch: bigint;
};

export type Settlement = {
  state: VaultState;
  pnl: bigint;
  reserveDraw: bigint;
  uncoveredDeficit: bigint;
};

const abs = (value: bigint) => value < 0n ? -value : value;

export function entryFee(capital: bigint) {
  if (capital <= 0n) throw new Error("capital must be positive");
  return capital * ENTRY_FEE_BPS / BPS;
}

export function initialVault(input: {
  capital: bigint;
  reserve?: bigint;
  leverage: 2 | 3;
  side: "long" | "short";
  standbyBps?: bigint;
}): VaultState {
  if (input.capital <= 0n || (input.reserve ?? 0n) < 0n) throw new Error("invalid collateral");
  const leverageBps = BigInt(input.leverage) * BPS as 20_000n | 30_000n;
  return {
    mode: "active",
    side: input.side,
    leverageBps,
    nav: input.capital,
    referenceNav: input.capital,
    exposure: input.capital * BigInt(input.leverage),
    reserve: input.reserve ?? 0n,
    standbyBps: input.standbyBps ?? DEFAULT_STANDBY_BPS,
    epoch: 0n,
  };
}

/** Settles one bounded oracle interval. `moveBps` is signed reference return. */
export function settleInterval(current: VaultState, moveBps: bigint): Settlement {
  if (current.mode !== "active") return { state: current, pnl: 0n, reserveDraw: 0n, uncoveredDeficit: 0n };
  if (abs(moveBps) > BPS) throw new Error("invalid reference move");

  const direction = current.side === "long" ? 1n : -1n;
  const pnl = current.exposure * moveBps * direction / BPS;
  const rawNav = current.nav + pnl;
  const floor = (current.referenceNav * current.standbyBps + BPS - 1n) / BPS;
  const required = rawNav < floor ? floor - rawNav : 0n;
  const reserveDraw = required > current.reserve ? current.reserve : required;
  const coveredNav = rawNav + reserveDraw;
  const uncoveredDeficit = coveredNav < floor ? floor - coveredNav : 0n;
  const nav = coveredNav > 0n ? coveredNav : 0n;
  const exhausted = nav < floor;
  const standby = !exhausted && rawNav <= floor;
  const mode: VaultMode = exhausted ? "insolvent" : standby ? "standby" : "active";
  const leverage = current.leverageBps / BPS;

  return {
    pnl,
    reserveDraw,
    uncoveredDeficit,
    state: {
      ...current,
      mode,
      nav,
      exposure: mode === "active" ? nav * leverage : 0n,
      reserve: current.reserve - reserveDraw,
      epoch: current.epoch + 1n,
    },
  };
}

/**
 * Standby is exited only through an explicit, capped recapitalization. Merely
 * changing a displayed oracle price cannot manufacture exposure or value.
 */
export function resumeFromStandby(current: VaultState, recapitalization: bigint): VaultState {
  if (current.mode !== "standby") throw new Error("vault is not in standby");
  if (recapitalization <= 0n) throw new Error("recapitalization required");
  const nav = current.nav + recapitalization;
  const leverage = current.leverageBps / BPS;
  return { ...current, mode: "active", nav, referenceNav: nav, exposure: nav * leverage, reserve: current.reserve, epoch: current.epoch + 1n };
}

export function oracleAgreement(input: {
  primary: bigint;
  secondary: bigint;
  primaryAgeSeconds: bigint;
  secondaryAgeSeconds: bigint;
  primaryConfidenceBps: bigint;
  secondaryConfidenceBps: bigint;
  minimumPublishersMet: boolean;
  halted: boolean;
  marketOpen: boolean;
  maxAgeSeconds?: bigint;
  maxDeviationBps?: bigint;
  maxConfidenceBps?: bigint;
}) {
  const maxAge = input.maxAgeSeconds ?? 30n;
  const maxDeviation = input.maxDeviationBps ?? 100n;
  const maxConfidence = input.maxConfidenceBps ?? 100n;
  if (input.halted || !input.marketOpen || !input.minimumPublishersMet || input.primary <= 0n || input.secondary <= 0n) return false;
  if (input.primaryAgeSeconds < 0n || input.secondaryAgeSeconds < 0n || input.primaryAgeSeconds > maxAge || input.secondaryAgeSeconds > maxAge) return false;
  if (input.primaryConfidenceBps > maxConfidence || input.secondaryConfidenceBps > maxConfidence) return false;
  const denominator = input.primary < input.secondary ? input.primary : input.secondary;
  return abs(input.primary - input.secondary) * BPS / denominator <= maxDeviation;
}
