# LevPlay oracle architecture

Status: fail-closed design for audit; no market is admitted by this document.

## Trust boundary

Settlement is authorized only by exact onchain feed accounts parsed by the audited
Solana program. HTTP APIs, DEX quotes, frontend values and backend-signed relays
cannot mint, redeem, rebalance, resume or calculate final NAV.

| Source | Permitted use | Settlement authority |
|---|---|---|
| Pyth exact production feed | Preferred primary onchain observation | Candidate only after feed ID, receiver, licensing and market semantics are pinned |
| Independently operated onchain feed | Secondary observation | Candidate only after its native verifier and exact feed are implemented and audited |
| Ondo API | Discovery and display | Never |
| PreStocks API or DEX quote | Discovery and display | Never |
| Tessera API or bonding-curve mark | Discovery and display | Never |

## Per-product admission

1. Resolve an exact Pyth symbol/feed ID. If none exists, the product remains
   settlement-blocked; a similar ticker or underlying may not be substituted.
2. Resolve a genuinely independent secondary provider. Two accounts, relays or
   publishers ultimately derived from Pyth count as one source.
3. Pin both account addresses, verifier program owners, feed identifiers and
   provider IDs in the hashed deployment manifest.
4. Implement each provider's native parser onchain. A server-signed API value is
   not an oracle and cannot be upgraded into one with configuration.
5. Test identity, owner, freshness, exponent, confidence, publisher/quorum,
   divergence, market-session and corporate-action behavior.
6. Admit the product only after audit, retest and deployment evidence bind those
   exact identities to the release.

## Runtime rules

- Both independent observations must be present, fresh and positive.
- Confidence and publisher/quorum thresholds must pass independently.
- Normalized prices must remain within the market's maximum deviation.
- Risk-increasing actions fail closed on stale, missing, disputed, halted or
  market-closed inputs.
- Emergency actions may only reduce exposure and must use deterministic,
  audit-approved pricing rules.
- Display availability never changes settlement readiness.

## Current evidence

`Equity.US.AAPL/USD` is the only exact Pyth candidate currently pinned in the
public registry. Its feed ID is recorded in `lib/oracle-registry.ts`. A second
independent Solana AAPL source has not been admitted, so AAPL and every other
market remain blocked for real-money settlement.

Provider names discovered during historical research are not implicit
dependencies. A provider becomes part of LevPlay only through a reviewed code
change, exact public identities, audit and a frozen deployment manifest.
