# Tessera integration boundary

LevPlay exposes Tessera as a selectable **Pre-IPO source provider** for two
2x long/short product candidates. Catalog inclusion and mint verification do
not admit either candidate for execution.

## Pinned identities

| Reference | Official Solana mint | LevPlay availability |
|---|---|---|
| T-OpenAI (`tOPENAI`) | `oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ` | 2L/2S candidate |
| T-Kalshi (`tKALSHI`) | `TKLSidmLVt3cqGaaodG8tyRzoANfQwoh67AccjmubeZ` | 2L/2S candidate |

The API response must match both the pinned mint and code. LevPlay also reads
each mint from Solana and requires an initialized classic-token or Token-2022 mint. A mismatch
never falls back to a symbol-only match.

## Price boundary

`https://rest-api.tessera.pe/v1/public/token-details?token=all` supplies an
issuer mark for display. At integration time it does not include an observation
timestamp, confidence interval or publisher quorum. LevPlay therefore labels it
`Display · timestamp unavailable`, sets `verified: false`, and never uses it for
mint, redeem, rebalance or NAV settlement.

Pyth is LevPlay's intended primary settlement source only when an exact feed for
the exact product has been admitted with its owner, freshness, confidence and
publisher constraints. No Pyth feed is claimed for T-OpenAI or T-Kalshi. A
second independent settlement source is still required.

## Issuer and product risks

T-Tokens are loan participation rights, not equity. According to Tessera's
published documentation, the loan is unsecured, repayment depends on a future
liquidity event and redemption window, and total loss is possible. The onchain
mints expose issuer-controlled mint, freeze, metadata and transfer-fee
authorities. LevPlay must detect authority changes and enter close-only mode.

Before real execution, each Tessera-backed product separately needs written
provider permission, eligibility controls, an audited value-moving adapter,
independent settlement feeds, market-maker collateral for both long and short
liabilities, exit liquidity, economic stress testing, deployed program evidence
and independent audit/retest. Until then, signing stays fail-closed.

Sources: [Tessera token model](https://docs.tessera.pe/overview/how-do-tessera-token-work),
[public token-details API](https://rest-api.tessera.pe/v1/public/token-details?token=all).
