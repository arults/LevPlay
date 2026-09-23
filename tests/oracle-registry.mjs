import assert from "node:assert/strict";
import { ANTHROPIC_SETTLEMENT_GATE, ORACLE_POLICY, assessAnthropicSettlementGate, assessSettlementGate, isDisplayOnlyProvider } from "../lib/oracle-registry.ts";

assert.equal(ORACLE_POLICY.requiredIndependentSources, 2);
assert.equal(isDisplayOnlyProvider("prestocks-api"), true);
assert.equal(isDisplayOnlyProvider("tessera-api"), true);
assert.equal(isDisplayOnlyProvider("pyth"), false);
assert.equal(ANTHROPIC_SETTLEMENT_GATE.sources.length, 0);
assert.equal(assessAnthropicSettlementGate().ready, false);
assert.equal(assessSettlementGate([
  { provider: "pyth", verifierProgramId: "p", feedId: "a", productionVerified: true },
  { provider: "independent", verifierProgramId: "q", feedId: "b", productionVerified: true },
]).ready, true);
assert.equal(assessSettlementGate([
  { provider: "pyth", verifierProgramId: "p", feedId: "a", productionVerified: true },
  { provider: "pyth", verifierProgramId: "q", feedId: "b", productionVerified: true },
]).ready, false);
console.log("LevPlay oracle registry: display isolation and two-provider settlement gate passed");
