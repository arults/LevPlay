# LevPlay

LevPlay is a Solana-first interface and fail-closed protocol design for long, daily-target leveraged stock tokens backed by allowlisted xStocks. The current release is a Stocklana hackathon preview: live market, oracle-registry, mint and wallet reads work; transaction construction and signing remain disabled until every production gate is independently proven.

## Product boundary

- 15 curated markets: 10 stocks and 5 commodity ETFs.
- 2x, 3x and 5x long exposure models; short products stay disabled.
- 0.5% entry fee and a $100-per-wallet canary cap.
- Liquidation-free for the holder means no margin call, negative balance or wallet-level liquidation. A product share can still fall to zero.
- xStocks API prices are never settlement authority.

## Implemented

- Original product homepage with a focused Enter app flow and a clear explanation of the holder experience.
- Complete local paper lifecycle: preview wallet, order review, entry, portfolio valuation, profit/loss scenarios, redemption and trade history.
- Fee-inclusive realized, unrealized and total P/L plus persisted paper cash, positions and history.
- Responsive desktop and mobile navigation, portfolio cards, history rows and three-second user feedback.
- Phantom/Backpack connection with live Solana SOL, USDC and allowlisted xStock balance reads.
- Exact xStock mint pinning and onchain Token-2022 metadata/extension validation.
- Live xStocks asset, trading-status, multiplier and oracle-registry reads.
- Dual-provider availability gate for Pyth and Chainlink.
- Corporate-action, issuer-halt, Token-2022 pause and unexpected transfer-hook gates.
- Environment-driven production release lock; absent evidence blocks signing.
- Protocol-model tests, live integration checks, lint, production build and dependency audit.

## Not implemented — mainnet blockers

- Deployed LevPlay Solana program and verified build.
- Audited backing/execution adapter with contractually available leverage liquidity.
- Onchain Pyth and Chainlink settlement account validation inside value-moving instructions.
- Independent security audit, fuzz/local-validator suite and economic stress campaign.
- Governance and guardian multisigs, fee treasury, production RPC quorum and incident monitoring.
- Jurisdiction and eligibility controls required for tokenized securities.

The application intentionally cannot be made live with environment values alone unless every required program, market, audit and release identifier is provided. See `PROTOCOL_SPEC.md`, `SECURITY_AUDIT.md`, `TREASURY_RUNBOOK.md` and `MAINNET_LAUNCH_CHECKLIST.md`.

## Validation

```bash
pnpm lint
pnpm test:protocol
pnpm test:live
pnpm test:security
pnpm test:ui
pnpm audit --prod --audit-level=low
pnpm build
```

## Release configuration

Production signing requires all of the following:

- `LEVPLAY_SVM_PROGRAM_ID`
- `LEVPLAY_SVM_FEE_RECIPIENT`
- `LEVPLAY_SVM_GOVERNANCE_MULTISIG`
- `LEVPLAY_SVM_GUARDIAN_MULTISIG`
- `LEVPLAY_SVM_AUDIT_HASH`
- `LEVPLAY_SVM_RELEASE_HASH`
- `LEVPLAY_SVM_PROGRAM_FROZEN=true`
- `LEVPLAY_SVM_MARKETS_JSON` with audited deployments and oracle identifiers
- `LEVPLAY_SVM_EXECUTION_ENABLED=true`

These gates are necessary, not sufficient: the supplied addresses and hashes must be verified independently before enabling real-money use.
