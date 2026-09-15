# LevPlay Solana mainnet launch checklist

Status date: 2026-09-15. A checked item requires independently reproducible evidence. A configuration value, screenshot or internal statement is not sufficient evidence for a real-money release.

## A. Product and economic design

- [x] Holder loss is capped at deposited equity in the protocol model.
- [x] “Liquidation-free” is disclosed as no holder margin liquidation, not protection from a 100% product loss.
- [x] Entry fee is fixed at 50 basis points in the model and UI.
- [x] Initial user cap is $100 and short products are disabled.
- [ ] Select and contract a leverage/backing venue for each stock market.
- [ ] Prove daily leverage can be maintained through gaps, halts and thin liquidity.
- [ ] Define funding, borrow, spread and rebalance-cost attribution in NAV.
- [ ] Independent quantitative review of volatility drag, gap loss and insolvency scenarios.
- [ ] Start with one 2x long stock. Do not launch 3x/5x until the 2x canary passes.

## B. Solana program

- [ ] Implement the program in a pinned Solana/Anchor toolchain.
- [ ] Isolate every market in separate vault and accounting accounts.
- [ ] Use checked integer arithmetic and explicit decimal normalization everywhere.
- [ ] Burn shares before redemption assets leave the vault.
- [ ] Enforce fee, wallet, transaction, TVL, mint and redemption caps onchain.
- [ ] Enforce exact mints, token programs, adapter programs, recipients and writable accounts.
- [ ] Verify all CPI pre/post balance deltas and minimum output onchain.
- [ ] Prevent duplicate initialization, account substitution, reinitialization and PDA spoofing.
- [ ] Prevent signer, owner, close-authority, remaining-account and type-confusion attacks.
- [ ] Make rebalancing permissionless but deterministic and non-custodial.
- [ ] Make emergency deleveraging one-way toward lower risk.
- [ ] Use pull/claim redemptions if immediate liquidity cannot be guaranteed.
- [ ] Produce a reproducible SBF build and publish its hash.
- [ ] Deploy to devnet and mainnet with independently verified program IDs.
- [ ] Remove upgrade authority or place it behind a disclosed timelocked multisig after audit.

## C. Oracle and xStocks integration

- [x] Pin all 15 xStock mint addresses and verify Token-2022 ownership.
- [x] Require scaled UI amount extension and reject unexpected transfer hooks.
- [x] Observe issuer pause/halt state and corporate-action windows in read paths.
- [x] Confirm Pyth and Chainlink registry entries for ten stock candidates.
- [ ] Verify both oracle accounts, owners and feed IDs inside every value-moving instruction.
- [ ] Enforce publish-time, confidence, publisher and cross-feed-deviation limits onchain.
- [ ] Normalize price exponents and Token-2022 scaled UI multipliers without floats.
- [ ] Test scheduled and surprise corporate actions against real fixtures.
- [ ] Obtain xStocks/xChange production onboarding and authenticated RFQ access.
- [ ] Confirm legal permission and service limits for production API use.

## D. Testing and audit

- [x] Protocol-model invariants pass.
- [x] Live public xStocks and Solana mint checks pass.
- [x] Client/source fail-closed assertions pass.
- [x] Lint, production build and dependency advisory scan pass.
- [ ] Rust unit and integration coverage for every instruction and error branch.
- [ ] Local-validator tests with real Token-2022 and oracle fixtures.
- [ ] Property tests for share/NAV conservation, rounding and fee limits.
- [ ] Fuzz CPI inputs, account order, decimals, oracle values and state transitions.
- [ ] Differential test model results against program execution.
- [ ] Stress gaps, stale feeds, halts, congestion, failed keepers and unavailable liquidity.
- [ ] Independent audit by a Solana-specialist firm; publish report and remediation commit.
- [ ] Independent audit retest with all critical/high findings closed.
- [ ] Public bug bounty with severity-based rewards and safe-harbor terms.

## E. Governance, operations and custody

- [ ] Create distinct governance, guardian and fee-treasury multisigs.
- [ ] Require hardware-wallet signers in different failure domains.
- [ ] Document quorum, timelock, signer replacement and emergency procedures.
- [ ] Use three independent paid Solana RPC providers with health/quorum monitoring.
- [ ] Run at least three permissionless keeper operators in separate regions/clouds.
- [ ] Alert on oracle deviation, missed rebalance, NAV drift, vault imbalance, halt and pause.
- [ ] Maintain a public status page and tested incident communications.
- [ ] Complete backup, key-loss, RPC-outage and issuer-halt game days.
- [ ] Reconcile vault assets, liabilities, shares and fees continuously.
- [ ] Define emergency redemption and orderly wind-down procedures.

## F. Application and transaction safety

- [x] Homepage explains the tokenized position and distinguishes its xStock reference without redundant exclusivity language.
- [x] Paper entry, fee-inclusive P/L, redemption, cash accounting, portfolio and history flow pass browser QA.
- [x] Desktop layouts are browser-verified; mobile navigation, cards and history use dedicated responsive breakpoints and automated source assertions.
- [x] No mainnet signing or transaction submission exists in the preview.
- [x] Wallet read API only returns allowlisted assets.
- [x] Mainnet genesis is checked before balances are trusted.
- [x] CSP, frame denial, MIME sniffing, referrer and browser-permission policies are set.
- [ ] Construct transactions only from server/onchain-verified deployment manifests.
- [ ] Simulate every transaction immediately before signature.
- [ ] Decode and show every instruction, program, mint, recipient, fee and limit to the user.
- [ ] Reject changed blockhash context, unexpected writable accounts or extra instructions.
- [ ] Add domain/DNS monitoring and signed release provenance.
- [ ] Commission an external frontend and wallet-flow penetration test.

## G. Legal and launch operations

- [ ] Obtain counsel for tokenized-securities, derivatives, commodities and jurisdiction rules.
- [ ] Implement eligibility, sanctions, geofence and required investor restrictions.
- [ ] Finalize issuer, market-data, privacy, risk, terms and complaint disclosures.
- [ ] Confirm xStocks distribution and branding permissions.
- [ ] Purchase appropriate cyber/crime/E&O coverage.
- [ ] Complete launch support, incident owners and 24/7 escalation coverage.
- [ ] Run a $100 internal canary, then a small invited cohort, before 1,000 users.
- [ ] Require a 7-day incident-free canary and explicit multisig go/no-go vote.

## Current decision

**NO-GO for real money.** The interface and read-only verification layer are suitable for a hackathon preview. Sections B, the value-moving parts of C/D, and the external controls in E/G are not complete. The application must remain fail-closed until those items have verifiable evidence.
