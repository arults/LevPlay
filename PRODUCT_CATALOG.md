# LevPlay active product-candidate catalog

Status date: 2026-09-23. A catalog entry is an isolated audit candidate, not a deployed token or an offer.

| Source | Pinned references | Products per reference | Candidate total |
|---|---:|---:|---:|
| PreStocks | 8 | 2L, 2S | 16 |
| Tessera | 2 | 2L, 2S | 4 |
| **Total** | **10** | — | **20** |

## PreStocks

Anthropic, OpenAI, Anduril, Neuralink, Figure AI, Kalshi, Polymarket and SpaceX. xAI is excluded. PreStocks products provide economic exposure only—not shares, ownership, voting, dividend or information rights—and may suffer total loss or lack secondary liquidity.

## Tessera

Pinned T-OpenAI and T-Kalshi mints. Tessera T-Tokens are unsecured loan participation rights, not equity. Repayment depends on the issuer structure and a future liquidity-event redemption process. Each product carries issuer, liquidity, authority and jurisdiction risk.

## 2× long and short model

Every candidate has a unique product ID, product mint, market PDA, clearing vault, source-token vault, Standby reserve, two oracle accounts, capacity and audit record.

- A 2L vault needs holder capital plus maker-funded long-risk capital equal to at least the aggregate capital cap.
- A 2S vault is a prepaid, bounded-payout claim with short-gain collateral of at least 2× the aggregate capital cap.
- Neither holder product may depend on a liquidatable margin loan or perpetual position.
- Every product funds its own Standby floor and exit liquidity.
- New mints stop on stale/disputed prices, issuer halt, source authority change, exhausted capacity, missed rebalance or expired evidence.
- Closing remains permissionless and becomes close-only pro-rata during source outages.

## Admission

A candidate becomes executable only when its manifest passes `lib/product-registry.ts` and binds exact source mint, provider and legal approvals, two independent timestamped onchain settlement feeds, collateral, liquidity, audit, economic review, retest and deployment evidence to one frozen release. Approval never carries across provider, direction or source token.

The first release schema accepts exactly `ANTH2L` and `ANTH2S` as the canary pair. They are still blocked until every evidence gate passes.
