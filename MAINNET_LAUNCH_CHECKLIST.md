# LevPlay Solana mainnet GO checklist

Status date: 2026-09-15. **GO means every Critical gate below has independently reproducible evidence for the exact release hash.** A configuration value, screenshot, preview result or internal review cannot satisfy a Critical gate. The application unlocks signing only when its machine-readable release checks also pass.

## Current completion

| Gate | Severity | Current evidence | State |
|---|---:|---|---|
| Wallet-direct fee-on-top flow | Critical | UI/model: $500 capital + $2.50 fee = $502.50 debit; Max reserves fee | Passed at model/UI level |
| Read-only market and wallet verification | High | Pinned xStock mints, Token-2022 checks, dual-feed registry, mainnet genesis | Passed |
| Executable Solana program | Critical | Interface and threat model only; no Rust/SBF artifact | Pending |
| Leverage backing venue | Critical | xStocks spot/RFQ researched; no audited leverage adapter or contracted capacity | Pending |
| Independent program audit and retest | Critical | Internal source review only | Pending |
| Governance, guardian and fee multisigs | Critical | Runbook exists; addresses and signers not supplied | Pending |
| Mainnet RPC/authority quorum | Critical | Fail-closed verifier implemented; production endpoints/accounts not configured | Pending |
| Legal eligibility and launch controls | Critical | Risk disclosure exists; counsel/eligibility implementation absent | Pending |

## A. Product and solvency — Critical

- [x] Define “liquidation-free” as no holder margin account, negative balance or seizure of other wallet assets; disclose that the token may lose 100%.
- [x] Charge 50 basis points only on opening position capital and add it on top; no LevPlay deposit/withdrawal fee.
- [x] Start with wallet USDC, one signature and no persistent LevPlay cash balance.
- [x] Cap the canary at $100 per wallet, one market, 2× long; short, 3× and 5× remain disabled for the canary.
- [ ] Select a leverage/backing venue and exact fixed CPI adapter for the canary market.
- [ ] Obtain written production access, limits, uptime terms and unwind procedures from that venue.
- [ ] Prove committed liquidity covers the TVL cap plus gap, borrow/funding and unwind stress buffers.
- [ ] Define funding, borrow, spread, rebalance, corporate-action and bad-debt attribution in NAV.
- [ ] Independent quantitative review signs off on gap, halt, volatility drag and insolvency scenarios.
- [ ] Demonstrate solvent wind-down with the backing venue unavailable.

## B. Solana program — Critical

- [ ] Implement the frozen [instruction interface](./programs/levplay/INTERFACE.md) in a pinned Solana/Anchor toolchain.
- [ ] Isolate each market in separate state, backing and accounting PDAs.
- [ ] Use checked integer arithmetic and explicit decimal/exponent normalization; no floats.
- [ ] Enforce capital, fee, wallet, transaction, TVL, daily mint and daily redemption caps onchain.
- [ ] Pin every mint, token program, oracle, fee recipient, treasury owner, adapter program, adapter market and writable account.
- [ ] Reject arbitrary CPI data and remaining accounts; validate every CPI pre/post balance delta and minimum output.
- [ ] Prevent duplicate initialization, replay, account substitution, reinitialization, PDA spoofing, type confusion and close-authority abuse.
- [ ] Burn shares before redemption assets leave the vault; preserve FIFO claims when immediate liquidity is unavailable.
- [ ] Make rebalancing permissionless, deterministic and non-custodial; emergency action may only lower absolute exposure.
- [ ] Produce a reproducible SBF build, IDL, SBOM, source commit and binary hashes.
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

## D. Oracle and xStocks — Critical

- [x] Pin all 15 xStock mint addresses and verify Token-2022 ownership, scaled UI extension, pause and transfer-hook state in read paths.
- [x] Confirm Pyth and Chainlink registry entries for ten stock candidates; keep commodities blocked without equivalent evidence.
- [ ] Verify both oracle account owners and feed IDs inside every value-moving instruction.
- [ ] Enforce publish time, confidence, publisher count and cross-feed deviation onchain.
- [ ] Test exponent and scaled-UI multiplier changes using raw integer fixtures.
- [ ] Test scheduled and surprise corporate actions, market halts and issuer pause/freeze/permanent-delegate actions.
- [ ] Obtain xStocks production onboarding and confirm whether the selected integration permits program-controlled vault wallets.
- [ ] Treat xStocks/API/RFQ availability as an external dependency; prove redemptions and wind-down do not require one unauditable hot key.

## E. Adversarial verification and independent audit — Critical

- [x] Frontend/source fail-closed checks, protocol arithmetic model, live public-integration checks, lint and production build exist.
- [ ] Rust unit tests cover every instruction, constraint and error branch.
- [ ] Local-validator integration tests use real Token-2022 extensions, oracle fixtures and a faithful backing adapter.
- [ ] Property tests prove NAV/share conservation, fee ceiling, rounding, caps and zero-supply transitions.
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
- [ ] Counsel approves tokenized-securities, derivatives, commodities and jurisdiction design.
- [ ] Eligibility, sanctions, geofence, investor restrictions, market-data rights, terms, privacy and risk disclosures are implemented and tested.
- [ ] 24/7 incident owners, support escalation, insurance and financial/operational runbooks are active.

## H. Capped mainnet progression — Critical

- [ ] Internal $100 end-to-end canary on one 2× long market using the audited frozen program.
- [ ] Reconcile every instruction, share, backing asset, fee and redemption independently.
- [ ] Complete seven incident-free days including at least one scheduled rebalance and one successful wind-down drill.
- [ ] Multisig records an explicit GO vote referencing the program ID, release hash, audit hash, caps and rollback plan.
- [ ] Invite a small cohort under the same aggregate TVL cap; expand only after another reviewed observation window.
- [ ] Do not open to 1,000 users, raise caps, or enable 3×/5×/short until separate audit and risk votes pass.

## Machine release rule

The `/api/protocol` gate requires two independent Solana mainnet RPCs to verify the executable program, canonical USDC fee account, pinned treasury owner and distinct multisig accounts. It separately requires the independent audit hash, reproducible release hash, backing attestation, exact adapter allowlist, validated market manifest, frozen-program declaration and explicit execution switch. Any missing or disagreeing proof keeps signing unavailable.
