# LevPlay security invariants

These invariants apply independently to `AAPL2L` and `AAPL2S`.

1. A holder can lose no more than position capital plus the disclosed entry fee; no instruction can debit unrelated wallet assets.
2. Opening is atomic: capital transfer, exact 50-bps fee transfer, backing action and share mint all succeed or all revert.
3. Closing burns shares before value leaves the market boundary and returns proceeds only to the signing wallet's canonical USDC account.
4. Long and short markets share no vault, product mint, adapter market, nonce namespace or solvency accounting.
5. Every account, mint, executable program, oracle owner, fee recipient and adapter market is stored in audited state and revalidated onchain.
6. No instruction accepts generic CPI bytes, arbitrary remaining accounts, caller-selected destinations or caller-selected executable programs.
7. NAV, fees, caps, prices and shares use checked integer arithmetic with explicit decimal/exponent normalization and conservative rounding.
8. Two pinned oracle sources must independently pass identity, freshness, confidence, publisher and deviation checks at execution time.
9. Issuer pause/halt, unexpected Token-2022 extension, scheduled multiplier activation or oracle disagreement blocks risk-increasing actions.
10. Emergency behavior can pause or reduce absolute exposure; it cannot increase exposure, redirect assets, mint shares or unpause.
11. Rebalancing is deterministic and permissionless; the caller is never a custody signer or recipient.
12. Nonces are signer-and-market scoped, single use and bounded by a short quote-expiry slot.
13. Per-wallet, transaction, market TVL, daily mint and daily redemption caps are enforced onchain, not only in the UI.
14. Share supply and market equity reconcile before and after every state transition; donations and dust cannot inflate ownership.
15. Governance, pause guardian and fee treasury are distinct multisigs; backing assets can never move to the fee treasury.
16. Upgrades are either impossible for the audited binary or timelocked and require a new audit/retest before execution resumes.
17. Short exposure additionally proves available borrow/perpetual capacity, bounded funding and a deterministic buy-to-cover/unwind path.
18. Loss of the frontend, one RPC, one keeper or one administrator cannot prevent permissionless close/claim processing or orderly wind-down.
19. Standby sets directional exposure to zero, disables minting and preserves only pro-rata claims backed by identifiable assets in the isolated market and reserve vaults.
20. A residual NAV floor cannot be synthesized from token precision, UI rounding, a reverse split or an oracle-only price change; insufficient reserve produces an explicit insolvent state.
21. Standby resumption requires settled recapitalization, sustained oracle agreement, available adapter capacity and delayed governance authorization without diluting existing holders.

Each invariant requires at least one positive test, one negative test and one adversarial mutation test in the final evidence bundle.
