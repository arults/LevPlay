# LevPlay security review — 2026-09-15

## Release decision

**The objective mainnet GO standard is now defined and machine-enforced; the current release remains safety-locked until its missing external and onchain proofs are supplied.**

This is an internal engineering review, not an independent smart-contract audit. The application cannot construct or sign a mainnet trade while the program, audited backing adapter, vault deployments, multisigs and release proofs are absent. Calling the preview “GO” without those artifacts would weaken the safety design rather than complete it.

## Verified release evidence

Deterministic checks were rerun on 2026-09-15 against the production build. Browser and public-integration rows retain their most recent successful evidence date where noted:

| Check | Result |
|---|---|
| Protocol-model invariants | 18/18 passed, including fee-on-top, Max-balance safety and opposite-signed 2× long/short outcomes |
| Standby risk-engine vectors | Integer-only funded-floor model passed deterministic cases plus 588 adversarial long/short intervals; unfunded floors are reported insolvent |
| Rust protocol kernel | Pinned Rust 1.85 `no_std` core passed 45 unit/adversarial tests, including independent/asymmetric closes, FIFO claims, strict decoding/account layouts, transaction composition, replay guards and 128 deterministic open/close sequences; zero-warning Clippy with arithmetic-side-effect denial and rustfmt |
| Solana SBF shell | 7 SBF boundary/entrypoint tests passed; checksum-pinned Agave v4.2.1 built a non-secret `.so` with SHA-256 `049111b10631459b6c8735e58bf70c73995a8f146ea1f2891da615a435534c27` in workflow run `35005124622`; every valid instruction remains execution-locked |
| Backing admission vectors | 11 fixed admission cases and 256 capacity-boundary vectors passed; no production venue is inferred or admitted |
| Candidate product catalog | 136 definitions: 15 Ondo stocks and 5 commodity-linked ETFs at 2×/3×/5× L/S, plus 8 PreStocks references at 2× L/S; every market remains separately fail-closed pending admission |
| Source-token verification | Read-only registry checks are modeled; no catalog count or issuer API response is treated as settlement, solvency or production admission evidence |
| Oracle registry | Candidate feed mappings exist, but every value-moving market remains blocked until both accounts, owners, freshness, confidence and deviation are enforced by the SBF instruction |
| Commodity and Pre-IPO launch gate | All candidates remain blocked until exact source mints, dual settlement sources, wrapper permission and independently proven backing/unwind evidence exist |
| Source security assertions | 72 fail-closed checks passed |
| UI lifecycle assertions | 44 lifecycle, catalog, Standby-disclosure and responsive checks passed |
| Audit-package assertions | Scope, evidence index, schema and invariant checks passed |
| Browser user-flow QA | Long flow retained; short flow verified as AAPL2S → $50 capital + $0.25 fee → +5% reference move → $45 proceeds → −$5.25 fee-inclusive P/L → close/history. No application console errors. |
| Static analysis | ESLint passed |
| Production build | Passed with all app and API routes emitted |
| Production dependency scan | No known vulnerabilities reported by the package-manager advisory database |
| Mainnet release verification | Requires two independent RPCs to validate program, treasury and multisig account state; environment strings alone cannot unlock signing |

These results prove the interface, read paths, deterministic Rust kernel, fail-closed SBF entrypoint and modeled safety rules. They do not prove a value-moving Solana handler, economic solvency, backing-liquidity availability, oracle account parsing under attack, or legal eligibility.

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
| PREIPO-01 | Critical | A PreStocks catalog entry could be mistaken for a launch-ready leveraged market. | Pre-IPO entries are pinned and labeled separately, expose no trusted price in LevPlay, always return `verified: false`, and cannot satisfy the execution gate without independent dual oracles plus audited long/short backing and unwind evidence. |
| ECON-03 | Critical | Short exposure could be presented without a separately proven borrow/perpetual route and isolated solvency boundary. | Audit scope is frozen to isolated `AAPL2L` and `AAPL2S`; short execution remains locked until its fixed adapter, capacity, funding bounds and buy-to-cover path are independently proven. |
| ECON-04 | Critical | A cosmetic minimum token price could be described as a never-zero guarantee without real assets funding it. | The reference risk engine permits Standby only at a collateralized floor, removes exposure in Standby, records reserve draw once, and labels an unfunded gap `Insolvent`. Oracle recovery alone cannot manufacture NAV or restart exposure. |
| RELEASE-04 | Critical | A market manifest could omit or reuse the reserve supposedly protecting residual NAV. | Every market now requires a unique canonical-USDC reserve vault controlled by its market PDA, a bounded 1–500 bps Standby floor and a release-bound reserve solvency attestation. |
| ECON-05 | Critical | Maker collateral could be released after holder capital was removed from active totals while an illiquid exit was still owed. | The Rust core now records owner-bound, monotonically sequenced FIFO claims as explicit liabilities; later claims cannot skip a partially paid head claim. Independent closes remain available after pause/expiry, remaining-side obligations are recomputed, and maker escrow is releasable only in WindDown after both capital counters and queued liabilities reach zero. |
| PROGRAM-01 | Critical | A future SBF wrapper could accept ambiguous instruction bytes, reordered/aliased accounts, privilege changes, extra transaction instructions or replayed nonces. | The allocation-free core now freezes a versioned length-bounded ABI, exact open-account count/order/key/owner/flags, duplicate rejection, Compute-Budget-only prefixes with a terminal LevPlay instruction, and checked single-use nonces. The wrapper must source bindings from program state and remains unimplemented. |
| RELEASE-05 | Critical | The deployment schema still referenced the shelved xStocks mint and did not bind one release to its SBF, IDL, SBOM and build environment. | The schema now requires the Ondo AAPLon source boundary, source-registry and adapter hashes, program-data/loader/upgrade policy, and SHA-256 hashes for source, SBF, IDL, SBOM and immutable toolchain image. A tested CLI refuses missing, empty, oversized or duplicate artifact files. |
| PROGRAM-02 | Critical | There was no executable Solana entrypoint or reproducible SBF evidence. | A pinned `solana-program = 2.2.0` entrypoint now strictly decodes the frozen ABI and always returns a dedicated execution-lock error. Stable Agave v4.2.1 is archive-checksum pinned; CI run `35005124622` built binary SHA-256 `049111b10631459b6c8735e58bf70c73995a8f146ea1f2891da615a435534c27` and removed generated keypairs before artifact upload. This remediates build provenance only, not value-moving execution. |
| PROGRAM-03 | Critical | Program configuration and market state had no canonical representation, allowing future ambiguity, reinitialization or aliased roles. | Fixed-length versioned config/market decoders now require discriminators, initialization markers, zero reserved bytes, bounded canary parameters, and nonzero pairwise-distinct critical addresses. |
| PROGRAM-04 | Critical | Correctly shaped state bytes could be supplied from the wrong owner, address or privilege set. | SBF config/market loaders now require the LevPlay program owner, exact read/write and signer/executable flags, exact data length, and canonical PDAs whose seeds bind product mint, side, leverage and decoded bump. Token/vault/oracle account binding remains open. |

## Implemented protections

| Risk | Control |
|---|---|
| Wrong source-token mint | Every admitted market must pin the exact issuer mint in the frozen manifest and revalidate its Solana owner, authorities and extensions; the catalog alone never unlocks execution. |
| Wrong token program | Mints must be owned by the canonical Token-2022 program. |
| Corporate-action balance errors | Transaction amounts remain raw; any source-token scaling/rebase mechanism must be explicitly parsed and interactions pause around activation. |
| Issuer halt or pause ignored | Any admitted Ondo/PreStocks issuer halt, freeze, redemption stop or supported token pause must block new risk and trigger close-only handling. |
| Price API used for settlement | API quotes are reference-only. The protocol specification requires fresh Pyth and Chainlink data onchain. |
| Oracle manipulation | Both feeds are mandatory, with age, confidence, publisher and 100-bps deviation checks. |
| Malicious transfer hook | Any unexpected Token-2022 transfer-hook program blocks the mint. |
| Keeper compromise | Rebalances are permissionless and constrained by exact mints, programs, balance deltas, minimum output and oracle state. |
| Admin single point of failure | Separate governance and guardian multisigs; guardian pause is one-way; governance actions are delayed. |
| Unlimited user loss | Holder debt is impossible. A Standby floor is recognized only when an isolated USDC reserve funds it; otherwise the market is explicitly insolvent and cannot mint. |
| Fee overcharge | 50 basis points in integer USDC units, shown before signature and enforced by the release gate. |
| Fee charged on deposit | There is no LevPlay deposit account. The fee is assessed only when opening a position and is added on top of the chosen capital. |
| Unbounded pilot | $10 minimum, $100 per-wallet maximum, plus required onchain TVL and daily caps. |
| Frontend pretending to settle | The UI labels the preview, exposes blockers and disables the signing control until every gate passes. |
| Instrument confusion | Homepage and order ticket distinguish the LevPlay position token from its xStock reference without cluttering the primary message. |
| Hidden fee destination | Review shows the complete configured fee token account and treasury owner or `Not configured`; two RPCs must verify its canonical USDC mint and ownership. |
| Misstated paper P/L | Both realized and unrealized results include the 0.5% entry fee; paper cash is debited on entry and credited with sale proceeds. |
| Unsupported browser UUID | Paper records use a runtime-compatible local identifier after browser QA exposed missing `crypto.randomUUID()` support. |
| Deployment-manifest substitution | Every configured source mint must equal the separately admitted mint for the product ticker; leverage must match the product ID; vault and product-mint accounts must be distinct and unique. |
| Fake residual NAV | Each market pins a unique PDA-controlled USDC reserve and bounded Standby floor; excess decimals, displayed dust and reverse splits are never counted as collateral. |

## Source-token trust boundary

Ondo and PreStocks issuer controls, redemption availability, legal eligibility, market data and production permissions are outside LevPlay's control and remain material trust dependencies. LevPlay must verify the exact mint and authorities, obtain written wrapper/integration permission, and implement jurisdiction and eligibility controls before enabling any public mainnet market. xStocks and Hong Kong products remain shelved.

## Open critical blockers

1. The checked Rust protocol kernel and executable fail-closed SBF shell exist, but no program-owned account processor, Token-2022 CPI layer or value-moving program is deployed.
2. The vault/execution adapter has not been implemented against a confirmed liquid backing venue for every market.
3. No independent audit, fuzz suite, local-validator integration suite or mainnet-fork economic stress test has completed.
4. No governance multisig, guardian multisig or fee treasury has been supplied.
5. No production RPC quorum, monitoring, incident response or permissionless keeper set is live.
6. Securities/derivatives-law and Ondo/PreStocks jurisdiction controls are not integrated.
7. A 5× product requires dependable leverage liquidity and faster emergency deleveraging; it must not launch merely because the UI can model it.
8. GitHub CI reproducibly builds the locked SBF shell with checksum-pinned Agave v4.2.1, but no deployer ceremony, authority, funded wallet, IDL/SBOM/source bundle or independently reproduced binary exists; deployment remains blocked.
9. The owner has created the private `arults/LevPlay` GitHub repository; the verified source snapshot must be synchronized after every release.
10. No dedicated Codex Security or Solana audit service is connected in this environment. Internal automated review and GitHub CI do not replace the required independent audit.
11. GitHub branch protection and signed-commit enforcement are not enabled; the repository owner must apply the policy before mainnet release provenance can pass.
12. The fresh live-integration rerun on 2026-09-15 timed out in the restricted build environment; the earlier successful public-read evidence remains historical and must be rerun from CI or an unrestricted release runner before audit handoff.

## Required sequence

Port the reviewed integer state machine to the SVM program; compile it; run unit, property, fuzz and local-validator differential tests; deploy to devnet; run an economic stress campaign; commission an independent audit and remediate every finding; freeze the release; configure multisigs and monitoring; then run a capped mainnet canary with one 2× market before considering 3× products.
