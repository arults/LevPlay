# Eligibility and risk acknowledgement gate

Policy version: `levplay-eligibility-2026-09-17-v1`

## Purpose

LevPlay must not turn a footer disclaimer into a substitute for product eligibility. A real-money signature is permitted only after the connected wallet has accepted the exact current policy version and every independent execution gate has already passed. Paper preview remains available without an eligibility acknowledgement because it never constructs, signs or submits a transaction.

The user confirms that they:

1. are at least 18 and legally capable of entering the transaction;
2. are not a U.S. Person, sanctioned person or in a jurisdiction where the selected product is unlawful, and will not evade controls;
3. understand that a reference token may provide only economic exposure and may confer no equity, voting, dividend or information rights;
4. understand that leverage, compounding, market gaps, issuer controls and liquidity failures may cause loss of most or all capital, and that liquidation-free is not loss-free; and
5. understand wallet signatures and confirmed Solana transactions are final and that the acknowledgement is not advice or a suitability assessment.

## Fail-closed behavior

- The forgeable browser prototype is scoped to the exact connected wallet and policy version for UX testing only; it is not authoritative eligibility evidence.
- Missing, malformed, stale-version or different-wallet browser state is rejected.
- Changing wallets resets the in-memory accepted state.
- Release readiness and eligibility are separate predicates. `canExecute` requires both.
- Paper orders bypass only the eligibility prompt; they never bypass the execution lock or submit transactions.
- A future policy change must use a new version and require fresh acceptance.

## Production boundary

The browser record is a UX prototype, not a security boundary, legal approval or sufficient mainnet evidence. Before real execution, counsel must approve the eligible jurisdictions and product-specific language. The wallet must sign a typed attestation containing `policyVersion`, `policyContentHash`, `domain`, Solana `genesisHash`, `wallet`, `productId`, `quoteNonce`, `issuedAt` and `expiresAt`. An independent eligibility service must verify that signature and return a signed decision identifier that the admitted transaction builder and/or Solana program verifies against a pinned eligibility signer or onchain admission registry. A local-storage value must never be treated as authoritative by a value-moving instruction.

Required production evidence:

- counsel-approved jurisdiction matrix and product classification;
- sanctions/geofence and anti-evasion control design;
- immutable policy content hash and version registry;
- wallet-signed, domain-separated acceptance receipt with nonce, chain, product, expiry and revocation rules;
- independent eligibility-service signing key rotation and fail-closed availability policy;
- server/onchain enforcement tests proving that omission, mismatch and old versions fail closed;
- privacy, retention and incident-response policy for eligibility evidence; and
- independent legal and security review.
