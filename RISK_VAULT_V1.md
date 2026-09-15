# LevPlay fully collateralized risk vault v1

Status date: 2026-09-15. **Implemented as a deterministic Rust economic core; not yet an SBF program and not yet admitted for real money.** Admission remains an onchain, evidence-backed state transition rather than a deployment flag.

## Frozen pilot boundary

- Products: `AAPL2L` and `AAPL2S` only.
- Collateral: canonical Solana USDC.
- Leverage: 2x daily target.
- Entry: wallet-direct capital plus the 50 bps fee on top.
- Caps: $100 per wallet and $1,000 aggregate across both products.
- Holder liability: limited to position capital and the disclosed entry fee; no margin account, negative balance or claim on other wallet assets.

## Economic construction

The clearing vault matches long and short gross exposure first. Only the residual directional exposure reaches an external backing adapter.

For capital `C`, leverage `L`, long gross exposure `E_L` and short gross exposure `E_S`:

```text
gross exposure       = C × L
matched exposure     = min(E_L, E_S)
unmatched long       = E_L - matched exposure
unmatched short      = E_S - matched exposure
long maker funding   = full long exposure × (L - 1) / L
short gain collateral= full short exposure × 100% maximum stock decline
```

The two sides retain distinct market, reserve and maker-collateral accounts. Matching reduces active hedge usage, but does not reduce required escrow: either side may close first, so the remaining side must be independently fundable. Matching is a contractual PnL transfer inside the clearing venue, not authority to seize another market's vault. A side cannot create an unfunded claim against the other side.

## Admission state machine

The venue starts `Locked`. `admit_risk_vault` can move it to `Active` only when:

1. all mints, markets, reserve vaults, maker vaults and maker identities are nonzero and unique;
2. two distinct maker identities are pinned;
3. both isolated reserves meet the configured minimum;
4. long extra funding and enough short-gain collateral for a 100% stock decline are already escrowed;
5. both unwind capacities are sufficient;
6. the commitment remains valid through the minimum wind-down horizon; and
7. immutable side and aggregate caps are valid.

New minting stops on expiry, insufficient funding, insufficient reserve, insufficient unwind capacity or cap exhaustion. No API statement or offchain promise contributes to capacity.

## Settlement

The checked-integer non-recourse settlement kernel calculates each side independently. Pair reconciliation requires external backing PnL to agree with the net long-plus-short effective PnL within an explicit integer tolerance. Holder losses are contractually clipped at contributed NAV: a gap beyond the knockout threshold cannot create a negative wallet balance or block settlement. The isolated reserve funds the residual Standby floor. A price below zero is rejected as invalid, while positive gaps remain settleable; this is why the short-gain escrow covers the stock's full possible 100% decline.

Standby is zero directional exposure at a funded residual NAV. It cannot recover from price movement alone. Recapitalization, valid oracles and restored capacity are required before a timelocked resume.

## Required SBF binding

The next program layer must derive fixed PDAs for configuration, both market states, both product mints, the clearing vault, two reserve vaults, two maker vaults, wallet nonces and queued claims. It must use canonical Token-2022/USDC accounts and reject remaining accounts, arbitrary CPI bytes, substituted programs, mints, owners, oracles and destinations.

Open must atomically transfer capital, transfer the 50 bps entry fee, reconcile backing, and mint shares. Close must burn shares before value leaves the vault. Every CPI requires fixed instruction data plus pre/post token-balance reconciliation.

## Truth boundary

The vault makes holder positions non-margin-liquidatable. It does not guarantee principal, continuous 2x tracking, issuer availability or recovery from Standby. Exact tracking is available only inside the funded and audited settlement envelope. xStocks issuer, oracle, liquidity, legal and smart-contract risks remain external trust boundaries.

