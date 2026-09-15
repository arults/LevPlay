# LevPlay SVM instruction interface

Status: specification only. No deployable program or IDL exists yet.

## `open_position`

Inputs are integer USDC base units: `capital`, `min_shares_out`, `quote_expiry_slot`, and a single-use client nonce. `capital` is the requested position size; the entry fee is `floor(capital * 50 / 10_000)` and is paid on top.

Required accounts are explicit, typed, and ordered: user signer, user USDC ATA, user product-token ATA, global configuration PDA, market PDA, market USDC vault, product mint, canonical USDC mint, pinned fee-recipient token account, pinned treasury authority, two exact oracle accounts, backing-adapter program, backing market, SPL Token Program, Token-2022 Program, and system/sysvar accounts required by the audited adapter. No unparsed remaining accounts are accepted.

The instruction must atomically:

1. Verify the signer, nonce, quote lifetime, caps, market state, canonical mints and every PDA seed.
2. Verify two fresh oracle values, confidence, publisher count, exponent normalization and maximum deviation.
3. Transfer `capital` from the user ATA to the isolated market vault.
4. Transfer the fee from the user ATA to the pinned multisig-owned USDC account.
5. Execute only the market's immutable adapter action and validate exact pre/post balance deltas and minimum output.
6. Mint at least `min_shares_out` product tokens to the signer's ATA using conservative NAV.
7. Record capital, shares, fee, oracle observations, adapter deltas and nonce in an event.

Any failed check aborts the whole Solana transaction. The program must never accept a fee recipient, mint, oracle, adapter, destination, writable account or executable program supplied only by the client.

## `close_position`

Inputs are `shares_in`, `min_usdc_out`, `quote_expiry_slot`, and a single-use client nonce. It verifies the same pinned market boundary, burns shares before releasing value, unwinds only through the audited adapter, and returns USDC to the signer's canonical ATA. Launch policy charges no close fee. If atomic liquidity is unavailable, the instruction creates a FIFO claim without transferring backing assets to a keeper.

## `rebalance`

Permissionless and deterministic. It runs only outside the leverage band, chooses direction from onchain state, enforces maximum notional/price impact, verifies oracle agreement, and pays no arbitrary caller-selected recipient. Emergency mode may only reduce absolute exposure.

## Administration

Governance may schedule bounded changes behind a timelock. The distinct guardian may pause immediately and cannot unpause, withdraw, change recipients, change adapters or mint shares. No authority can move market backing to the fee treasury.
