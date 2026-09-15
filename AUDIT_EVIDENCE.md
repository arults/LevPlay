# LevPlay audit evidence index

Every row must link to immutable evidence for the same release commit. `Missing` is a release blocker, not an invitation to infer completion.

| Evidence | Current artifact | State |
|---|---|---|
| Product/economic specification | [`PROTOCOL_SPEC.md`](./PROTOCOL_SPEC.md) | Present |
| Instruction/account contract | [`programs/levplay/INTERFACE.md`](./programs/levplay/INTERFACE.md) | Present |
| Threat model | [`programs/levplay/THREAT_MODEL.md`](./programs/levplay/THREAT_MODEL.md) | Present |
| Security invariants | [`SECURITY_INVARIANTS.md`](./SECURITY_INVARIANTS.md) | Present |
| Audit scope | [`AUDIT_SCOPE.md`](./AUDIT_SCOPE.md) | Present |
| Deployment manifest schema | [`audit/deployment-manifest.schema.json`](./audit/deployment-manifest.schema.json) | Present |
| TypeScript release-gate tests | [`tests/source-security.mjs`](./tests/source-security.mjs) | Present |
| Economic model tests | [`tests/protocol-model.mjs`](./tests/protocol-model.mjs) | Present |
| Standby reference engine | [`lib/risk-engine.ts`](./lib/risk-engine.ts) | Present |
| Standby/adversarial vectors | [`tests/risk-engine.mjs`](./tests/risk-engine.mjs) | Present |
| Solana Rust program source | — | **Missing** |
| Fixed long adapter source | — | **Missing** |
| Fixed short adapter source | — | **Missing** |
| Cargo/Anchor lockfiles | — | **Missing** |
| Reproducible SBF/IDL/SBOM | — | **Missing** |
| Local-validator/property/fuzz evidence | — | **Missing** |
| Devnet deployment and test ledger | — | **Missing** |
| Independent security report/retest | — | **Missing** |
| Independent economic/oracle review | — | **Missing** |
| Multisig/RPC/keeper operations evidence | — | **Missing** |
| Legal/eligibility approval | — | **Missing** |

## Evidence rules

- Screenshots, environment values and self-authored statements do not satisfy onchain or independent gates.
- Test output must identify the source commit, toolchain, seed and binary hash.
- Audit findings remain open until a remediation commit and auditor retest are linked.
- Mainnet addresses must be independently reproduced from chain state through at least two RPC providers.
- Secrets, seed phrases, private keys and private RPC credentials must never be committed.
- A Standby floor is evidenced only by a unique onchain reserve vault, its canonical-USDC balance, the exact liabilities/supply snapshot and an independent solvency attestation for the release hash.
