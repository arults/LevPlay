# LevPlay Solana mainnet GO checklist

Status date: 2026-09-17. **GO means every Critical gate below has independently reproducible evidence for the exact release hash.** A configuration value, screenshot, preview result or internal review cannot satisfy a Critical gate. The application unlocks signing only when its machine-readable release checks also pass.

The audit-facing [value-movement architecture](./docs/VALUE_MOVEMENT_ARCHITECTURE.md)
defines the required state, account boundary, atomic `Open`/`Close` invariants, oracle and
session gates, long/short collateral distinction and evidence sequence. It is a design and
does not satisfy any unchecked gate below.

## Priority execution order

1. **Backing and solvency:** select the exact long/short venue, adapter accounts, capacity, funding and deterministic unwind model for isolated `AAPL2L`/`AAPL2S`.
2. **Executable Solana program:** implement the frozen interface against that adapter, then produce reproducible SBF/IDL/SBOM artifacts.
3. **Adversarial proof and independent audit:** local-validator, property, fuzz, differential and economic tests; external Solana audit and retest.
4. **Production control plane:** governance/guardian/treasury multisigs, three RPC providers, permissionless keepers, monitoring and wind-down drills.
5. **Legal launch controls:** counsel approval, eligibility/sanctions/geofence rules, issuer permissions, market-data rights and customer disclosures.
6. **Capped mainnet canary:** $1,000 aggregate across audited `AAPL2L` and `AAPL2S`, reconciliation, seven-day observation and explicit multisig GO vote.

Catalog expansion is not a launch-gate substitute. The auditable catalog contains 136 Ondo/PreStocks candidate definitions; none is executable merely because it appears in the catalog. Two pinned Tessera references add four 2x paper concepts only and do not expand the audit scope. xStocks and Hong Kong products are shelved. Every product remains signing-disabled until separately admitted after the initial canary.

## Current completion

| Gate | Severity | Current evidence | State |
|---|---:|---|---|
| Wallet-direct fee-on-top flow | Critical | UI/model: $500 capital + $2.50 fee = $502.50 debit; Max reserves fee | Passed at model/UI level |
| Funded Standby model | Critical | Integer reference engine plus 588 adversarial long/short intervals; fake dust fails insolvent | Passed at model level |
| Backing admission model | Critical | Fixed-account admission checks plus the Rust LevPlay Risk Vault v1 core for paired exposure, contingency escrow, expiry, caps, settlement, independent close, FIFO queued claims and orderly wind-down | Passed at economic-core level; no onchain instance admitted |
| Rust protocol kernel | Critical | Pinned Rust 1.85 `no_std` core; 45 unit/adversarial tests, Clippy arithmetic denial and rustfmt in CI | Passed at core level; not an SBF program |
| Read-only market and wallet verification | High | Frozen 15-stock, 5-commodity and 8-PreStocks audit catalog plus two paper-only Tessera references; pinned known mints, Token-2022 checks, oracle registry and mainnet genesis | Passed at read-only level |
| Executable Solana program | Critical | Pinned Rust entrypoint and reproducible SBF shell exist; all valid instructions intentionally return the execution-lock error and cannot move funds | In progress; value-moving handlers and deployment pending |
| Leverage backing venue | Critical | Ondo and PreStocks source routes researched; no audited long adapter or separately proven prepaid short route/capacity | Pending |
| Independent program audit and retest | Critical | Internal source review only | Pending |
| Governance, guardian and fee multisigs | Critical | Runbook exists; addresses and signers not supplied | Pending |
| Mainnet RPC/authority quorum | Critical | Fail-closed verifier implemented; production endpoints/accounts not configured | Pending |
| Legal eligibility and launch controls | Critical | Risk disclosure exists; counsel/eligibility implementation absent | Pending |

## A. Product and solvency — Critical

- [x] Define “liquidation-free” as no holder margin account, negative balance or seizure of other wallet assets; disclose that principal and recovery are not guaranteed.
- [x] Define Standby as zero exposure at a genuinely funded residual-NAV floor; never treat token decimals or a displayed minimum as collateral.
- [x] Charge 50 basis points only on opening position capital and add it on top; no LevPlay deposit/withdrawal fee.
- [x] Start with wallet USDC, one signature and no persistent LevPlay cash balance.
- [x] Freeze the audit scope to isolated `AAPL2L` and `AAPL2S` markets, $100 per wallet and $1,000 aggregate; 3×, 5×, commodities and other tickers remain disabled.
- [x] Select LevPlay Risk Vault v1 as the canary venue architecture and freeze its economic admission model.
- [x] Select Ondo Stocks on Solana as the candidate AAPL2L spot route; pin the published GM program, Jupiter Order Engine, AAPLon mint, Token-2022 program and solver set.
- [x] Add a fail-closed venue-manifest gate covering legal eligibility, explicit wrapper approval, audit/retest, collateral, expiry and independent exits.
- [x] Define 136 independently gated audit candidates: 15 Ondo stocks and 5 commodity-linked ETFs at 2x/3x/5x L/S, plus 8 catalogued PreStocks references at 2x L/S; explicitly exclude xAI; keep the four Tessera variants paper-only; shelf xStocks and HK products.
- [x] Encode leverage-specific long capital, bounded short payout collateral, real Standby floor, maximum redemption liability and independent exit liquidity.
- [x] Encode independent long/short closes, owner-bound FIFO queued-claim liabilities and maker-escrow release only after empty, fully paid wind-down.
- [x] Require three RPC domains, three keepers plus permissionless rebalance, distinct multisigs and exit operators, 48-hour upgrades and close-only pro-rata source-outage mode.
- [ ] Implement and admit the exact SBF risk-vault program, accounts and fixed hedge adapters for the canary market.
- [x] Encode fail-closed venue admission rules for pinned accounts, non-recourse funding, committed capacity, bounded short loss and an independent emergency exit.
- [ ] Obtain written production access, limits, uptime terms and unwind procedures from that venue.
- [ ] Obtain written Ondo approval for program-controlled AAPLon inventory inside LevPlay's leveraged wrapper and production API/attestation access.
- [ ] Obtain written PreStocks wrapper/integration permission, issuer-signed Solana mint registry, source-control disclosure and production halt/redemption procedures.
- [ ] Prove short borrow/perpetual capacity, bounded funding and deterministic buy-to-cover without sharing the long vault or solvency pool.
- [ ] Prove committed liquidity covers the TVL cap plus gap, borrow/funding and unwind stress buffers.
- [ ] Fund each market's isolated USDC Standby reserve and independently attest that the configured floor is covered under the approved gap model.
- [ ] Define funding, borrow, spread, rebalance, corporate-action and bad-debt attribution in NAV.
- [ ] Independent quantitative review signs off on gap, halt, volatility drag and insolvency scenarios.
- [ ] Demonstrate solvent wind-down with the backing venue unavailable.

## B. Solana program — Critical

- [x] Compile and test a dependency-free `no_std` Rust kernel for fees, shares, caps, oracle agreement, isolation, Standby, insolvency and capacity.
- [x] Freeze and test the versioned wire format, exact open-account layout, top-level transaction composition and nonce rules in the dependency-free core.
- [x] Compile the frozen ABI decoder behind a pinned Solana entrypoint that remains deliberately execution-locked.
- [ ] Implement the frozen [instruction interface](./programs/levplay/INTERFACE.md) and [value-movement architecture](./docs/VALUE_MOVEMENT_ARCHITECTURE.md) with program-owned state and value-moving handlers; `Open` and `Close` must reach the audit boundary together.
- [x] Freeze exact versioned config and market byte layouts with strict initialization, reserved-byte, bounds and address-isolation checks.
- [x] Enforce program ownership, exact privileges and canonical identity-bound config/market PDA seeds and bumps in SBF loaders.
- [x] Freeze execution-locked state-v2 audit-candidate layouts that separate immutable market identity from writable market accounting, paired risk-vault accounting and per-wallet positions; strict encoders/decoders and PDA role loaders exist, but are intentionally not wired into dispatch or the release verifier.
- [ ] Isolate backing, reserve, fee, position and claim accounting PDAs and bind their token-account authorities.
- [ ] Use checked integer arithmetic and explicit decimal/exponent normalization; no floats.
- [ ] Enforce capital, fee, wallet, transaction, TVL, daily mint and daily redemption caps onchain.
- [x] Separate and pin USDC settlement and product-token program identities in state and the exact open-account boundary.
- [ ] Parse and pin every mint, token account/extension, oracle, fee recipient, treasury owner, adapter program, adapter market and writable account in SBF.
- [ ] Reject arbitrary CPI data and remaining accounts; validate every CPI pre/post balance delta and minimum output.
- [ ] Prevent duplicate initialization, replay, account substitution, reinitialization, PDA spoofing, type confusion and close-authority abuse.
- [ ] Burn shares before redemption assets leave the vault; preserve FIFO claims when immediate liquidity is unavailable.
- [ ] Make rebalancing permissionless, deterministic and non-custodial; emergency action may only lower absolute exposure.
- [ ] Implement `enter_standby` and `resume_from_standby`; prove Standby has zero exposure and cannot resume from an oracle-only price change.
- [x] Require source/SBF/IDL/SBOM/toolchain hashes in the deployment schema and provide a fail-closed artifact hashing CLI.
- [x] Produce a checksum-pinned Agave v4.2.1 SBF shell build; CI run `35005124622` emitted binary SHA-256 `049111b10631459b6c8735e58bf70c73995a8f146ea1f2891da615a435534c27` without a keypair.
- [ ] Produce the final value-moving SBF, IDL, SBOM, source archive and independently matched binary hashes.
- [ ] Deploy and verify devnet, then mainnet program/account IDs; freeze the audited canary release or use an audited timelocked upgrade path.

## C. Atomic wallet execution — Critical

- [x] Model `capital + floor(capital × 50 / 10,000)` as total wallet debit.
- [x] Make Max compute capital after reserving the entry fee.
- [x] Include the entry fee in realized and unrealized P/L cost basis.
- [x] Display position capital, fee, total debit, target exposure, fee account and treasury owner before signing.
- [ ] Build the transaction only from a signed/frozen deployment manifest; never accept critical accounts from the browser.
- [ ] Simulate immediately before signature at the same commitment/blockhash context.
- [ ] Decode and compare every instruction, signer, writable account, program, mint, amount and recipient against the quote.
- [ ] Prove atomic rollback by forcing failure at capital transfer, fee transfer, adapter action and share mint/burn.
- [ ] Reject expired blockhash/quote, reused nonce, altered account order, extra instruction and unexpected address lookup table.
- [ ] Confirm open mints to and close returns USDC to the same signing wallet unless an explicit audited delegate flow is used.

## D. Oracles and source providers — Critical

- [x] Pin the published Ondo AAPLon Solana mint and require authenticated source-registry hashes plus independent onchain verification for every additional mint.
- [x] Keep PreStocks and all non-AAPL products blocked until exact source mints and two independent settlement sources are admitted.
- [ ] Verify both oracle account owners and feed IDs inside every value-moving instruction.
- [ ] Enforce publish time, confidence, publisher count and cross-feed deviation onchain.
- [ ] Test exponent and scaled-UI multiplier changes using raw integer fixtures.
- [ ] Test scheduled and surprise corporate actions, market halts and issuer pause/freeze/permanent-delegate actions.
- [ ] Obtain Ondo and PreStocks production onboarding and confirm program-controlled vault and leveraged-wrapper permission.
- [ ] Treat each issuer/API/DEX route as an external trust boundary; prove close-only pro-rata wind-down and funded exits without one hot key, API, RPC, keeper or frontend.

## E. Adversarial verification and independent audit — Critical

- [x] Frontend/source fail-closed checks, protocol arithmetic model, live public-integration checks, lint and production build exist.
- [ ] Rust unit tests cover every instruction, constraint and error branch.
- [ ] Local-validator integration tests use real Token-2022 extensions, oracle fixtures and a faithful backing adapter.
- [ ] Property tests prove NAV/share conservation, fee ceiling, rounding, caps and zero-supply transitions.
- [x] Reference-model vectors prove non-negative accounting, bounded reserve draws, zero Standby exposure and explicit insolvency when a floor is unfunded.
- [ ] Fuzz account order, duplicate accounts, writable flags, mints, decimals, oracle values, CPI returns, nonces and state transitions.
- [ ] Differential tests compare the economic model to program execution over randomized sequences.
- [ ] Stress gaps, stale feeds, halts, congestion, failed keepers, unavailable RPCs and unavailable backing liquidity.
- [ ] Solana-specialist independent audit covers the exact release commit and binary; all Critical/High findings are fixed.
- [ ] Auditor retest confirms fixes and published report/hash; a second independent review covers economic/oracle design.
- [ ] Public bug bounty with safe harbor and funded severity-based rewards is live before the public rollout.

## F. No-single-point-of-failure operations — Critical

- [ ] Create distinct governance, pause-only guardian and fee-treasury multisigs with hardware signers across organizations/regions.
- [ ] Pin and onchain-verify the multisig program, account owners, canonical USDC fee account and treasury authority.
- [ ] Document quorum, 48-hour governance timelock, signer replacement, key loss and emergency procedures.
- [ ] Configure at least three independent paid Solana RPC providers; require two agreeing finalized observations for release status.
- [ ] Run at least three permissionless keeper operators across clouds/regions with no custody authority.
- [ ] Reconcile assets, liabilities, shares, exposure and fees continuously from independent indexers/RPCs.
- [ ] Alert on oracle deviation, missed rebalance, NAV drift, vault imbalance, cap use, halt/pause and authority changes.
- [ ] Operate a public status page and tested incident communications; complete RPC, signer, keeper, issuer and venue game days.
- [ ] Prove emergency redemption and orderly wind-down without the frontend, one RPC, one keeper or one administrator.

## G. Application, infrastructure and legal — Critical

- [x] Minimal responsive homepage, trade, portfolio/history and three-second error notices are implemented.
- [x] CSP, frame denial, MIME sniffing, referrer and browser-permission policies are configured.
- [x] Current release has no transaction submission path and fails closed when evidence is absent.
- [ ] Add production wallet transaction construction/signing only after Sections A–F pass.
- [ ] External frontend/wallet penetration test, domain/DNS monitoring, WAF/rate limits and signed release provenance pass.
- [ ] Protect GitHub `main`: require pull requests, two independent reviewers, passing quality/security checks, signed commits, linear history, and block force-push/deletion.
- [ ] Counsel approves tokenized-securities, derivatives, commodities and jurisdiction design.
- [ ] Eligibility, sanctions, geofence, investor restrictions, market-data rights, terms, privacy and risk disclosures are implemented and tested.
- [ ] 24/7 incident owners, support escalation, insurance and financial/operational runbooks are active.

## H. Capped mainnet progression — Critical

- [ ] Internal aggregate $1,000 end-to-end canary across isolated `AAPL2L` and `AAPL2S` using the audited frozen program, with no wallet above $100.
- [ ] Reconcile every instruction, share, backing asset, fee and redemption independently.
- [ ] Complete seven incident-free days including at least one scheduled rebalance and one successful wind-down drill.
- [ ] Multisig records an explicit GO vote referencing the program ID, release hash, audit hash, caps and rollback plan.
- [ ] Invite a small cohort under the same aggregate TVL cap; expand only after another reviewed observation window.
- [ ] Do not open to 1,000 users, raise caps, or enable 3×/5×/short until separate audit and risk votes pass.

## Machine release rule

The `/api/protocol` gate requires one byte-exact schema-v2 release manifest and two independent Solana mainnet RPCs. The manifest cross-binds the exact venue/product admission JSON, source/SBF/IDL/SBOM/toolchain hashes, separate clearing/source/reserve vaults and exactly `AAPL2L` plus `AAPL2S`. Each RPC must reproduce the frozen deployed SBF hash and decoded `LVPCFG01`/`LVPMKT01` identities. The audit-candidate `*02` account layouts are not accepted by this verifier and cannot unlock signing. A compile-time lock remains false until audited value-moving handlers exist, so configuration alone cannot enable signing. Any missing, extra or disagreeing proof keeps signing unavailable.
