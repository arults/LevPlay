# Ondo production onboarding and AAPL settlement gate

Status date: 2026-09-17. This file records production facts only. It must not contain API keys, private agreements or wallet secrets.

## Gate 1 — Ondo production access

Ondo requires an approved primary purchaser/integrator to onboard before it issues production API credentials. The founder must:

1. Email `onboarding@ondo.finance` and request Ondo Stocks API access for LevPlay.
2. Start the entity onboarding flow at https://app.ondo.finance.
3. Request written permission for program-controlled Ondo Stocks inventory inside fully collateralized 2x/3x/5x long/short wrappers.
4. Request the Solana production asset registry, attestation signer/verifier specification, smart-contract addresses, eligibility matrix, limits, halt/corporate-action process and incident contacts.
5. Add the issued key directly to Vercel as `ONDO_API_KEY` for Production and Preview. Never paste it into chat, GitHub, logs or a client-side environment variable.
6. Commit only hashes/public identifiers from the signed onboarding package to the frozen release manifest.

Passing evidence: the production API returns an authenticated quote; the written wrapper permission names LevPlay and the approved products; the exact program/mint/attestation identities are independently verified.

## Gate 2 — AAPL settlement sources

Verified first source:

- Provider: Pyth Network
- Symbol: `Equity.US.AAPL/USD`
- Feed ID: `49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688`
- Solana receiver: `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`
- Solana push oracle: `pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT`

Missing second source:

- No independent Solana AAPL verifier program and feed account has yet been verified from an official provider source.
- Ondo's latest-price API is display-only and Ondo explicitly says not to use it as an oracle.
- Ondo states that its official oracle is still in development.
- No second provider is preselected. Historical research found a Chainlink AAPL/USD feed on Polygon, but that does not establish a Solana verifier/feed and it remains unadmitted.

Therefore the AAPL settlement gate remains fail-closed at one of two required sources. Never duplicate Pyth through two accounts and call it independent. Never relay a server API value under a LevPlay key and call it an oracle.

## Required provider requests

Ask Ondo whether its forthcoming oracle will expose a Solana verifier program/feed for `AAPLon` NAV, including the shares multiplier and corporate actions. In parallel, ask a genuinely independent Solana oracle provider for an AAPL/USD production feed with an onchain verifier, publisher/quorum metadata, market-hours semantics, licensing for settlement, incident SLA and historical fixtures.

Only after both exact identities are available may engineering add the second registry entry, implement provider-native account parsing in the SBF program, and run substitution, stale/confidence, market-closed, divergence and corporate-action tests.

## Hong Kong market result

Ondo's current official asset page says Ondo Stocks offers securities trading on NYSE and Nasdaq only. It does not currently list Hong Kong Exchange securities. US-listed ADRs are not HK-listed stocks and must not be represented as Hong Kong market products.
