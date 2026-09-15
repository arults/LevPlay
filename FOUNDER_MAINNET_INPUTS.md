# LevPlay founder and external mainnet inputs

These are the items that cannot be manufactured by source code. Evidence must name the exact release, accounts, counterparties and jurisdictions.

## 1. Entity, jurisdiction and counsel

- Name the legal entity operating LevPlay and the launch jurisdictions.
- Retain securities/derivatives counsel familiar with tokenized equities and Solana.
- Obtain a written product classification, eligible-user matrix, sanctions/geofence requirements, disclosures, terms, privacy requirements and market-data opinion.
- Select an eligibility/KYC provider if counsel requires one.

Deliverable: signed legal memorandum plus an implementation matrix that engineering can encode and test. A disclaimer alone does not pass this gate.

## 2. xStocks production eligibility

Current pilot priority: Ondo Stocks. Submit the same integration packet to Ondo through its official contact form or support@ondo.finance and obtain written permission for LevPlay's program-controlled AAPLon inventory and leveraged wrapper. Request production API credentials, Solana attestation verification, limits, halt/corporate-action procedures and the applicable country matrix. Keep xStocks and PreStocks applications open as future routes, but do not make them launch dependencies.

- Apply through the official xStocks partner process.
- Disclose that program-controlled vaults may hold and trade `AAPLx` as backing.
- Obtain written confirmation covering the exact entity, jurisdictions, Solana mint, custody/redemption path, corporate actions, pause/freeze/permanent-delegate behavior, production limits and data usage.

Deliverable: signed approval/terms and a technical onboarding package. Never send credentials or private agreements to the repository.

## 3. Two independent maker commitments

- Contract two independently controlled makers, or one maker plus separately governed protocol risk capital.
- Each commitment must state maximum notional, collateral amount, expiry, pricing, funding, maintenance, forced-unwind and wind-down obligations.
- Capital must settle into program-controlled USDC escrow before it counts as capacity. A letter or API limit alone is insufficient.
- Maker keys must not control governance, guardian, treasury or user backing.

Provisional $1,000 canary envelope at 2x: a completely unmatched $1,000 long requires approximately $1,000 of additional prepaid long funding, plus its isolated floor/unwind reserve. A completely unmatched $1,000 short requires $2,000 of prepaid counterparty collateral to fund the maximum 2x gain on a 100% stock decline, plus its isolated floor/unwind reserve. Holder loss is capped at contributed NAV if the stock rises through the Standby threshold. The final amounts must come from the independent quantitative review and be committed separately for both failure directions.

## 4. Governance and treasury signers

- Nominate distinct governance, pause-only guardian and fee-treasury multisigs.
- Use hardware-backed signers distributed across people, organizations and regions.
- Define quorum, signer replacement, 48-hour governance timelock, emergency communications and key-loss procedure.
- Supply only public multisig and canonical USDC account addresses to the deployment manifest. Never share seed phrases or private keys.

Deliverable: created multisigs, signer ceremony record, public addresses and an independently verified authority graph.

## 5. Independent reviewers

- Engage a Solana-specialist smart-contract auditor for source, SBF binary, Token-2022 behavior, account constraints, CPI adapters and upgrade controls.
- Engage a separate quantitative reviewer for leverage compounding, gap limits, reserves, market hours, halts, corporate actions, Standby and wind-down.
- Fund a public bug bounty before expanding beyond the canary.

Deliverable: reports, finding register, remediation commits, auditor retest and immutable report hashes.

## 6. Production operations

- Contract at least three independent paid Solana RPC providers.
- Operate at least three permissionless keepers across separate clouds/regions.
- Assign 24/7 incident, support and reconciliation owners.
- Establish monitoring, status page, WAF/rate limits, DNS monitoring and insurance decision.
- Run documented loss-of-RPC, keeper, signer, issuer, oracle and maker game days.

Deliverable: tested runbooks and machine-verifiable endpoints/alerts, without committing credentials.

## 7. Mainnet launch authorization

- Fund the exact isolated reserve and maker escrows.
- Approve the frozen program ID, binary hash, IDL hash, audit hashes, account manifest, caps and rollback plan in the governance multisig.
- Authorize only the $1,000 aggregate canary with no wallet above $100.
- Observe and reconcile for seven days before any cohort or cap expansion.

Until every deliverable is present, the execution switch remains false by design.

