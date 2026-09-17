# LevPlay

LevPlay is a Solana-first, fail-closed infrastructure layer for daily-target leveraged tokens using Ondo public-stock and commodity-linked assets plus PreStocks and Tessera pre-IPO references. xStocks is shelved. Tessera's pinned T-OpenAI and T-Kalshi mints are available only as 2x long/short paper concepts. Transaction construction and signing remain disabled until every product's production gates are independently proven.

## Product boundary

- 15 Ondo public stocks and 5 Ondo commodity-linked ETFs with 2x, 3x and 5x long/short candidates, plus 8 catalogued PreStocks references (xAI excluded) with 2x long/short candidates: 136 isolated audit candidates. Two pinned Tessera references add four 2x paper concepts only; none is executable merely because it appears in the catalog.
- Every product is independently gated. The first external-audit canary remains isolated `AAPL2L`; short, 3x, 5x and PreStocks rollout only after their separate collateral and reviews pass.
- Wallet-direct entry with no LevPlay deposit balance: position capital moves to the isolated vault and the 0.5% fee is charged on top in one atomic transaction.
- $100-per-wallet canary cap. A $500 future order means $500 capital + $2.50 fee = $502.50 total wallet debit.
- Liquidation-free for the holder means no margin call, negative balance or wallet-level liquidation. A funded Standby floor may preserve residual NAV, but principal and recovery are not guaranteed; an unfunded gap is insolvency, never hidden as token dust.
- Provider/API/DEX display prices are never settlement authority.

## Implemented

- Original product homepage with a focused Enter app flow and a clear explanation of the holder experience.
- Complete local paper lifecycle: wallet balance, fee-on-top order review, entry, portfolio valuation, profit/loss scenarios, redemption and trade history.
- Fee-inclusive realized, unrealized and total P/L plus persisted paper cash, positions and history.
- Responsive desktop and mobile navigation, portfolio cards, history rows and three-second user feedback.
- Phantom/Backpack connection with live Solana SOL, USDC and allowlisted source-token balance reads.
- Exact source mint pinning and onchain Token-2022 metadata/extension validation are required by product admission.
- A 136-product Ondo/PreStocks audit catalog, plus four explicitly paper-only Tessera concepts, with leverage-specific fail-closed collateral and deployment manifests.
- Pyth-first settlement policy: an exact feed is required per product, plus a separately admitted and independently operated secondary onchain source; issuer APIs and DEX quotes remain display-only and no feed is inferred by ticker.
- Corporate-action, issuer-halt, Token-2022 pause and unexpected transfer-hook gates.
- Environment-driven production release lock; absent evidence blocks signing.
- Protocol-model tests, live integration checks, lint, production build and dependency audit.

## Not implemented — mainnet blockers

- Deployed LevPlay Solana program and verified build.
- Audited backing/execution adapter with contractually available leverage liquidity.
- Onchain Pyth plus an independently admitted secondary settlement account validated inside value-moving instructions.
- Independent security audit, fuzz/local-validator suite and economic stress campaign.
- Governance and guardian multisigs, a pinned multisig-owned USDC fee account, production RPC quorum and incident monitoring.
- Confirmed, audited Ondo and PreStocks adapters with sufficient market-specific leverage capital and exit liquidity.
- A separately proven short borrow/perpetual route and deterministic buy-to-cover path; the short cannot reuse the long vault.
- Jurisdiction and eligibility controls required for tokenized securities.

The application intentionally cannot be made live with environment values alone unless every required program, market, audit and release identifier is provided. See `COMPETITIVE_POSITIONING.md`, `ORACLE_ARCHITECTURE.md`, `PROTOCOL_SPEC.md`, `SECURITY_AUDIT.md`, `TREASURY_RUNBOOK.md` and `MAINNET_LAUNCH_CHECKLIST.md`.

## Validation

```bash
pnpm lint
pnpm test:protocol
pnpm test:live
pnpm test:security
pnpm test:ui
pnpm test:audit-package
pnpm audit --prod --audit-level=low
pnpm build
```

## Release configuration

Production signing requires all of the following:

- `LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON` containing the exact schema-v2 release, artifact/evidence hashes, program/config identities, separate USDC clearing, source-token and reserve vaults, and exactly `AAPL2L` plus `AAPL2S`
- `LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH` matching the byte-exact JSON above
- `LEVPLAY_SVM_VENUE_MANIFEST_JSON` with the exact Ondo programs, AAPLon mint, solver allowlist, eligibility policy, approval/audit hashes, funded collateral and independent exit domains
- `LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON` with one independently audited, funded and deployed manifest per enabled product
- `LEVPLAY_SVM_EXECUTION_ENABLED=true`

The deployment manifest hashes and cross-binds the venue and product manifests. Two RPCs must independently match the deployed SBF bytes, decoded `LVPCFG01`/`LVPMKT01` state and vault semantics. Execution still remains hard-locked in code until audited value-moving handlers exist.
