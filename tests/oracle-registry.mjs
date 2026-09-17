import assert from "node:assert/strict";
import {
  AAPL_SETTLEMENT_GATE,
  ONDO_SETTLEMENT,
  PYTH_SOLANA,
  assessAaplSettlementGate,
} from "../lib/oracle-registry.ts";

assert.match(PYTH_SOLANA.receiverProgramId, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
assert.match(PYTH_SOLANA.pushOracleProgramId, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
assert.match(PYTH_SOLANA.aaplFeedId, /^[a-f0-9]{64}$/);
assert.equal(PYTH_SOLANA.symbol, "Equity.US.AAPL/USD");

assert.equal(ONDO_SETTLEMENT.displayApiIsOracle, false);
assert.equal(ONDO_SETTLEMENT.officialOracleStatus, "not-published");
assert.equal(AAPL_SETTLEMENT_GATE.requiredIndependentSources, 2);
assert.equal(AAPL_SETTLEMENT_GATE.sources[1].productionVerified, false);

const result = assessAaplSettlementGate();
assert.equal(result.ready, false);
assert.equal(result.verifiedSources, 1);
assert.deepEqual(result.reasons, ["second independent Solana AAPL verifier/feed is not production-pinned"]);

console.log("oracle registry fail-closed tests passed");
