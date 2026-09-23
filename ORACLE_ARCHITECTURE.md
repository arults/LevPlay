# LevPlay oracle architecture

Status: fail-closed design for audit. No market is admitted by this document.

## Boundary

Settlement is authorized only by exact onchain feed accounts parsed by the frozen Solana program. HTTP APIs, DEX quotes, frontend values and backend-signed relays cannot mint, redeem, rebalance, resume or calculate final NAV.

| Source | Use | Settlement authority |
|---|---|---|
| Pyth exact production feed | Preferred primary | Only after exact feed, receiver and semantics are pinned |
| Independent onchain feed | Required secondary | Only after native verifier, feed and operator independence are audited |
| PreStocks issuer API | Identity and display | Never |
| PreStocks DEX quote | Display and liquidity discovery | Never |
| Tessera API mark | Identity and display | Never |

## Admission and runtime

1. Resolve an exact product feed; a similar company ticker cannot substitute.
2. Resolve a genuinely independent secondary provider. Two relays derived from the same source count as one.
3. Pin accounts, owners, feed identifiers and provider IDs into the hashed release.
4. Parse each provider natively onchain.
5. Enforce positive price, maximum age 60 seconds, confidence and publisher/quorum limits, maximum 100 bps deviation, session state and issuer/corporate-action halts.
6. Risk-increasing actions fail closed on any missing, stale, disputed or mismatched input.
7. Emergency actions may only reduce exposure using audited deterministic rules.

## Current evidence

The PreStocks and Tessera APIs do not provide the independent timestamped onchain observations required by settlement. Their values are therefore displayed as references with `verified: false`. No PreStocks or Tessera LevPlay candidate currently has two admitted settlement feeds, so real-money execution remains locked.
