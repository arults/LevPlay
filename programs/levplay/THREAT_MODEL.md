# LevPlay SVM threat model

Status: pre-implementation security requirements. This is not an external audit.

| Threat | Required invariant and test evidence |
|---|---|
| Fee redirection | Fee account and treasury owner are stored in configuration; substitute account, mint, owner and Token Program tests must fail. |
| Account substitution | Every PDA, mint, oracle, adapter program and market account is checked against market state; permute and duplicate every account in fuzz tests. |
| Arbitrary CPI | No generic instruction bytes or remaining accounts; one compiled adapter per audited venue release. |
| Partial settlement | Capital, fee, backing and mint/burn execute in one transaction; force each step to fail and prove all balances/supply remain unchanged. |
| Replay | Nonce is scoped to signer and market, consumed once, and quote slot expires; duplicate and reordered submissions fail. |
| Oracle manipulation | Two independent owners/feed IDs, age/confidence/publisher/deviation limits, integer exponent normalization, and corporate-action pause. |
| NAV/share inflation | Conservative rounding, initial-share defense, donation/dust tests, pre/post asset reconciliation and zero-supply transitions. |
| Insolvency or gap | Deposits pause before redemptions; emergency action only deleverages; shares floor at zero and no holder debt can be created. |
| Keeper compromise | Keeper is never a custody signer or recipient; any caller gets the same bounded state transition. |
| Admin compromise | Separate timelocked governance and pause-only guardian; immutable fee ceiling and adapter allowlist; backing and fee vaults segregated. |
| RPC/front-end compromise | Wallet displays decoded instruction/accounts; two independent RPCs must agree; program enforces every critical condition again. |
| xStocks issuer control | Pause, freeze, permanent delegate, multiplier activation and redemption availability are explicit external trust boundaries. |
| Backing venue failure | Per-market caps, adapter pause, unwind limits, continuous solvency monitoring and tested orderly wind-down. |
| Recallable leverage funding | Long risk capital must be prepaid, non-recourse and locked through the wind-down horizon; any margin call or recall right makes the route inadmissible. |
| Unbounded short loss | Short route must expose a finite maximum loss and lock collateral for it plus Standby/unwind reserves; naked borrow and ordinary margin accounts fail admission. |
| False redundancy | Primary and emergency routes must use separately evidenced failure domains and cannot be the same program/market or operator under another label. |
| Token-2022 extensions | Reject unapproved hooks/authorities/extensions and test scaled-UI multiplier changes without float arithmetic. |

## Release rule

No checklist item is satisfied by this document. Each invariant needs compiled program code, unit/property/fuzz/local-validator evidence, devnet results, an independent Solana-specialist audit and an audit retest against the exact reproducible release hash.
