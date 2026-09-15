# LevPlay security review — 2026-09-15

## Verdict

**Hackathon demo: ready. Mainnet funds: blocked.**

This is an internal engineering review, not an independent smart-contract audit. The published app is designed to fail closed and cannot construct or sign a mainnet trade while the program, audited vault deployments and release proofs are absent.

## Verified release evidence

Validated on 2026-09-14 against the production build:

| Check | Result |
|---|---|
| Protocol-model invariants | 12/12 passed |
| Curated xStocks assets | 15/15 exact pinned Solana mints matched |
| Token program and extensions | 15/15 Token-2022 mints verified, including scaled UI, pause state and transfer-hook guard |
| Stock oracle registry | 10/10 stock markets expose both Pyth and Chainlink entries |
| Commodity launch gate | 5/5 remain blocked until equivalent oracle/backing evidence exists |
| Source security assertions | 38 fail-closed checks passed |
| UI lifecycle assertions | 20 lifecycle and responsive checks passed |
| Browser user-flow QA | Homepage → paper wallet → buy → nominal value and percentage P/L → close → realized history passed |
| Static analysis | ESLint passed |
| Production build | Passed with all app and API routes emitted |
| Production dependency scan | No known vulnerabilities reported by the package-manager advisory database |

These results prove the interface, read paths and modeled safety rules. They do not prove a Solana program that does not yet exist, economic solvency, backing-liquidity availability, oracle behavior under attack, or legal eligibility.

## Remediated findings — 2026-09-15

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| SVM-READ-01 | High | A nested xStocks issuer halt could be displayed but omitted from the final market-verification expression. | The normalized halt result now blocks verification regardless of which API field reports it; regression assertion added. |
| CONFIG-01 | Critical | A syntactically valid deployment manifest could associate a product with the wrong xStock mint or leverage value. | Product ticker, pinned mint and leverage must now match exactly; duplicate or overlapping vault/product-mint accounts are rejected. |
| WEB-01 | Medium | Explicit anti-framing, MIME, referrer, browser-permission and content security policies were absent. | Production headers are configured and verified in the compiled Worker. |
| SUPPLY-01 | Informational | Production dependency exposure needed a current advisory check. | Package-manager production audit reports no known advisories as of the review date. |

## Implemented protections

| Risk | Control |
|---|---|
| Wrong xStock mint | Curated mint addresses are pinned from the xStocks API and checked against the live API response and Solana account metadata. |
| Wrong token program | Mints must be owned by the canonical Token-2022 program. |
| Corporate-action balance errors | Scaled-UI extension is mandatory; transaction amounts remain raw; interactions pause around multiplier activation. |
| Issuer halt or pause ignored | xStocks trading halt and Token-2022 pause block the market. |
| Price API used for settlement | API quotes are reference-only. The protocol specification requires fresh Pyth and Chainlink data onchain. |
| Oracle manipulation | Both feeds are mandatory, with age, confidence, publisher and 100-bps deviation checks. |
| Malicious transfer hook | Any unexpected Token-2022 transfer-hook program blocks the mint. |
| Keeper compromise | Rebalances are permissionless and constrained by exact mints, programs, balance deltas, minimum output and oracle state. |
| Admin single point of failure | Separate governance and guardian multisigs; guardian pause is one-way; governance actions are delayed. |
| Unlimited user loss | Holder debt is impossible and vault equity is floored at zero; the share may still lose all value. |
| Fee overcharge | 50 basis points in integer USDC units, shown before signature and enforced by the release gate. |
| Unbounded pilot | $10 minimum, $100 per-wallet maximum, plus required onchain TVL and daily caps. |
| Frontend pretending to settle | The UI labels the preview, exposes blockers and disables the signing control until every gate passes. |
| Instrument confusion | Homepage and order ticket distinguish the LevPlay position token from its xStock reference without cluttering the primary message. |
| Hidden fee destination | The order breakdown shows the configured fee account or `Not configured`; preview mode collects no funds. Production requires a multisig-owned USDC token account. |
| Misstated paper P/L | Both realized and unrealized results include the 0.5% entry fee; paper cash is debited on entry and credited with sale proceeds. |
| Unsupported browser UUID | Paper records use a runtime-compatible local identifier after browser QA exposed missing `crypto.randomUUID()` support. |
| Deployment-manifest substitution | Every configured xStock mint must equal the curated mint for the product ticker; leverage must match the product ID; vault and product-mint accounts must be distinct and unique. |

## xStocks trust boundary

The live AAPLx mint exposes mint, freeze, pause and permanent-delegate authorities. These are issuer controls, not LevPlay controls, and remain a material external trust dependency. xStocks is also a regulated tokenized-security product with geographic restrictions. LevPlay must screen eligibility before enabling any public mainnet flow.

## Open critical blockers

1. No LevPlay SVM program is deployed.
2. The vault/execution adapter has not been implemented against a confirmed liquid backing venue for every market.
3. No independent audit, fuzz suite, local-validator integration suite or mainnet-fork economic stress test has completed.
4. No governance multisig, guardian multisig or fee treasury has been supplied.
5. No production RPC quorum, monitoring, incident response or permissionless keeper set is live.
6. Securities-law and xStocks jurisdiction controls are not integrated.
7. A 5× product requires dependable leverage liquidity and faster emergency deleveraging; it must not launch merely because the UI can model it.
8. The current environment has no Solana/Anchor toolchain, deployer authority or funded deployment wallet; no reproducible program binary can be built or deployed here.
9. The owner has created the private `arults/LevPlay` GitHub repository; the verified source snapshot must be synchronized after every release.

## Required sequence

Implement and compile the SVM program; run unit, property, fuzz and local-validator tests; deploy to devnet; run an economic stress campaign; commission an independent audit and remediate every finding; freeze the release; configure multisigs and monitoring; then run a capped mainnet canary with one 2× market before considering 3× or 5× products.
