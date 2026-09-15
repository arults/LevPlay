import assert from "node:assert/strict";
import { assessBackingPlan, capacityAction } from "../lib/backing-engine.ts";

const route = (overrides = {}) => ({
  name: "Audited route A",
  kind: "funded-spot",
  programId: "Program1111111111111111111111111111111111",
  marketAccount: "Market11111111111111111111111111111111111",
  collateralAccount: "Vault11111111111111111111111111111111111",
  failureDomain: "operator-a",
  productionApproved: true,
  independentlyAudited: true,
  fixedAccounts: true,
  nonRecourse: true,
  recallable: false,
  supportsForcedUnwind: true,
  committedCapacity: 200_000_000n,
  unwindCapacity: 200_000_000n,
  lockedLossCollateral: 0n,
  maximumLoss: 0n,
  maximumSlippageBps: 50n,
  maximumFundingBps: 50n,
  commitmentExpirySlot: 2_000_000n,
  ...overrides,
});

const longPlan = (overrides = {}) => ({
  side: "long",
  leverage: 2,
  capitalCap: 100_000_000n,
  standbyFloor: 1_000_000n,
  externalRiskCapital: 115_000_000n,
  stressGapBps: 500n,
  unwindCostBps: 100n,
  fundingBuffer: 1_000_000n,
  minimumCommitmentExpirySlot: 1_500_000n,
  maximumAllowedSlippageBps: 100n,
  maximumAllowedFundingBps: 100n,
  primary: route(),
  emergencyExit: route({
    name: "Audited route B",
    programId: "Program2222222222222222222222222222222222",
    marketAccount: "Market22222222222222222222222222222222222",
    collateralAccount: "Vault22222222222222222222222222222222222",
    failureDomain: "operator-b",
  }),
  ...overrides,
});

const admittedLong = assessBackingPlan(longPlan());
assert.equal(admittedLong.admitted, true, admittedLong.reasons.join("; "));
assert.equal(admittedLong.targetExposure, 200_000_000n, "2L target is twice capital");
assert.equal(admittedLong.requiredReserve, 4_000_000n, "floor, unwind cost and buffer are additive");
assert.equal(admittedLong.maximumMintCapital, 100_000_000n, "cap remains inside funding and exit capacity");

const spotOnly = assessBackingPlan(longPlan({ externalRiskCapital: 0n }));
assert.equal(spotOnly.admitted, false, "1:1 spot inventory alone cannot create a fully funded 2L");
assert.ok(spotOnly.reasons.some((reason) => reason.includes("double-counts or underfunds")));

const doubleCounted = assessBackingPlan(longPlan({ externalRiskCapital: 113_999_999n }));
assert.equal(doubleCounted.admitted, false, "capital buying exposure cannot also count as the liquid reserve");

const sharedFailure = assessBackingPlan(longPlan({ emergencyExit: route() }));
assert.equal(sharedFailure.admitted, false, "a duplicate route is not redundancy");
assert.ok(sharedFailure.reasons.some((reason) => reason.includes("failure domains")));

const recallable = assessBackingPlan(longPlan({ primary: route({ recallable: true }) }));
assert.equal(recallable.admitted, false, "recallable financing can force backing liquidation");

const unapproved = assessBackingPlan(longPlan({ primary: route({ productionApproved: false }) }));
assert.equal(unapproved.admitted, false, "code must not infer venue approval");

const unboundedShort = assessBackingPlan({
  ...longPlan(),
  side: "short",
  primary: route({ kind: "bounded-derivative", maximumLoss: null, lockedLossCollateral: 500_000_000n }),
});
assert.equal(unboundedShort.admitted, false, "unbounded stock short loss is never admissible");
assert.ok(unboundedShort.reasons.includes("short route has unbounded loss"));

const boundedShort = assessBackingPlan({
  ...longPlan(),
  side: "short",
  primary: route({ kind: "bounded-derivative", maximumLoss: 100_000_000n, lockedLossCollateral: 104_000_000n }),
});
assert.equal(boundedShort.admitted, true, boundedShort.reasons.join("; "));

const underfundedShort = assessBackingPlan({
  ...longPlan(),
  side: "short",
  primary: route({ kind: "bounded-derivative", maximumLoss: 100_000_000n, lockedLossCollateral: 103_999_999n }),
});
assert.equal(underfundedShort.admitted, false, "short maximum loss and reserve must be locked in full");

const degraded = capacityAction({ activeExposure: 150n, requestedMintExposure: 10n, primaryCapacity: 155n, unwindCapacity: 100n });
assert.equal(degraded.mintAllowed, false, "new mint stops when capacity degrades");
assert.equal(degraded.unwindAllowed, true, "degraded capacity must still be usable for exits");
assert.equal(degraded.maximumImmediateUnwind, 100n, "partial unwind is bounded by live exit capacity");

const exhausted = capacityAction({ activeExposure: 150n, requestedMintExposure: 0n, primaryCapacity: 200n, unwindCapacity: 0n });
assert.equal(exhausted.mintAllowed, false, "no exit capacity means no new risk");
assert.equal(exhausted.unwindAllowed, false, "zero capacity is disclosed rather than simulated");

for (let active = 0n; active <= 255n; active += 1n) {
  const live = capacityAction({ activeExposure: active, requestedMintExposure: 17n, primaryCapacity: 200n, unwindCapacity: 151n });
  assert.equal(live.mintAllowed, active + 17n <= 200n && active <= 151n, "mint boundary is deterministic");
  assert.ok(live.maximumImmediateUnwind <= active && live.maximumImmediateUnwind <= 151n, "unwind never exceeds exposure or capacity");
}

console.log("LevPlay backing engine: 11 fixed cases and 256 capacity-boundary vectors passed");
