# LevPlay Solana program specification

Status: **specification archive for the execution-locked SBF shell in [`../levplay-sbf`](../levplay-sbf)**.

The dependency-free `no_std` kernel in [`../levplay-core`](../levplay-core) implements checked fee, share, cap, oracle-consensus, isolation, Standby, insolvency, resumption and capacity rules. It is tested, linted with arithmetic-side-effect denial and format-checked in CI using the pinned Rust toolchain and workspace lockfile.

The repository contains a reproducibly built Solana entrypoint in [`../levplay-sbf`](../levplay-sbf). It validates selected account and transaction boundaries, then returns `EXECUTION_LOCKED_ERROR`; it performs no CPI, account mutation or value movement. The backing venue and exact CPI interface must still be admitted before value-moving layouts can be frozen.

The wallet-direct instruction contract and adversarial boundaries are documented in [INTERFACE.md](./INTERFACE.md) and [THREAT_MODEL.md](./THREAT_MODEL.md). The TypeScript reference implementation remains in [`../../lib/risk-engine.ts`](../../lib/risk-engine.ts), with adversarial vectors in [`../../tests/risk-engine.mjs`](../../tests/risk-engine.mjs). The engines and locked SBF shell are audit inputs, not evidence of a deployed or real-money-capable program.

The required program behavior, accounts, settlement rules, caps and release gates are defined in [`../../PROTOCOL_SPEC.md`](../../PROTOCOL_SPEC.md). The implementation sequence and evidence requirements are in [`../../MAINNET_LAUNCH_CHECKLIST.md`](../../MAINNET_LAUNCH_CHECKLIST.md), and the current internal review is in [`../../SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

No deployed program ID, upgrade authority, deployer key or independently audited value-moving binary exists yet. Do not configure `LEVPLAY_SVM_EXECUTION_ENABLED=true` until state transitions, exact adapters, a devnet campaign, independent audit and verified mainnet deployment all exist.
