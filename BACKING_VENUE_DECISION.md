# LevPlay backing venue decision record

Status date: 2026-09-15. Decision state: **No production backing route is admitted.** This is a fail-closed architecture decision, not a completed launch gate.

## Verified market boundary

| Candidate | Verifiable capability | Admission decision |
|---|---|---|
| xStocks on Solana | 1:1-backed, transferable spot tokenized equities; xStocks describes the assets as redeemable for cash value or underlying and subject to jurisdiction restrictions | Eligible as a pinned `AAPLx` spot asset only; it does not create the second unit of long exposure or any short exposure |
| Jupiter Perps | The official current product route identifies SOL, BTC and ETH perpetuals | Rejected for the Apple pilot: no fixed `AAPL` market or production capacity evidence |
| Drift | The official site describes leveraged perpetual markets and a liquidation engine; Drift's June 2026 recovery update says the protocol is being rebuilt for relaunch after user losses | Rejected for the Apple pilot: no verified `AAPL` market, fixed adapter terms, isolated non-recourse capacity or deterministic exit evidence; a margin-liquidated backing account would not satisfy this design |
| Bespoke market maker / OTC route | Could contractually supply prepaid, non-recourse long funding or a capped-loss inverse derivative | Candidate only. It must be implemented onchain with fixed accounts, locked collateral, independent audit, production limits and a second exit route before admission |

Primary sources: [xStocks product and eligibility description](https://xstocks.fi/), [Jupiter Perps](https://jup.ag/perps/long/SOL-SOL), [Drift product description](https://www.drift.trade/), and [Drift recovery update dated June 4, 2026](https://www.drift.trade/updates/drift-recovery-update-june-3-2026).

Absence of public evidence is not evidence that a venue cannot ever support the product. It means LevPlay cannot pin that venue into a real-money manifest today.

## Safe target architecture

### `AAPL2L`

The holder contributes position capital. A separately committed risk-capital tranche supplies the additional unit of exposure. For a $100 cap, the vault may hold up to $200 of `AAPLx`, but only if the additional funding is prepaid, non-recourse to holders, non-recallable through the wind-down horizon and segregated from the Standby reserve. A traditional margin loan that can call collateral or liquidate the vault is not admissible.

Required locked resources are calculated independently:

- full exposure funding: risk capital first covers `target spot exposure - holder capital`;
- stress funding: separate, non-double-counted risk capital covers the approved price gap plus the Standby floor, unwind cost and funding buffer;
- capacity: both the primary acquisition route and the independent emergency exit route can cover the complete capped exposure;
- claims: senior/risk-capital and holder claim priority is immutable in the audited market state, with no recourse to other markets or wallets.

### `AAPL2S`

Borrowing and selling stock creates potentially unbounded loss as the stock rises. Therefore a naked stock borrow or ordinary margin/perpetual account is not admissible. `AAPL2S` requires a prepaid, non-recourse, bounded-loss derivative whose maximum loss is fixed onchain and fully collateralized together with the Standby and unwind reserves. The route must provide deterministic cash settlement or buy-to-cover and cannot socialize loss into `AAPL2L` or another market.

Until that bounded-loss derivative exists, `AAPL2S` remains in the audit scope but execution-disabled.

## Admission rules now encoded

[`lib/backing-engine.ts`](./lib/backing-engine.ts) rejects a proposed route unless all of these are evidenced:

1. Exact program, market and collateral accounts are pinned.
2. Written production approval and independent audit exist.
3. Financing is non-recourse and cannot be recalled.
4. Primary capacity and unwind capacity cover the target exposure through the committed horizon.
5. Slippage and funding remain inside immutable bounds.
6. Long exposure is fully funded and its risk tranche covers the approved gap/reserve model.
7. Short exposure has a finite maximum loss and locked collateral covering that loss plus reserves.
8. An independent emergency exit route has a different failure domain and is not the same program/market disguised as redundancy.

The live-capacity rule disables new mints before exits. Reduced capacity may permit a partial unwind, but never permits the UI or program to claim a full exit that cannot be executed.

## Evidence required to complete Gate 1

- Signed venue term sheet naming the exact legal counterparty, Solana programs/accounts, products, limits, collateral waterfall, funding bounds, maintenance windows and wind-down rights.
- Onchain proof of committed risk capital and isolated Standby reserves for both pilot markets.
- Source and independent audit for primary and emergency adapters.
- Reproducible devnet stress ledger proving complete and partial exits with the primary venue unavailable.
- Independent quantitative approval of gap size, capacity haircut, reserve size, volatility drag, market-hours and corporate-action behavior.
- Legal approval for the eligible jurisdictions and program-controlled use of `AAPLx`.
