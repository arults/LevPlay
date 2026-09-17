# LevPlay program state v2 (execution locked)

Status: **audit-candidate layouts only**. These accounts are not read by the
entrypoint, cannot be initialized through an instruction, and cannot move
value. The deployed-release verifier continues to recognize only the legacy
`LVPCFG01` / `LVPMKT01` evidence until an audited migration is explicitly
approved.

## Separation of immutable identity and mutable accounting

| Account | Bytes | Mutability in a future processor | PDA identity |
|---|---:|---|---|
| `MarketConfigV2` (`LVPCFG02`) | 800 | Read-only after initialization | underlying ID + product mint + side + leverage |
| `MarketAccountingV2` (`LVPACC02`) | 288 | Writable | market-config address |
| `PairedRiskVaultV2` (`LVPPAIR2`) | 640 | Writable | ordered long-config + short-config addresses |
| `PositionV2` (`LVPPOS02`) | 224 | Writable | market-config address + wallet owner |

Every layout has an exact length, discriminator, version `2`, initialized byte,
PDA bump, side, and zero-only reserved regions. Decode rejects truncated or
extended data, an uninitialized or unsupported header, invalid enums, aliased
critical roles, inconsistent settlement observations, and arithmetic states
whose required totals overflow `u64`.

`MarketConfigV2` pins product and settlement mints/token programs, separate
accounting and paired-risk-vault PDAs, clearing/source/reserve vaults, adapter
program, market, version and ABI hash, both oracle accounts, owners and feed
IDs, caps, settlement tolerances, session/corporate-action policy identities
and the opposite-side market. It has no mutable counters.

`MarketAccountingV2` contains capital, supply, daily mint/redemption counters,
NAV, gross exposure, total and queued liabilities, both settled prices and
publish times, settlement slots, market nonce and next FIFO claim ID.
`PairedRiskVaultV2` is one shared solvency ledger for exactly one admitted
long/short pair. It records both sides' capital, NAV, matched and residual
exposure, maker collateral, isolated reserves, unwind capacity, commitment
expiry and queued liabilities while pinning distinct long/short clearing,
reserve, maker and unwind roles.
`PositionV2` binds one wallet to one market and records shares, cost basis,
wallet/daily cap usage, realized P/L, last action and the next nonce.

## Role and pair isolation

SBF loaders require program ownership, the exact read/write role, a non-signer
non-executable account, exact byte length and the canonical PDA. Cross-account
validation binds config → accounting → paired risk vault → position identities.
Pair validation requires reciprocal long/short config links, the same canonical
pair PDA and exact side-to-pair accounting/vault bindings; it rejects shared
product mints, market accounting, clearing, source, reserve, maker, unwind or
adapter-market roles.

## Deliberate lock

No initialize, open, close, settle, rebalance, Standby or migration handler is
added here. `process_instruction` still returns `EXECUTION_LOCKED_ERROR`, and
there is no CPI or account mutation. A later PR must define authenticated
initialization/migration, token-account authority checks, transitions and
rollback tests before these layouts can be wired into dispatch.
