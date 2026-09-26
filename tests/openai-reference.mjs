import assert from "node:assert/strict";
import { test } from "node:test";
import { OPENAI_SOURCES, quoteOpen, openPosition, settlePosition, closePosition } from "../lib/openai-reference.mjs";

const mark = (price, slot) => ({ price, slot, primary: true, secondary: true });
const base = (provider, side) => ({ provider, mint: OPENAI_SOURCES[provider], side,
  owner: "wallet-1", nonce: "unique-1", capital: 100_000_000n,
  capacity: 200_000_000n, expirySlot: 11n, observation: mark(100_000_000n, 10n) });

for (const provider of ["prestocks", "tessera"]) {
  for (const side of ["long", "short"]) {
    test(`${provider} OpenAI 2X ${side}: open, mark and close`, () => {
      const initial = openPosition(base(provider, side));
      assert.equal(initial.walletDebit, 100_500_000n);
      assert.equal(initial.exposure, 200_000_000n);
      assert.equal(initial.makerLocked, 200_000_000n);
      assert.equal(initial.reserveLocked, 1_000_000n);
      const favorable = side === "long" ? 110_000_000n : 90_000_000n;
      const settled = settlePosition(initial, mark(favorable, 11n));
      assert.equal(settled.nav, 120_000_000n);
      assert.equal(settled.makerLocked, 180_000_000n);
      const closed = closePosition(settled, { owner: initial.owner, nonce: initial.nonce,
        minAssets: 120_000_000n, expectedSequence: 1n });
      assert.equal(closed.payoutDue, 120_000_000n);
      assert.throws(() => closePosition(closed, { owner: initial.owner, nonce: initial.nonce,
        minAssets: 0n, expectedSequence: 1n }), /already closed/);
    });
    test(`${provider} OpenAI 2X ${side}: losing interval and floor`, () => {
      const initial = openPosition(base(provider, side));
      const losing = side === "long" ? 75_000_000n : 125_000_000n;
      assert.equal(settlePosition(initial, mark(losing, 11n)).nav, 50_000_000n);
      const floor = side === "long" ? 50_500_000n : 149_500_000n;
      const standby = settlePosition(initial, mark(floor, 11n));
      assert.equal(standby.mode, "standby");
      assert.equal(standby.nav, 1_000_000n);
      assert.equal(standby.exposure, 0n);
    });
  }
}

test("OpenAI source identity and collateral are mandatory", () => {
  assert.throws(() => quoteOpen({ ...base("prestocks", "long"), mint: OPENAI_SOURCES.tessera }), /identity/);
  assert.throws(() => quoteOpen({ ...base("tessera", "short"), capacity: 199_999_999n }), /collateral/);
  assert.throws(() => openPosition({ ...base("prestocks", "long"), expirySlot: 9n }), /expired/);
  assert.throws(() => openPosition({ ...base("prestocks", "long"), capital: 2n ** 64n }), /capital/);
});

test("oracle, replay, gap, underfunded floor and slippage fail closed", () => {
  const p = openPosition(base("prestocks", "long"));
  assert.throws(() => settlePosition(p, mark(110_000_000n, 10n)), /stale/);
  assert.throws(() => settlePosition(p, { ...mark(110_000_000n, 11n), secondary: false }), /unverified/);
  assert.throws(() => settlePosition(p, mark(201_000_000n, 11n)), /gap/);
  assert.throws(() => settlePosition(p, mark(1n, 11n)), /floor/);
  assert.throws(() => closePosition(p, { owner: "other", nonce: p.nonce,
    minAssets: 0n, expectedSequence: 0n }), /unauthorized/);
  assert.throws(() => closePosition(p, { owner: p.owner, nonce: p.nonce,
    minAssets: 100_000_001n, expectedSequence: 0n }), /slippage/);
});

test("bounded price sweep preserves defined holder loss and funding checks", () => {
  for (const provider of ["prestocks", "tessera"])
    for (const side of ["long", "short"])
      for (let percent = 51; percent <= 150; percent += 1) {
        const p = openPosition(base(provider, side));
        const price = BigInt(percent) * 1_000_000n;
        try {
          const next = settlePosition(p, mark(price, 11n));
          assert.ok(next.nav >= 0n && next.nav <= 300_000_000n);
          assert.ok(next.makerLocked >= 0n && next.reserveLocked >= 0n);
          if (next.mode === "standby") assert.equal(next.exposure, 0n);
        } catch (error) {
          assert.match(error.message, /unfunded floor|unfunded gain/);
        }
      }
});
