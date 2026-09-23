# LevPlay external audit scope

Status: pre-audit package. Fieldwork targets the signed `audit-v1` tag; that tag must be created only after the Solana program, fixed adapters and reproducible artifacts listed below exist.

## Frozen pilot products

The first audit covers exactly two isolated Apple-referenced products:

| Product | Daily target | Side | Maximum loss to holder | Pilot limit |
|---|---:|---|---:|---:|
| `ANTH2L` | +2× | Long | Position capital plus disclosed entry fee | $100 per wallet |
| `ANTH2S` | −2× | Short | Position capital plus disclosed entry fee | $100 per wallet |

The aggregate mainnet canary ceiling is $1,000 across both products. `3×`, `5×`, commodities and every other ticker are out of scope and must remain unavailable in the signed deployment manifest.

`ANTH2L` and `ANTH2S` must use separate market state, product mint, backing vault, USDC Standby reserve, adapter market and risk caps. A failure, insolvency or halt in one market must not expose the other market's backing.

## In scope

- The exact Solana program source, Cargo lockfile, Anchor/Solana versions, IDL and reproducible SBF binary.
- Initialization, open, close, rebalance, enter-Standby, recapitalize/resume, pause, claim and governance instructions.
- PDA derivation, account ownership, signer/writable constraints and Token-2022 extension handling.
- Integer NAV/share accounting, fee rounding, caps, nonce/expiry handling, reserve draws, Standby floors, insolvency disclosure and zero-supply transitions.
- LevPlay Risk Vault admission, paired exposure, asymmetric-exit contingency escrow, commitment expiry, caps and settlement reconciliation.
- Fixed long and short backing adapters, including CPI data construction and pre/post balance reconciliation.
- Pyth-primary and independently admitted secondary account identity, freshness, confidence, publisher and deviation enforcement.
- Issuer halt, multiplier/corporate-action, liquidity outage, gap, congestion and orderly-wind-down behavior.
- Governance, guardian, treasury and upgrade/freeze controls.
- Transaction construction and decoding in the frontend after the program passes review.

## Out of scope

- UI aesthetics and paper-mode performance except where they can cause a user to sign a different transaction.
- xStocks issuer internals, oracle provider internals and backing-venue internals; their behavior is modeled as an external trust boundary.
- Any product not named in the frozen pilot table.

Out-of-scope dependencies are not assumed safe. Their compromise, pause and outage paths remain in the threat model and must fail closed or enter a solvent wind-down.

## Required audit inputs

1. Release commit and signed tag.
2. Reproducible build command and pinned toolchain.
3. SBF binary, IDL, SBOM and SHA-256 hashes.
4. Exact devnet program, ProgramData, market, vault, mint, oracle, adapter and multisig addresses.
5. Frozen deployment manifest matching [`audit/deployment-manifest.schema.json`](./audit/deployment-manifest.schema.json).
6. Unit, integration, property, fuzz, differential and economic-stress results.
7. Backing-venue production terms, limits, unwind procedure, isolated reserve funding/solvency evidence and short borrow/perpetual capacity evidence.
8. Prior findings register with remediation commits.

The audit cannot be called complete until the auditor retests the remediated exact binary and publishes a report hash.
