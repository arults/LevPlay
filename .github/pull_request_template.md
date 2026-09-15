## Change

Describe the behavior and why it is needed.

## Security boundary

- [ ] No secrets, seed phrases, private keys or private RPC credentials are included.
- [ ] Account, signer, writable, mint, oracle, adapter and recipient changes are listed explicitly.
- [ ] Economic effects, rounding, caps and failure behavior are documented.
- [ ] Long and short market isolation is preserved.
- [ ] New external dependencies and trust assumptions are documented.
- [ ] Tests include positive, negative and adversarial cases.
- [ ] `pnpm test:protocol`, `pnpm test:security`, `pnpm test:ui`, `pnpm test:audit-package`, lint, build and production audit pass.
- [ ] Mainnet execution remains locked unless the exact audited release evidence is complete.

## Evidence

Link test output, deployment evidence, audit finding or design decision. Screenshots alone do not satisfy onchain gates.
