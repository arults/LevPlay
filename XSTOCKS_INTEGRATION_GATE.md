# xStocks integration and production gate

Status date: 2026-09-18. xStocks is an active **candidate source**, not an admitted execution venue. Public API integration does not imply issuer approval, primary-market access, legal clearance, liquidity, or mainnet readiness.

## Access path

- Public asset metadata, prices, multipliers, proof of reserves, oracle records and corporate actions are available without authentication at `https://api.xstocks.fi/api/v2`.
- Authenticated issuance/redemption, wallet, limit, bridge and xChange RFQ functions require issuer onboarding. After approval, the API key is generated in the Backed platform under **Settings → API**.
- The key must be stored only as server-side `XSTOCKS_API_KEY`. It must never be committed, logged, exposed to the browser or pasted into chat.

## Solana correctness requirements

1. Resolve every mint from the live `/public/assets` registry and bind its exact Token-2022 account bytes into the release manifest. Never derive or guess a mint.
2. xStocks on Solana uses Token-2022 Scaled UI. Transaction construction uses raw amounts; user display applies the current multiplier.
3. Refresh multiplier and corporate-action state before quote, mint, rebalance and close. Pause affected products around the issuer activation time (documented as 00:30 UTC after ex-date) and fail closed if the schedule cannot be parsed.
4. Halt new opens if the asset or xChange route is halted, limits are zero, the registry changes, or two independent settlement oracles do not pass freshness/confidence/deviation checks.
5. Direct primary-market access additionally requires KYB/AML, whitelisted wallets, written wrapper approval, stated limits, committed liquidity, incident contacts and deterministic unwind rights.

## Launch evidence still required

- executed issuer/partner approval naming LevPlay and the permitted leveraged wrappers;
- legal opinion and enforced geography policy for LevPlay's entity and end users;
- staging and production credentials, registered wallets and tested issuance/redemption or an onboarded market-maker agreement;
- exact Solana mint/multiplier/oracle identities and corporate-action fixtures;
- independent smart-contract and economic audits bound to the deployed release;
- funded long, short and emergency-exit capacity plus a capped canary and reconciliation evidence.

Until every item is release-bound, the adapter is public/read-only and `executionEnabled` remains false.
