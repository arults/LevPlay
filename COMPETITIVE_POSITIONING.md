# LevPlay competitive positioning

Research date: 2026-09-17. This document separates verified product facts from
LevPlay design conclusions. Competitor claims are not evidence for a LevPlay
mainnet gate.

## Category

LevPlay is building the risk-managed leveraged stock-token layer for Solana:
fixed-target long and short exposure from a wallet, with no holder margin
account, public market state and fail-closed execution. It is not a spot-stock
issuer, brokerage or perpetual-exchange frontend.

The defensible claim is **no holder margin call or personal debt**. The token can
still lose most or all of its NAV. No reviewed competitor guarantees a
recoverable, permanently non-zero NAV; retaining dust units is not solvency.

## Current landscape

| Product | What it does well | Boundary or gap | LevPlay response |
|---|---|---|---|
| [Bounce.Tech](https://docs.bounce.tech/) | Simple tokenized long/short leverage and broad coverage | All leveraged tokens are backed by Hyperliquid perpetuals, leaving funding, venue and automation dependencies beneath the holder token | Isolated vaults, visible solvency, independent price sources and a deterministic standby/wind-down state machine |
| [Hylo](https://docs.hylo.so/protocol-overview/xassets) | Onchain collateral tranching without individual margin accounts | Dynamic leverage today; its published residual-value formula implies xAsset NAV can reach zero when reserve value no longer exceeds vUSD liabilities; equities are not documented as live | Fixed-target, product-specific leverage with funded reserves, explicit effective leverage and separately proven shorts |
| [Index Coop](https://docs.indexcoop.com/index-coop-community-handbook/products/trade/index-coop-leverage-suite) | Mature keeper, TWAP and permissionless emergency delever design | Lending/DEX/keeper dependencies and underlying liquidation exposure | Adopt bounded permissionless emergency risk reduction without giving keepers custody |
| [Ondo Stocks](https://docs.ondo.finance/ondo-stocks) | Broad institutional stock/ETF catalog, backing, redemption and production APIs | Eligibility and primary access require onboarding; current official catalog is NYSE/Nasdaq, not Hong Kong listings | Preferred public-stock candidate only after written wrapper approval, exact accounts, capacity and audit evidence |
| [xStocks](https://docs.xstocks.fi/docs) | Solana distribution, segregated backing, proof of reserves and self-custody | Tracker certificates rather than equity; primary access is gated; Token-2022 multiplier and corporate-action complexity | Future adapter after approval and raw-balance/multiplier invariants; no “loophole” integration |
| [Backpack Securities](https://learn.backpack.exchange/articles/what-is-backpack-securities) | Clear ownership/custody story and unified crypto/stocks account | Closed eligibility-controlled beta; no verified public LevPlay adapter surface | Use as a clarity and unified-balance UX benchmark, not as an assumed venue |
| [PreStocks](https://prestocks.com/products) | Simple Solana access to private-company economic exposure | Public evidence for custody, redemption, audit and settlement-grade pricing is incomplete | Reference/paper mode until exact mint, reserve, exit, permission and oracle evidence exists |
| [Tessera](https://docs.tessera.pe/overview/how-do-tessera-token-work) | Published token identities and a documented issuer-isolation and proof-of-reserve design | Unsecured loan participation rather than equity; time-limited redemption; no timestamped settlement mark in the API LevPlay reviewed | Pinned display references, redemption alerts and authority monitoring; real leverage remains locked |
| [Jupiter](https://academy.jup.ag/lessons/xstocks-on-jupiter) | Best-in-class Solana wallet, routing and stock-token discovery UX | Generic spot/loan-looping rather than a risk-managed leveraged token | Use eligible routing infrastructure while LevPlay owns NAV, risk, reserve and token lifecycle |

## LevPlay target product standard

The following is the intended production standard, not a claim that the current
execution-locked prototype or no competitor already satisfies every element.

1. **Market truth panel:** the current preview exposes `OPEN`, `DISCOVER` or
   `BLOCKED`, plus price authority, mint identity and backing/hedge admission.
   Production state will additionally expose `CLOSE_ONLY`, `STANDBY` and
   `WIND_DOWN` only after those onchain transitions exist.
2. **Exact-feed settlement:** exact Pyth product feed where supported plus a
   genuinely independent onchain source. Issuer, API, DEX and bonding-curve marks
   remain display-only.
3. **Segregated solvency:** one isolated product vault, explicit liabilities,
   funded reserve, capacity cap and independent exit. No cross-product rescue is
   silently assumed.
4. **Permissionless safety:** non-custodial keepers and a bounded emergency
   delever instruction may reduce exposure but cannot withdraw user assets.
5. **Equity-aware operation:** calendars, halts, opens, closes, corporate actions,
   transfer restrictions, redemption windows and overnight gap limits are part of
   admission—not frontend footnotes.
6. **Wallet-direct economics:** no LevPlay deposit balance; capital and the 0.5%
   entry fee are shown before one atomic signature.

## Launch wedge

The first real-money release should be a capped 2x public-stock market, not the
full catalog. It requires provider permission, exact primary and secondary
oracles, funded long inventory/hedge, independently attested reserve, complete
program invariants, external audit/retest, multisig controls and a rehearsed
wind-down. Short, 3x and 5x products earn admission separately.

PreStocks and Tessera remain useful `DISCOVER` products and hackathon integrations,
but their public marks cannot mint, redeem, rebalance or resume a real LevPlay
position.

## Success measures

- Zero stale, disputed or API-only executions.
- Zero uncovered issuance or negative protocol equity hidden as token dust.
- 100% of tradable markets with dual-source, calendar and corporate-action coverage.
- Visible backing, effective leverage, tracking error, keeper state and exit health.
- Settlement success at least 99.5% before any cap increase.
- No cap expansion until the prior observation window and wind-down drill pass.
