# LevPlay Solana program boundary v1

Status date: 2026-09-15. This document freezes the allocation-free boundary implemented in `programs/levplay-core/src/program_boundary.rs`. It is a prerequisite for the SBF entrypoint, not a claim that an SBF binary or deployment exists.

## Wire format

Every instruction uses little-endian integers and must be no more than 64 bytes.

| Offset | Field | Rule |
|---:|---|---|
| 0 | Magic | Exact ASCII `LEVP` |
| 4 | Version | Exact `1` |
| 5 | Tag | One admitted instruction tag |
| 6 | Payload | Exact tag-specific fields; trailing or truncated data fails |

| Tag | Instruction | Payload |
|---:|---|---|
| 1 | Open | capital, minimum shares out, quote-expiry slot, nonce |
| 2 | Close | shares, minimum assets out, quote-expiry slot, nonce |
| 3 | Queue close | shares, claim amount, quote-expiry slot, nonce |
| 4 | Settle claim | FIFO sequence, amount |
| 5 | Enter Standby | expected epoch |
| 6 | Resume | recapitalization, expected epoch |
| 7 | Begin wind-down | expected epoch |

Unknown tags, versions, magic, oversized input, truncated fields and trailing bytes fail before economic logic.

## Open account order

The SBF wrapper must construct the expected rules from program-owned configuration. The browser cannot supply or override bindings.

| Index | Role | Signer | Writable | Owner/executable rule |
|---:|---|---:|---:|---|
| 0 | User wallet | Yes | Yes | System program |
| 1 | User USDC account | No | Yes | Pinned token program |
| 2 | User product-token account | No | Yes | Pinned token program |
| 3 | Protocol configuration | No | No | LevPlay program |
| 4 | Isolated market state | No | Yes | LevPlay program |
| 5 | Product mint | No | Yes | Pinned token program |
| 6 | Clearing vault | No | Yes | Pinned token program |
| 7 | Fee vault | No | Yes | Pinned token program |
| 8 | Standby reserve vault | No | No | Pinned token program |
| 9 | Primary oracle | No | No | Pinned primary-oracle program |
| 10 | Secondary oracle | No | No | Pinned secondary-oracle program |
| 11 | Backing adapter program | No | No | Executable; pinned loader |
| 12 | Backing adapter market | No | Yes | Pinned adapter program |
| 13 | Token program | No | No | Executable; pinned loader |
| 14 | Instructions sysvar | No | No | Pinned sysvar owner |

Account count, order, keys, owners, signer flags, writable flags and executable flags must match exactly. Zero keys, duplicated keys, extra accounts, omitted accounts, reordered accounts and privilege changes fail closed.

## Transaction composition

The current LevPlay instruction must be the final top-level instruction. The only permitted prefixes are zero, one or two calls to the pinned Compute Budget program. Any suffix, third prefix or unrelated top-level program fails. The SBF wrapper must read and parse the instructions sysvar rather than trusting client metadata.

## Replay boundary

Wallet nonce accounts are monotonically consumed. The supplied nonce must equal stored state and increment without overflow. Quote expiry, recent blockhash and instruction decoding are independent checks; satisfying one cannot bypass another.

## SBF implementation obligations

The wrapper still must:

1. derive and compare every PDA and bump;
2. parse Token-2022/USDC accounts and extensions;
3. parse both oracle formats and enforce owner, feed, freshness, confidence, publishers and deviation;
4. apply the core transition before CPI;
5. issue only fixed CPI bytes to pinned programs and accounts;
6. reconcile pre/post balances and minimum outputs;
7. burn shares before redemption value leaves custody;
8. persist nonce, epoch, queue and liabilities atomically; and
9. return stable program errors without logging secrets.

The SBF dependency graph, lockfile, binary, IDL, SBOM, deployment addresses and validator evidence remain release blockers.
