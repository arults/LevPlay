# LevPlay Ondo + PreStocks infrastructure layer

Status date: 2026-09-15. This is the frozen architecture for the 136-product audit candidate. It does not claim that the SBF implementation, provider permissions or collateral currently exist.

## Exposure model

LevPlay tokens are prepaid, isolated vault shares. The holder has no margin account, cannot receive a margin call and cannot owe more than the amount paid. A product is “liquidation-free” for the holder because the vault deleverages or enters Standby instead of liquidating the holder or reaching into the holder's wallet.

Long products hold spot source assets using holder capital plus committed maker capital. Short products are separately capitalized bounded-payout claims; they do not borrow the holder's assets and may not use a liquidatable margin account. Daily rebalancing targets the stated multiple, so multi-day returns compound and will differ from the underlying return multiplied by leverage.

The configured minimum NAV is real only when an isolated Standby reserve funds it. Token decimal dust is not value. Extreme gaps, oracle failures, source-token controls, legal intervention and insolvency remain risks and must be disclosed.

## Value-moving path

1. The wallet signs one transaction binding product, capital, 50-bps entry fee, maximum debit, minimum shares, quote expiry and every writable account.
2. The program verifies eligibility, source/provider manifest, two oracles, capacity and collateral before moving funds.
3. Holder capital enters the isolated product vault; the fee moves separately to the pinned multisig USDC account.
4. The fixed provider adapter acquires or accounts for exposure and proves exact pre/post balances.
5. Shares mint only after the complete target backing and Standby floor exist.
6. Closing burns shares first and returns USDC to the signing wallet. If the primary route is unavailable, the product enters close-only pro-rata mode and uses the independent exit reserve.

## No-single-point-of-failure boundary

Admission requires three RPC endpoints spanning three named providers, at least three keeper authorities spanning three named operators plus permissionless rebalance, separate governance and pause-only guardian multisigs with disjoint signer sets and safe thresholds, a 48-hour upgrade delay, distinct primary/emergency exit authorities controlled by distinct operators, two oracle accounts operated by distinct providers and independently funded exit liquidity. Keepers, the web app and backend never have custody authority.

Ondo and PreStocks remain external issuer/provider trust boundaries. LevPlay cannot remove their legal, mint, freeze, redemption or operational powers. The protocol contains this risk by isolating products, blocking new mints on any source change or outage, retaining an independent exit reserve and preserving permissionless closes. “No single point of failure” therefore applies to LevPlay-controlled operation and holder exit paths, not to an assertion that an external issuer is decentralized.

## Provider adapters

The Ondo adapter pins the GM program, Order Engine, solver set, Token-2022 mints, attestation fields and API origin. Soft quotes are display-only; value movement requires a short-lived authenticated attestation bound to the wallet, side, amount, symbol, chain and expiry.

The PreStocks adapter stays non-executable until PreStocks supplies a production integration specification or LevPlay freezes a verified permissionless DEX route plus issuer-signed mint registry. Secondary-market pricing must be checked against an independent valuation source and conservative liquidity/deviation bands.

## Rollout order

1. AAPL2L, $100 per wallet and $1,000 aggregate.
2. AAPL2S only after its full bounded-payout collateral and economic audit pass.
3. One PreStocks 2L market with the strongest issuer permission, oracle and liquidity evidence.
4. Its separately collateralized 2S market.
5. Additional 2× Ondo products, then 3×, commodities and finally 5× after separate observation windows and risk votes.

The full catalog is implemented for audit and controlled enablement; it must not be enabled all at once.
