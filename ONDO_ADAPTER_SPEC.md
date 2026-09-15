# LevPlay Ondo Stocks Solana adapter boundary

Status date: 2026-09-15. Ondo Stocks is the selected candidate source of spot AAPL exposure for the capped AAPL2L pilot. xStocks and PreStocks are Coming soon. No venue is production-admitted until the signed manifest passes every release check.

## Pinned public identifiers

- Ondo chain identifier: solana-900
- Ondo API origin: https://api.gm.ondo.finance
- Ondo GM program: XzTT4XB8m7sLD2xi6snefSasaswsKCxx5Tifjondogm
- Jupiter Order Engine: 61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH
- AAPLon Token-2022 mint: 123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo
- Canonical Solana USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

The official Ondo simulator currently publishes four authorized solver addresses. They are pinned in lib/venue-registry.ts; a solver-set change blocks admission until source, integration and audit evidence are updated.

## Atomic opening boundary

The production SBF program must never accept an arbitrary Ondo program, order engine, solver, token mint, destination or quote host. A server may request an Ondo attestation, but it cannot authorize execution. The signed transaction must bind the attestation to the signing wallet, AAPLon, solana-900, side, amount, limit price and expiry.

For AAPL2L, the transaction must:

1. verify a current LevPlay eligibility attestation without preventing closes;
2. transfer holder capital and the separate 50-bps fee to their pinned destinations;
3. acquire AAPLon only through the frozen Ondo/Jupiter account graph;
4. prove the isolated vault's exact pre/post USDC and AAPLon balance deltas;
5. verify the maker-funded additional unit of AAPLon is already available;
6. mint LevPlay shares only after the complete target backing exists; and
7. abort atomically on any account, solver, quote, balance or minimum-output mismatch.

Wallet simulation may not understand Ondo's just-in-time mint. LevPlay must therefore run its own bundle-aware simulation and must still decode and display the final transaction before signature. A simulation warning is never silently suppressed.

## Exit boundary

Primary redemption may use Ondo's direct/JIT liquidity only while its current capacity is independently verified. A separate, pre-funded inventory exit must have a different operator and failure domain. New mints stop before either route approaches its configured capacity. Close and pro-rata wind-down remain permissionless even if the user's jurisdiction credential expires.

## Not covered by the spot adapter

Ondo spot inventory supplies AAPLon exposure; it does not itself supply LevPlay's additional long capital or AAPL2S. The LevPlay maker escrow funds the second long unit. The short pilot stays execution-disabled until its separately collateralized bounded-payout contract, reserve and quantitative model are independently audited.

## Evidence still required

- written Ondo confirmation that LevPlay may use program-controlled AAPLon inventory inside this leveraged wrapper;
- production API credentials and limits held outside source control;
- exact attestation signer/verification specification for Solana;
- legal country matrix and an eligibility-attestation operator;
- audited SBF implementation and bundle-aware local-validator fixtures;
- funded maker, Standby and independent-exit vaults;
- devnet and capped-mainnet transaction evidence.
