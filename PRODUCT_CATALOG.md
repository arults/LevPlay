# LevPlay product-candidate catalog

Status date: 2026-09-15. This catalog defines isolated products for audit and paper preview. A listing is not a deployed token or permission to offer it.

## Active source candidates

| Source | Underlyings | Products per underlying | Candidate total |
|---|---:|---:|---:|
| Ondo Stocks | 15 US stocks/ETFs | 2L, 2S, 3L, 3S, 5L, 5S | 90 |
| Ondo commodity-linked ETFs | 5 | 2L, 2S, 3L, 3S, 5L, 5S | 30 |
| PreStocks | 7 pre-IPO references | 2L, 2S | 14 |
| **Total** | **27** | — | **134** |

xStocks is shelved and is not an active integration or launch dependency. Hong Kong products are omitted because neither admitted source currently provides a verified HK catalog for this release.

## Ondo public stocks

Apple, Microsoft, NVIDIA, Alphabet Class A, Amazon, Tesla, AMD, Netflix, SPDR S&P 500 ETF, Disney, Uber, Robinhood Markets, SoFi Technologies, Oracle and Invesco QQQ.

The source symbols are `AAPLon`, `MSFTon`, `NVDAon`, `GOOGLon`, `AMZNon`, `TSLAon`, `AMDon`, `NFLXon`, `SPYon`, `DISon`, `UBERon`, `HOODon`, `SOFIon`, `ORCLon` and `QQQon`. Only AAPLon has a currently pinned Solana mint in the checked-in public integration. The other exact Solana mints must come from an authenticated, signed Ondo source registry and be independently verified before their product manifests can pass.

## Ondo commodity-linked products

Gold (`GLDon`), silver (`SLVon`), platinum (`PPLTon`), oil (`USOon`) and copper miners (`COPXon`). These are tokenized exchange-traded products providing commodity-related economic exposure; LevPlay must not describe them as claims on physical commodities.

## PreStocks pre-IPO products

Anthropic, OpenAI, Anduril, Neuralink, Kalshi, Polymarket and SpaceX. Each is limited to 2L and 2S at this stage. PreStocks provide economic exposure only—not shares, ownership, voting, dividend or information rights—and disclose total-loss and secondary-liquidity risk.

PreStocks admission requires an issuer-signed source registry, the exact mint and Token-2022 authority state, written wrapper permission, two manipulation-resistant settlement sources, market-specific liquidity and wind-down evidence, and legal approval. A DEX price alone can never settle a LevPlay mint, rebalance or redemption.

## Isolation and collateral rules

Every one of the 134 candidates has a unique product ID, product mint, market PDA, collateral vault, fee vault, two oracle accounts, exposure cap, wallet cap and audit/deployment record. No product shares capital or bad debt with another.

- An `N×L` vault requires maker-funded long capital of at least `(N − 1) × aggregate capital cap`, in addition to holder capital.
- An `N×S` vault is a bounded-payout, prepaid claim requiring short-gain collateral of at least `N × aggregate capital cap`; it may not depend on margin borrowing or a liquidatable perpetual position.
- Each product funds its own Standby NAV floor and independent exit liquidity up to its declared maximum redemption liability.
- New mints stop on oracle disagreement, stale data, provider halt, source control change, capacity exhaustion, missed rebalance or expired evidence. Closing remains permissionless and switches to close-only pro-rata mode during source outages.

## Promotion rule

A candidate becomes executable only when its machine-readable product manifest passes every invariant in `lib/product-registry.ts` and binds provider/legal approvals, source registry, collateral, two oracles, audit, economic review, retest and deployment to the exact release. Approval of one product never approves another leverage, direction or underlying.
