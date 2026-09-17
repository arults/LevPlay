# LevPlay audit evidence index

Every row must link to immutable evidence for the same release commit. `Missing` is a release blocker, not an invitation to infer completion.

| Evidence | Current artifact | State |
|---|---|---|
| Product/economic specification | [`PROTOCOL_SPEC.md`](./PROTOCOL_SPEC.md) | Present |
| Instruction/account contract | [`programs/levplay/INTERFACE.md`](./programs/levplay/INTERFACE.md), [`PROGRAM_BOUNDARY.md`](./PROGRAM_BOUNDARY.md) | Present; wire format and open-account boundary frozen at core level |
| Threat model | [`programs/levplay/THREAT_MODEL.md`](./programs/levplay/THREAT_MODEL.md) | Present |
| Security invariants | [`SECURITY_INVARIANTS.md`](./SECURITY_INVARIANTS.md) | Present |
| Audit scope | [`AUDIT_SCOPE.md`](./AUDIT_SCOPE.md) | Present |
| Deployment manifest schema | [`audit/deployment-manifest.schema.json`](./audit/deployment-manifest.schema.json) | Present; current Ondo source boundary plus source/SBF/IDL/SBOM/toolchain hashes required |
| TypeScript release-gate tests | [`tests/source-security.mjs`](./tests/source-security.mjs) | Present |
| Release artifact evidence generator | [`lib/release-evidence.mjs`](./lib/release-evidence.mjs), [`scripts/generate-release-evidence.mjs`](./scripts/generate-release-evidence.mjs), [`tests/release-evidence.mjs`](./tests/release-evidence.mjs) | Present; rejects missing, empty, oversized, duplicated or unpinned inputs |
| Economic model tests | [`tests/protocol-model.mjs`](./tests/protocol-model.mjs) | Present |
| Standby reference engine | [`lib/risk-engine.ts`](./lib/risk-engine.ts) | Present |
| Standby/adversarial vectors | [`tests/risk-engine.mjs`](./tests/risk-engine.mjs) | Present |
| Backing-venue decision record | [`BACKING_VENUE_DECISION.md`](./BACKING_VENUE_DECISION.md) | Present; no venue admitted |
| Backing admission reference engine | [`lib/backing-engine.ts`](./lib/backing-engine.ts) | Present |
| Backing admission/capacity tests | [`tests/backing-engine.mjs`](./tests/backing-engine.mjs) | Present |
| Pinned Rust/Solana workspace | [`Cargo.toml`](./Cargo.toml), [`Cargo.lock`](./Cargo.lock), [`rust-toolchain.toml`](./rust-toolchain.toml), [`programs/levplay-sbf/Cargo.toml`](./programs/levplay-sbf/Cargo.toml) | Present; Solana dependency is exactly pinned and locked |
| Checked `no_std` Rust protocol core | [`programs/levplay-core/src/lib.rs`](./programs/levplay-core/src/lib.rs) | Present; not an SBF program |
| Fully collateralized risk-vault core | [`programs/levplay-core/src/risk_vault.rs`](./programs/levplay-core/src/risk_vault.rs), [`RISK_VAULT_V1.md`](./RISK_VAULT_V1.md) | Present; two-sided admission, capacity, settlement, independent close, FIFO queued-claim and wind-down accounting; not an SBF program |
| Rust core and SBF-shell tests | In-crate test modules; CI runs test, Clippy and rustfmt | Present; 45 core tests plus 7 SBF boundary/entrypoint tests include asymmetric exits, FIFO claims, strict decoding/account layouts, transaction composition, nonces and 128 open/close sequences |
| Canonical program-owned state layouts | [`programs/levplay-core/src/state_accounts.rs`](./programs/levplay-core/src/state_accounts.rs), [`PROGRAM_STATE_V1.md`](./PROGRAM_STATE_V1.md) | Present; strict 208-byte config and 296-byte market decoders reject bad versions, lengths, reserved bytes, bounds, zero and aliased addresses |
| SBF ownership/PDA validators | [`programs/levplay-sbf/src/account_validation.rs`](./programs/levplay-sbf/src/account_validation.rs) | Present; config/market loaders require program ownership, exact flags/length and identity-bound canonical PDAs |
| Solana Rust program source | [`programs/levplay-sbf/src/lib.rs`](./programs/levplay-sbf/src/lib.rs) | Present as executable fail-closed shell; value-moving handlers remain missing |
| Fixed long adapter source | — | **Missing** |
| Fixed short adapter source | — | **Missing** |
| Signed venue capacity/production terms | — | **Missing** |
| Independent emergency exit route | — | **Missing** |
| Solana dependency lockfile | [`Cargo.lock`](./Cargo.lock) | Present; generated and retested by CI from exact `solana-program = 2.2.0` constraint |
| Reproducible SBF/IDL/SBOM | [SBF workflow run `35005124622`](https://github.com/arults/LevPlay/actions/runs/35005124622), artifact digest `sha256:338c7f825f21679493bed893ec94cb37159722fa8e25f5e5212b09ab4438c22f`; binary SHA-256 `049111b10631459b6c8735e58bf70c73995a8f146ea1f2891da615a435534c27` | SBF shell present; IDL, SBOM, source archive and independent reproduction still missing |
| Local-validator/property/fuzz evidence | — | **Missing** |
| Devnet deployment and test ledger | — | **Missing** |
| Independent security report/retest | — | **Missing** |
| Independent economic/oracle review | — | **Missing** |
| Multisig/RPC/keeper operations evidence | — | **Missing** |
| Legal/eligibility approval | — | **Missing** |
| Versioned eligibility/risk UX prototype | [`ELIGIBILITY_AND_RISK_GATE.md`](./ELIGIBILITY_AND_RISK_GATE.md), [`app/trade/page.tsx`](./app/trade/page.tsx) | Present as a client acknowledgement prototype only; it is not a security boundary. Counsel approval, wallet-signed evidence and independent authoritative enforcement remain **Missing** |

## Evidence rules

- Screenshots, environment values and self-authored statements do not satisfy onchain or independent gates.
- Test output must identify the source commit, toolchain, seed and binary hash.
- Audit findings remain open until a remediation commit and auditor retest are linked.
- Mainnet addresses must be independently reproduced from chain state through at least two RPC providers.
- Secrets, seed phrases, private keys and private RPC credentials must never be committed.
- A Standby floor is evidenced only by a unique onchain reserve vault, its canonical-USDC balance, the exact liabilities/supply snapshot and an independent solvency attestation for the release hash.
