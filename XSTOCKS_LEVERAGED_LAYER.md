# xStocks leveraged-layer feasibility

Status date: 2026-09-17. xStocks is a feasibility candidate, not an admitted backing venue and not a public LevPlay launch dependency.

## Conclusion

There is a supported integration path. It is not a loophole.

xStocks states that its tokens are permissionless, DeFi-composable and usable in structured products. Its public v2 API exposes assets, deployments, multipliers, proof of reserves, corporate actions and oracle metadata. Onboarded clients can use xChange for Solana issuance/redemption through an atomic RFQ.

The first verified source identity is:

- Asset: Apple xStock (`AAPLx`)
- Underlying: `AAPL`
- Solana mint: `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp`
- Canonical USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Public registry: `GET https://api.xstocks.fi/api/v2/public/assets/AAPLx`
- Current public registry reports Solana atomic swaps supported.

## Safe architecture

### Long tokens

For an `N×L` product, the isolated LevPlay vault must hold or have irrevocably committed `N` units of AAPLx exposure per unit of holder capital. Holder USDC supplies one unit and maker/risk capital prepays the remaining `N - 1` units.

The preferred initial design is a prepositioned inventory vault:

1. Backed approves and registers the program-controlled vault wallet.
2. Makers acquire AAPLx through xChange or an approved secondary venue.
3. Inventory settles into the isolated vault before capacity increases.
4. LevPlay opens only against already-settled inventory and funded Standby/unwind reserves.
5. Rebalancing never counts an API quote, pending RFQ or unsigned transaction as inventory.
6. Closing burns LevPlay shares before releasing USDC; if AAPLx cannot be sold, the funded exit reserve pays within its cap and the vault enters close-only mode.

This removes the xStocks API and market maker from the holder's immediate close authorization path.

### Short tokens

xStocks spot tokens do not create short exposure. `2×S`, `3×S` and `5×S` require one of:

- a separately governed market maker posting the full maximum bounded payout in USDC;
- an audited prepaid put/option-like claim with deterministic settlement; or
- a borrow-and-sell hedge whose failure cannot reduce the holder's isolated USDC claim.

Ordinary margin or a liquidatable perpetual account is not admissible. Until a bounded, prepaid short route exists, xStocks-backed short markets stay disabled.

## Solana xChange composition limitation

The documented Solana xChange flow returns a partially signed versioned transaction containing SPL transfers and a memo. It is not documented as a CPI program that LevPlay can invoke.

Therefore LevPlay must not assume the following are possible without written Backed support and an integration test:

- registering a PDA as the client wallet;
- inserting LevPlay instructions into the returned transaction;
- using address lookup tables or durable nonces;
- atomically combining xChange settlement and LevPlay share minting;
- safely decoding and accepting every future transaction shape.

If Backed cannot support exact transaction composition, LevPlay must use prepositioned inventory. Arbitrary partially signed transactions from an API must never be co-signed by a vault authority.

## 2×, 3× and 5× viability

| Product | Technically feasible | Admission requirement |
|---|---|---|
| 2×L | Yes | 2 units settled AAPLx exposure per holder unit, floor reserve and exit liquidity |
| 3×L | Yes | 3 units settled exposure; stricter gap/rebalance and larger reserve |
| 5×L | Conditional | 5 units settled exposure; a 20% adverse gap can exhaust directional NAV before costs, so independent quantitative approval and larger Standby reserve are mandatory |
| 2×S | Conditional | Fully prepaid bounded payout plus independent hedge/settlement |
| 3×S | Conditional | Same, with three times the downside payout envelope |
| 5×S | High risk | Five-times bounded payout, extreme gap sensitivity and independent economic audit; do not include in the first canary |

“Liquidation-free” means the holder has no margin account, collateral call, negative balance or seizure of unrelated wallet assets. It does not mean the vault cannot lose most of its NAV. A nonzero Standby value is real only when funded by isolated reserve assets.

## Mandatory source controls

Before admission, the program and release verifier must pin and monitor:

- exact mint and token-program owner;
- every Token-2022 extension and authority, including scaled UI multiplier, pause/freeze, permanent delegate and transfer hook;
- issuer halt and corporate-action schedule;
- multiplier before raw-balance/NAV calculations;
- two independent onchain settlement sources;
- proof-of-reserves and redemption status;
- partner approval, legal eligibility and geographic restrictions;
- xChange wallet registration, limits, expiry and transaction schema;
- a close path that works during API, issuer, DEX, RPC and keeper outages.

Unexpected authority, extension, multiplier or registry changes must block opening and rebalancing. Emergency actions may only lower exposure.

## Required external evidence

Use the official **Integrate xStocks / Become a Partner** form at `https://xstocks.fi/` and request:

1. written permission for LevPlay 2×/3×/5× long/short structured tokens;
2. approval for program-controlled/PDA inventory vaults;
3. production API and xChange onboarding;
4. exact Solana transaction schema and composability guarantees;
5. signed mint/authority registry and change notifications;
6. oracle/verifier identities and market-hours behavior;
7. redemption, halt, permanent-delegate and wind-down procedures;
8. eligible-country matrix and market-data/branding rights.

No code, public API response or transferability statement replaces these approvals.
