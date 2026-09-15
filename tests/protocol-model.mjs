import assert from "node:assert/strict";

const BPS = 10_000n;
const MAX_PILOT_USDC = 100_000_000n;
function fee(amount, feeBps = 50n) { return amount * feeBps / BPS; }
function entry(amount, leverage, feeBps = 50n) { const entryFee = fee(amount, feeBps); return { capital: amount, fee: entryFee, debit: amount + entryFee, exposure: amount * leverage }; }
function maxCapital(balance, feeBps = 50n) { return balance * BPS / (BPS + feeBps); }
function flooredEquity(equity, leverage, underlyingMove, side = "long", floorBps = 100) { const sign = side === "long" ? 1 : -1; return Math.max(equity * floorBps / 10_000, equity * (1 + sign * leverage * underlyingMove)); }
function guard({ primary, secondary, now, primaryAt, secondaryAt, maxAge = 30, maxDeviationBps = 100, halted = false, corporateActionAt = 0 }) {
  if (halted || primary <= 0 || secondary <= 0) return false;
  if (now - primaryAt > maxAge || now - secondaryAt > maxAge || primaryAt > now || secondaryAt > now) return false;
  if (corporateActionAt && Math.abs(now - corporateActionAt) <= 900) return false;
  return Math.abs(primary - secondary) / Math.min(primary, secondary) * 10_000 <= maxDeviationBps;
}

assert.equal(fee(100_000_000n), 500_000n);
assert.deepEqual(entry(500_000_000n, 5n), { capital: 500_000_000n, fee: 2_500_000n, debit: 502_500_000n, exposure: 2_500_000_000n });
assert.equal(maxCapital(500_000_000n), 497_512_437n);
assert.ok(entry(maxCapital(500_000_000n), 2n).debit <= 500_000_000n);
assert.equal(fee(1n), 0n);
assert.ok(MAX_PILOT_USDC === 100_000_000n);
for (const leverage of [2, 3, 5]) {
  assert.equal(flooredEquity(100, leverage, -1), 1, "a displayed 1% floor requires funded Standby value");
  assert.equal(flooredEquity(100, leverage, .1), 100 + 10 * leverage);
}
assert.equal(flooredEquity(100, 2, .1, "short"), 80);
assert.equal(flooredEquity(100, 2, -.1, "short"), 120);
assert.equal(flooredEquity(100, 2, 1, "short"), 1);
const healthy = { primary: 100, secondary: 100.5, now: 1_000, primaryAt: 990, secondaryAt: 995 };
assert.equal(guard(healthy), true);
assert.equal(guard({ ...healthy, primaryAt: 900 }), false);
assert.equal(guard({ ...healthy, secondary: 103 }), false);
assert.equal(guard({ ...healthy, halted: true }), false);
assert.equal(guard({ ...healthy, corporateActionAt: 1_100 }), false);
assert.equal(guard({ ...healthy, corporateActionAt: 2_000 }), true);

console.log("LevPlay protocol model: fee, 2x/3x/5x, funded floor and oracle checks passed");
