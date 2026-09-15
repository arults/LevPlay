# LevPlay Solana program

Status: **compiled Rust protocol core implemented; executable Solana program not yet implemented**.

The dependency-free `no_std` kernel is in [`../levplay-core`](../levplay-core). It implements checked fee, share, cap, oracle-consensus, isolation, Standby, insolvency, resumption and capacity rules. It is compiled, tested, linted with arithmetic-side-effect denial and format-checked in CI using the pinned Rust toolchain and workspace lockfile.

This directory is intentionally not populated with an unaudited value-moving Solana entrypoint. The backing venue and its exact CPI interface must be selected before account layouts and adapter constraints can be frozen. Writing a generic adapter first would create the arbitrary-call and account-substitution risks the protocol is designed to avoid.

The wallet-direct instruction contract and adversarial boundaries are frozen at the specification level in [INTERFACE.md](./INTERFACE.md) and [THREAT_MODEL.md](./THREAT_MODEL.md). The TypeScript reference implementation remains in [`../../lib/risk-engine.ts`](../../lib/risk-engine.ts), with adversarial vectors in [`../../tests/risk-engine.mjs`](../../tests/risk-engine.mjs). The Rust and TypeScript engines are audit inputs, not evidence that an SBF program exists.

The required program behavior, accounts, settlement rules, caps and release gates are defined in [`../../PROTOCOL_SPEC.md`](../../PROTOCOL_SPEC.md). The implementation sequence and evidence requirements are in [`../../MAINNET_LAUNCH_CHECKLIST.md`](../../MAINNET_LAUNCH_CHECKLIST.md), and the current review is in [`../../SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

No Solana entrypoint, program ID, upgrade authority, deployer key or SBF binary exists yet. Do not configure `LEVPLAY_SVM_EXECUTION_ENABLED=true` until a reproducible SBF build, devnet campaign, independent audit and verified mainnet deployment all exist.
