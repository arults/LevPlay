# LevPlay Solana protocol specification

## Product boundary

LevPlay issues transferable Token-2022 vault shares targeting 2×, 3× or 5× daily long exposure to one allowlisted xStock. “Liquidation-free” means the holder has no margin account, margin call, negative balance or wallet-level liquidation. It does **not** mean risk-free: a vault share can fall to zero and the backing venue, issuer, oracle, liquidity, program and keeper network can fail.

Short products remain disabled until an audited xStock borrow or stock-perpetual adapter exists. A long-only launch is safer than disguising unsupported short exposure.

## Accounts and authorities

- One immutable program ID per audited release.
- One global configuration PDA containing governance, guardian, fee rate and adapter allowlists.
- One market PDA per xStock/leverage pair, with xStock mint, share mint, two oracle identifiers, exposure band, caps and pause state.
- Vault token accounts are PDAs. Neither keeper nor frontend can withdraw from them.
- Governance and guardian are separate multisigs. Governance changes wait 48 hours; guardian may pause immediately but cannot unpause.
- Keeper calls are permissionless and deterministic. A keeper proposes no arbitrary recipient, mint, program or route.

## Value flow

1. User deposits USDC. The program rejects amounts below $10 or above the per-wallet and market caps.
2. The program transfers exactly 0.5% to the configured fee treasury and records net equity.
3. Shares mint from conservative NAV using the lower valid oracle price and post-fee assets.
4. A permissionless rebalance executes only when leverage leaves the configured band. The program verifies allowlisted programs, exact mints, pre/post token balances, minimum output, price impact and oracle freshness.
5. Redemption burns shares before assets leave the vault and pays no more than conservative NAV. If idle liquidity is insufficient, a queued claim is created; claims cannot be skipped or repriced by a keeper.

## Settlement guard

- Pyth and Chainlink prices are both mandatory.
- Maximum age: 30 seconds during execution.
- Maximum cross-feed deviation: 100 basis points.
- Confidence interval and minimum-publisher requirements are checked.
- xStocks issuer halt, Token-2022 pause, missing scaled-UI extension, unexpected transfer hook, or mint-address mismatch blocks action.
- Mint, redeem and rebalance pause for 15 minutes before and after a scheduled xStocks multiplier activation.
- Reference prices shown by the app never authorize settlement.

## Economic controls

- Pilot cap: $100 per wallet and one market at a time.
- Market TVL, one-transaction size, daily mint and daily redemption caps are enforced onchain.
- Emergency deleveraging is permissionless and always reduces absolute exposure.
- New deposits stop before redemptions when backing liquidity falls below its floor.
- NAV rounds against the protocol on mint and in favor of solvency on redemption; dust cannot inflate shares.
- Fees are calculated in integer base units and cannot exceed the configured 50 basis points.

## Mainnet release gates

The frontend enables signing only after it verifies a deployed program, exact market PDAs and mints, separate multisigs, a frozen release hash, an independent audit hash and the explicit operator switch. Deployment, audit and live adapter configuration are intentionally absent from the hackathon build, so mainnet signing remains disabled.
