import assert from "node:assert/strict";
import { entryFee, initialVault, oracleAgreement, resumeFromStandby, settleInterval } from "../lib/risk-engine.ts";

assert.equal(entryFee(500_000_000n), 2_500_000n, "entry fee is exactly 0.5% on capital");
assert.equal(settleInterval(initialVault({ capital: 100_000_000n, side: "long", leverage: 2 }), 1_000n).state.nav, 120_000_000n, "2L gains 20% on a 10% interval");
assert.equal(settleInterval(initialVault({ capital: 100_000_000n, side: "short", leverage: 3 }), 1_000n).state.nav, 70_000_000n, "3S loses 30% on a 10% interval");
assert.equal(settleInterval(initialVault({ capital: 100_000_000n, side: "short", leverage: 2 }), -1_000n).state.nav, 120_000_000n, "2S gains 20% on a negative 10% interval");

const unsupported = settleInterval(initialVault({ capital: 100_000_000n, side: "long", leverage: 2 }), -5_000n);
assert.equal(unsupported.state.mode, "insolvent", "a label cannot hide an unfunded floor");
assert.equal(unsupported.state.nav, 0n, "unbacked dust must not be fabricated");
assert.equal(unsupported.uncoveredDeficit, 1_000_000n, "the complete missing floor is disclosed");

const protectedVault = settleInterval(initialVault({ capital: 100_000_000n, reserve: 1_000_000n, side: "long", leverage: 2 }), -5_000n);
assert.equal(protectedVault.state.mode, "standby", "funded floor enters standby");
assert.equal(protectedVault.state.nav, 1_000_000n, "real reserve collateral preserves the 1% floor");
assert.equal(protectedVault.state.exposure, 0n, "standby removes directional exposure");
assert.equal(protectedVault.state.reserve, 0n, "reserve draw is accounted exactly once");
const frozen = settleInterval(protectedVault.state, 2_000n);
assert.equal(frozen.state.nav, protectedVault.state.nav, "standby cannot claim recovery from an oracle-only move");
assert.equal(frozen.state.exposure, 0n, "standby remains unexposed until explicit recapitalization");
const resumed = resumeFromStandby(protectedVault.state, 2_000_000n);
assert.equal(resumed.nav, 3_000_000n, "recapitalization increases NAV exactly once");
assert.equal(resumed.exposure, 6_000_000n, "resumption restores only target exposure");

const goodOracle = { primary: 10_000n, secondary: 10_050n, primaryAgeSeconds: 5n, secondaryAgeSeconds: 8n, primaryConfidenceBps: 20n, secondaryConfidenceBps: 30n, minimumPublishersMet: true, halted: false, marketOpen: true };
assert.equal(oracleAgreement(goodOracle), true, "fresh agreeing feeds pass");
assert.equal(oracleAgreement({ ...goodOracle, marketOpen: false }), false, "closed reference market fails closed");
assert.equal(oracleAgreement({ ...goodOracle, secondary: 10_500n }), false, "deviating feeds fail closed");
assert.equal(oracleAgreement({ ...goodOracle, primaryAgeSeconds: 31n }), false, "stale feed fails closed");

for (const side of ["long", "short"]) for (const leverage of [2, 3]) for (let move = -10_000; move <= 10_000; move += 137) {
  const result = settleInterval(initialVault({ capital: 100_000_000n, reserve: 25_000_000n, side, leverage }), BigInt(move));
  assert.ok(result.state.nav >= 0n && result.state.reserve >= 0n, "NAV and reserve never become negative");
  assert.ok(result.reserveDraw <= 25_000_000n, "reserve draw is bounded by funded assets");
  if (result.state.mode !== "active") assert.equal(result.state.exposure, 0n, "non-active states cannot retain exposure");
}

console.log("LevPlay risk engine: deterministic Standby/oracle cases and 588 adversarial interval vectors passed");
