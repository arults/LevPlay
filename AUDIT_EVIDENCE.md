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
| Backing-venue decision record | [`BACKING_VENUE_DECISION.md`](./BACKING_VENUE_DECISION.md) | Present; no venue admitted |
| Backing admission reference engine | [`lib/backing-engine.ts`](./lib/backing-engine.ts) | Present |
| Backing admission/capacity tests | [`tests/backing-engine.mjs`](./tests/backing-engine.mjs) | Present |
| Pinned Rust workspace/toolchain | [`Cargo.toml`](./Cargo.toml), [`Cargo.lock`](./Cargo.lock), [`rust-toolchain.toml`](./rust-toolchain.toml) | Present |
| Checked `no_std` Rust protocol core | [`programs/levplay-core/src/lib.rs`](./programs/levplay-core/src/lib.rs) | Present; not an SBF program |
| Fully collateralized risk-vault core | [`programs/levplay-core/src/risk_vault.rs`](./programs/levplay-core/src/risk_vault.rs), [`RISK_VAULT_V1.md`](./RISK_VAULT_V1.md) | Present; two-sided admission, capacity, settlement, independent close, FIFO queued-claim and wind-down accounting; not an SBF program |
| Rust core unit/adversarial tests | In-crate test module; CI runs test, Clippy and rustfmt | Present; 31 deterministic tests include asymmetric exits, over-redemption, FIFO queued claims, escrow release and 128 open/close sequences; instruction tests still missing |
| Solana Rust program source | — | **Missing** |
| Fixed long adapter source | — | **Missing** |
| Fixed short adapter source | — | **Missing** |
| Signed venue capacity/production terms | — | **Missing** |
| Independent emergency exit route | — | **Missing** |
| Solana/Anchor dependency lockfiles | Workspace lock present; Solana program dependencies absent | **Incomplete** |
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
