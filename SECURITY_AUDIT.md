# LevPlay security review — 2026-09-15

## Release decision

**The objective mainnet GO standard is now defined and machine-enforced; the current release remains safety-locked until its missing external and onchain proofs are supplied.**

This is an internal engineering review, not an independent smart-contract audit. The application cannot construct or sign a mainnet trade while the program, audited backing adapter, vault deployments, multisigs and release proofs are absent. Calling the preview “GO” without those artifacts would weaken the safety design rather than complete it.

## Verified release evidence

Deterministic checks were rerun on 2026-09-15 against the production build. Browser and public-integration rows retain their most recent successful evidence date where noted:

| Check | Result |
|---|---|
| Protocol-model invariants | 18/18 passed, including fee-on-top, Max-balance safety and opposite-signed 2× long/short outcomes |
| Curated xStocks assets | 15/15 exact pinned Solana mints matched |
| Token program and extensions | 15/15 Token-2022 mints verified, including scaled UI, pause state and transfer-hook guard |
| Stock oracle registry | 10/10 stock markets expose both Pyth and Chainlink entries |
| Commodity launch gate | 5/5 remain blocked until equivalent oracle/backing evidence exists |
| Source security assertions | 64 fail-closed checks passed |
| UI lifecycle assertions | 27 lifecycle and responsive checks passed |
| Audit-package assertions | Scope, evidence index, schema and invariant checks passed |
| Browser user-flow QA | Long flow retained; short flow verified as AAPL2S → $50 capital + $0.25 fee → +5% reference move → $45 proceeds → −$5.25 fee-inclusive P/L → close/history. No application console errors. |
| Static analysis | ESLint passed |
| Production build | Passed with all app and API routes emitted |
| Production dependency scan | No known vulnerabilities reported by the package-manager advisory database |
| Mainnet release verification | Requires two independent RPCs to validate program, treasury and multisig account state; environment strings alone cannot unlock signing |

These results prove the interface, read paths and modeled safety rules. They do not prove a Solana program that does not yet exist, economic solvency, backing-liquidity availability, oracle behavior under attack, or legal eligibility.

## Remediated findings — 2026-09-15

| ID | Severity | Finding | Resolution |
|---|---|---|---|
| SVM-READ-01 | High | A nested xStocks issuer halt could be displayed but omitted from the final market-verification expression. | The normalized halt result now blocks verification regardless of which API field reports it; regression assertion added. |
| CONFIG-01 | Critical | A syntactically valid deployment manifest could associate a product with the wrong xStock mint or leverage value. | Product ticker, pinned mint and leverage must now match exactly; duplicate or overlapping vault/product-mint accounts are rejected. |
| WEB-01 | Medium | Explicit anti-framing, MIME, referrer, browser-permission and content security policies were absent. | Production headers are configured and verified in the compiled Worker. |
| SUPPLY-01 | Informational | Production dependency exposure needed a current advisory check. | Package-manager production audit reports no known advisories as of the review date. |
| ECON-02 | High | The prior ticket deducted the 0.5% fee from position capital, conflicting with the approved “fee on top” rule. | Capital, fee, total debit, exposure, Max sizing and fee-inclusive P/L now use one consistent model with regression tests. |
| RELEASE-02 | Critical | Syntactically valid environment variables could satisfy release checks without proving accounts existed on Solana mainnet. | Execution now also requires two distinct configured RPC hosts to verify mainnet genesis, the executable program, canonical-USDC fee account, pinned treasury owner and separately owned governance/guardian multisigs. |
| ADAPTER-01 | Critical | A generic or client-selected backing adapter would permit arbitrary CPI/account substitution. | Each deployment must name an explicitly allowlisted adapter program and market; the instruction specification rejects unparsed remaining accounts. No adapter is configured until an independently audited venue is chosen. |
| UX-03 | Medium | A wallet with enough position capital but not enough capital plus fee could pass review. | Balance checks and Max sizing now reserve the full fee; review discloses total wallet debit and exact treasury routing. |
| SUPPLY-02 | High | GitHub `main` is unprotected and the connector-created sync commit is unsigned. | Open: repository administration must require reviewed pull requests, passing checks, signed commits, linear history and no force-push/deletion before a release tag is trusted. |
| RELEASE-03 | Critical | A deployment could pass global program/treasury checks without proving that each live market state, vault, product mint, xStock mint, oracle account and adapter market matched the manifest. | Every configured market is now independently checked through the RPC quorum; state ownership, Token-2022 mint/authority relationships, oracle owners and fixed adapter ownership must all pass. |
| CONFIG-02 | High | Deployment JSON was not bound to one explicit content hash. | The exact adapter and market JSON byte representation must match `LEVPLAY_SVM_MANIFEST_HASH`; this is audit provenance and defense-in-depth, not a substitute for onchain enforcement. |
| RPC-01 | Medium | Configured RPC URLs accepted literal IP and local-network style destinations, and upstream response sizes were unbounded. | Shared HTTPS-only RPC validation rejects credentials, ports, IP literals, localhost and `.local`; RPC/xStocks response sizes and wallet request bodies are bounded. |
| ECON-03 | Critical | Short exposure could be presented without a separately proven borrow/perpetual route and isolated solvency boundary. | Audit scope is frozen to isolated `AAPL2L` and `AAPL2S`; short execution remains locked until its fixed adapter, capacity, funding bounds and buy-to-cover path are independently proven. |

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
| Fee charged on deposit | There is no LevPlay deposit account. The fee is assessed only when opening a position and is added on top of the chosen capital. |
| Unbounded pilot | $10 minimum, $100 per-wallet maximum, plus required onchain TVL and daily caps. |
| Frontend pretending to settle | The UI labels the preview, exposes blockers and disables the signing control until every gate passes. |
| Instrument confusion | Homepage and order ticket distinguish the LevPlay position token from its xStock reference without cluttering the primary message. |
| Hidden fee destination | Review shows the complete configured fee token account and treasury owner or `Not configured`; two RPCs must verify its canonical USDC mint and ownership. |
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
10. No dedicated Codex Security or Solana audit service is connected in this environment. Internal automated review and GitHub CI do not replace the required independent audit.
11. GitHub branch protection and signed-commit enforcement are not enabled; the repository owner must apply the policy before mainnet release provenance can pass.
12. The fresh live-integration rerun on 2026-09-15 timed out in the restricted build environment; the earlier successful public-read evidence remains historical and must be rerun from CI or an unrestricted release runner before audit handoff.

## Required sequence

Implement and compile the SVM program; run unit, property, fuzz and local-validator tests; deploy to devnet; run an economic stress campaign; commission an independent audit and remediate every finding; freeze the release; configure multisigs and monitoring; then run a capped mainnet canary with one 2× market before considering 3× or 5× products.
