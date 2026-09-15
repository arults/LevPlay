import assert from "node:assert/strict";

const BPS = 10_000n;
const MAX_PILOT_USDC = 100_000_000n;

function fee(amount, feeBps = 50n) { return amount * feeBps / BPS; }
function cappedEquity(equity, leverage, underlyingMove) { return Math.max(0, equity * (1 + leverage * underlyingMove)); }
function guard({ primary, secondary, now, primaryAt, secondaryAt, maxAge = 30, maxDeviationBps = 100, halted = false, corporateActionAt = 0 }) {
  if (halted || primary <= 0 || secondary <= 0) return false;
  if (now - primaryAt > maxAge || now - secondaryAt > maxAge || primaryAt > now || secondaryAt > now) return false;
  if (corporateActionAt && Math.abs(now - corporateActionAt) <= 900) return false;
  const deviation = Math.abs(primary - secondary) / Math.min(primary, secondary) * 10_000;
  return deviation <= maxDeviationBps;
}

assert.equal(fee(100_000_000n), 500_000n, "0.5% fee must be exact in USDC base units");
assert.equal(fee(1n), 0n, "fees round down and never overcharge dust");
assert.ok(MAX_PILOT_USDC === 100_000_000n, "pilot cap is exactly $100 USDC");
for (const leverage of [2, 3, 5]) {
  assert.equal(cappedEquity(100, leverage, -1), 0, "holder loss cannot exceed deposited equity");
  assert.equal(cappedEquity(100, leverage, .1), 100 + 10 * leverage, "single-period upside follows target leverage");
}
const healthy = { primary: 100, secondary: 100.5, now: 1_000, primaryAt: 990, secondaryAt: 995 };
assert.equal(guard(healthy), true, "two fresh agreeing feeds pass");
assert.equal(guard({ ...healthy, primaryAt: 900 }), false, "stale primary fails closed");
assert.equal(guard({ ...healthy, secondary: 103 }), false, "oracle disagreement fails closed");
assert.equal(guard({ ...healthy, halted: true }), false, "issuer halt fails closed");
assert.equal(guard({ ...healthy, corporateActionAt: 1_100 }), false, "corporate-action window fails closed");
assert.equal(guard({ ...healthy, corporateActionAt: 2_000 }), true, "outside action window can pass");

console.log("LevPlay protocol model: 12 invariant checks passed");
