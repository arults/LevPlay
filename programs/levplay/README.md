# LevPlay Solana program

Status: **design specified; executable program not yet implemented**.

This directory is intentionally not populated with unaudited value-moving Rust code. The backing venue and its exact CPI interface must be selected before account layouts and adapter constraints can be frozen. Writing a generic adapter first would create the arbitrary-call and account-substitution risks the protocol is designed to avoid.

The required program behavior, accounts, settlement rules, caps and release gates are defined in [`../../PROTOCOL_SPEC.md`](../../PROTOCOL_SPEC.md). The implementation sequence and evidence requirements are in [`../../MAINNET_LAUNCH_CHECKLIST.md`](../../MAINNET_LAUNCH_CHECKLIST.md), and the current review is in [`../../SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

No program ID, upgrade authority, deployer key or mainnet binary exists yet. Do not configure `LEVPLAY_SVM_EXECUTION_ENABLED=true` until a reproducible build, devnet campaign, independent audit and verified mainnet deployment all exist.
