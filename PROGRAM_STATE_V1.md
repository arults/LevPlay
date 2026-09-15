# LevPlay program state v1

This document freezes the byte-level format for program-owned configuration and
market accounts. It is part of the audit scope. Parsers must reject unknown
versions, trailing bytes, uninitialized data, nonzero reserved bytes, zero
critical addresses and aliased critical addresses.

## Config account — 208 bytes

| Offset | Bytes | Field |
|---:|---:|---|
| 0 | 8 | discriminator `LVPCFG01` |
| 8 | 1 | version, exactly `1` |
| 9 | 1 | initialized, nonzero |
| 10 | 1 | PDA bump |
| 11 | 5 | reserved, all zero |
| 16 | 32 | governance multisig |
| 48 | 32 | pause-only guardian multisig |
| 80 | 32 | treasury owner |
| 112 | 32 | canonical-USDC fee vault |
| 144 | 32 | canonical USDC mint |
| 176 | 32 | canonical-USDC token program |

All six addresses are nonzero and pairwise distinct. This deliberately prevents
one address from silently satisfying multiple control roles.

## Market account — 328 bytes

| Offset | Bytes | Field |
|---:|---:|---|
| 0 | 8 | discriminator `LVPMKT01` |
| 8 | 1 | version, exactly `1` |
| 9 | 1 | initialized, nonzero |
| 10 | 1 | PDA bump |
| 11 | 1 | side: long `0`, short `1` |
| 12 | 1 | mode: Active/Standby/Paused/Insolvent/WindDown |
| 13 | 3 | reserved, all zero |
| 16 | 8 | next owner nonce |
| 24 | 8 | transaction cap |
| 32 | 8 | wallet cap |
| 40 | 8 | TVL cap |
| 48 | 8 | daily mint cap |
| 56 | 8 | daily redeem cap |
| 64 | 2 | funded Standby floor, basis points |
| 66 | 2 | leverage, basis points |
| 68 | 2 | entry fee, basis points |
| 70 | 2 | reserved, all zero |
| 72 | 32 | product mint |
| 104 | 32 | product token program |
| 136 | 32 | clearing vault |
| 168 | 32 | isolated reserve vault |
| 200 | 32 | fixed adapter program |
| 232 | 32 | fixed adapter market |
| 264 | 32 | primary oracle |
| 296 | 32 | secondary oracle |

Integers are little-endian. The canary decoder accepts only 2× leverage, at
most 50-bps entry fee, a 1–500-bps Standby floor, ordered nonzero caps and
unique nonzero critical addresses.

## Remaining account-boundary work

The SBF processor must additionally prove account ownership, canonical PDA
seeds and bumps, rent/size, exact signer/writable flags, token-account mint and
authority, oracle owner/feed identity and transaction introspection before
using decoded state. A valid state byte array alone never unlocks execution.
