# LevPlay Solana protocol specification

## Product boundary

LevPlay is designed to issue transferable Token-2022 vault shares targeting 2× or 3× daily long or short exposure to one allowlisted reference. “Liquidation-free” means the holder has no margin account, margin call, negative balance or wallet-level liquidation. It does **not** mean principal protection. A share may approach zero, and a residual NAV floor is genuine only when an isolated reserve contains enough real collateral to fund it.

The external-audit pilot is limited to two isolated Apple-referenced markets: `AAPL2L` and `AAPL2S`. The short product remains execution-disabled until a fixed audited borrow or stock-perpetual adapter proves capacity, funding bounds and deterministic buy-to-cover. A missing short backing route must never be disguised as synthetic inventory.

## Accounts and authorities

- One immutable program ID per audited release.
- One global configuration PDA containing governance, guardian, fee rate and adapter allowlists.
- One market PDA per xStock/leverage pair, with xStock mint, share mint, two oracle identifiers, exposure band, caps and pause state.
- Vault token accounts are PDAs. Neither keeper nor frontend can withdraw from them.
- Governance and guardian are separate multisigs. Governance changes wait 48 hours; guardian may pause immediately but cannot unpause.
- Keeper calls are permissionless and deterministic. A keeper proposes no arbitrary recipient, mint, program or route.

## Value flow

1. The user chooses position capital from USDC already held in the connected wallet; there is no LevPlay deposit balance.
2. In one atomic transaction, the program transfers the full position capital into the isolated market vault and exactly 0.5% of that capital on top to the pinned USDC fee account. A $500 position therefore debits $502.50.
3. Shares mint from conservative NAV using the full position capital and return to the same signing wallet. If the vault transfer, fee transfer, backing action or mint fails, the entire transaction fails.
4. A permissionless rebalance executes only when leverage leaves the configured band. The program verifies allowlisted programs, exact mints, pre/post token balances, minimum output, price impact and oracle freshness.
5. Closing burns shares before assets leave the vault and returns available USDC proceeds to the same wallet. If idle liquidity is insufficient, a queued claim is created; claims cannot be skipped or repriced by a keeper.

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
- Aggregate canary cap: $1,000 across `AAPL2L` and `AAPL2S`; the two markets have separate vaults and solvency accounting.
- Market TVL, one-transaction size, daily mint and daily redemption caps are enforced onchain.
- Emergency deleveraging is permissionless and always reduces absolute exposure.
- Every market defines a funded standby floor and isolated reserve. When post-settlement NAV reaches that floor, exposure is reduced to zero and the series enters `Standby`; mint, rebalance and claims of continuing leveraged exposure stop.
- A displayed minimum price, excess token decimals or reverse split never count as solvency. If the reserve cannot fund the floor after a gap, the state is `Insolvent`, not `Standby`, and the UI must disclose the uncovered deficit.
- Standby cannot resume merely because the oracle price recovers: exposure was removed. Resumption requires explicit recapitalization, fresh oracle consensus, available hedge capacity, governance delay and pro-rata accounting that cannot dilute existing holders.
- New deposits stop before redemptions when backing liquidity falls below its floor.
- NAV rounds against the protocol on mint and in favor of solvency on redemption; dust cannot inflate shares.
- Fees are calculated in integer base units on position capital, added on top, and cannot exceed the immutable 50-basis-point ceiling. There is no deposit or withdrawal fee in the launch design.

## Mainnet release gates

The frontend enables signing only after two independent mainnet RPCs verify the executable program, pinned USDC fee account and distinct multisig accounts, and after it verifies exact market PDAs/mints, an allowlisted backing adapter, a frozen release hash, an independent audit hash and the explicit multisig launch vote. Environment strings alone cannot unlock execution.

## Backing boundary

xStocks provide 1:1 spot stock/ETF exposure and an atomic RFQ flow; they do not provide 2× or 3× leverage. PreStocks provide bearer-token economic exposure to private companies but no equity ownership, guaranteed secondary liquidity, independent LevPlay settlement oracle, or leverage. LevPlay therefore cannot launch from either catalog integration alone. Each market requires a separately audited source of additional or short exposure, enforceable liquidity limits, and deterministic deleveraging. The launch adapter must expose fixed program and market accounts, bounded slippage, exact pre/post balances and no arbitrary CPI targets.
