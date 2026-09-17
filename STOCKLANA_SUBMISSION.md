# LevPlay — Stocklana 2026 Submission Pack

## Submission links

- Homepage and documentation: https://levplay.tech
- Safety-locked trading demo: https://app.levplay.tech
- GitHub: https://github.com/arults/LevPlay
- Primary track: Stocklana Main Track
- Sponsor track: Best Use of PreStocks

> **Deadline warning:** the official Stocklana page currently contains two different dates: the page header says September 25, 2026, while its timeline says Friday, September 18 at 4:00 PM ET. Submit by the earlier date unless the organizers confirm otherwise in writing.

## Project name

LevPlay

## Tagline

Liquidation-free leveraged stocks on Solana: prepaid, isolated vault tokens with no user margin account.

## 50-word description

LevPlay is a Solana-native infrastructure layer for prepaid leveraged stock exposure. Users connect a wallet, choose long or short exposure, select leverage, and receive tokenized vault shares. Because the holder does not borrow through a margin account, there is no holder liquidation or debt beyond the prepaid purchase amount.

## Full submission description

Leveraged equity products usually force users into margin accounts, deposits, collateral management and liquidation risk. LevPlay packages leverage as a fully prepaid, transferable token claim on an isolated Solana risk vault. A user connects a wallet, chooses a public-stock, commodity or PreStocks reference, selects long or short exposure and confirms one atomic transaction. The wallet pays the selected position capital plus a 0.5% entry fee; no app deposit is required.

Each product has a segregated vault, bounded issuance, oracle admission rules and a rebalance policy. Users never owe more than their purchase amount and are not forcibly closed out of a personal margin account. The token can still lose substantial or all economic value: “liquidation-free” is not “risk-free.” This distinction is explicit in the UI and protocol design.

The working product currently presents 15 stock references, 5 commodity-linked references and 8 PreStocks references, producing 136 candidate long/short/leverage combinations. The end-to-end demo covers wallet-style entry, order review, portfolio P&L, closing and history. Real-money signing is deliberately fail-closed until deployed-program, collateral, oracle, multisig, independent-audit, operational and legal evidence is complete.

## Problem

- Margin and perpetual products can close positions during temporary adverse moves.
- Deposit-first trading creates extra custody friction.
- Tokenized public stocks and pre-IPO references lack a unified, self-custodial leveraged-token layer.
- A displayed market price is often mistaken for a safe onchain settlement price.

## Solution

- Direct-wallet trading; no LevPlay deposit account.
- Prepaid maximum holder risk, represented by a transferable token.
- Long and short products backed by isolated collateral vaults.
- Atomic capital transfer, fee collection and share minting.
- Fail-closed oracle, keeper, RPC, governance, exit and release gates.

## Why Solana

- Atomic transactions reduce partial-execution risk.
- Low transaction cost makes frequent risk checks and rebalances practical.
- Token-2022-compatible vault shares remain composable in the user’s wallet.
- Multiple permissionless keeper operators can reduce operational concentration.
- A strong tokenized-asset and wallet ecosystem makes distribution native.

## PreStocks integration

Launch scope includes Anthropic, OpenAI, Anduril, Neuralink, Figure AI, Kalshi, Polymarket and SpaceX, with 2× long and 2× short candidates. xAI is intentionally excluded. LevPlay pins exact Solana mints, displays available Solana DEX references, isolates each product’s collateral, and treats issuer, redemption, liquidity and eligibility constraints as explicit risk inputs. PreStocks exposure does not confer equity ownership, voting, dividend or information rights.

## What is innovative

LevPlay separates holder liquidation from protocol risk. Instead of making the user maintain collateral against debt, LevPlay sells a prepaid vault claim with bounded holder liability. The innovation is the infrastructure boundary: product-isolated vaults, guarded NAV accounting, redundant settlement inputs, open rebalance execution and evidence-gated activation on Solana.

## Security architecture

- Two independent oracle providers with owner, freshness, confidence and deviation checks.
- Three RPC providers and quorum before signing.
- Three independent keeper operators.
- Separate governance and guardian multisigs with disjoint signer sets.
- Two independent exit operators.
- Isolated collateral vault per product.
- 48-hour upgrade delay.
- Atomic rollback, account-substitution, replay, overflow and invariant test requirements.
- Real-money path defaults to locked when any release gate is absent.

## Business model

LevPlay charges 0.5% of position capital when a trade is opened. It does not charge users to connect a wallet or deposit. Example: a $500 position produces a $2.50 fee and a $502.50 wallet debit. Expansion revenue follows verified market capacity, not UI availability.

## Current status

### Working

- Production website and responsive trading experience.
- Catalog of 28 references and 136 candidate products.
- End-to-end demo: select → review → open → portfolio/P&L → close → history.
- Exact PreStocks mint registry.
- Fee-on-entry model.
- Fail-closed release lock and no-single-point-of-failure admission rules.
- Automated CI, UI and protocol-model tests.

### Still gated before real money

- Compiled, independently audited and mainnet-deployed Solana program.
- Funded, segregated product vaults and market-maker collateral.
- Production oracle accounts validated onchain.
- Live governance/guardian multisigs and keeper/exit operators.
- PreStocks/Ondo production permissions and legal eligibility approval.
- Independent audit, retest and economic-risk review.
- Capped mainnet canary evidence.

## Rollout plan

1. Audit and deploy one isolated AAPL2L vault plus one AAPL2S vault.
2. Cap each wallet at $100 and the complete canary at $1,000.
3. Verify mint, rebalance, NAV, redemption, emergency pause and wind-down evidence.
4. Admit eight PreStocks 2L/2S vaults only after issuer/liquidity approval.
5. Expand to 15 stocks and 5 commodity references.
6. Enable 3× and later 5× only after observed performance and refreshed audit scope.

## 90-second demo video script

**0–10 sec — Problem**  
“Leveraged stock trading usually means deposits, margin calls and forced liquidation. LevPlay changes the wrapper.”

**10–25 sec — Homepage**  
“LevPlay is a Solana-native layer for prepaid leveraged stock tokens. The holder buys a finite-risk vault claim and never maintains a personal margin account.”

**25–45 sec — Open a position**  
“Connect a wallet, choose a stock or PreStocks reference, select long or short and the leverage. A $500 position adds a 0.5% entry fee, so the wallet confirms $502.50 in one atomic flow.”

**45–60 sec — Portfolio**  
“The token sits in the user’s wallet. Portfolio shows nominal value, entry, current NAV and unrealized P&L. The user can close without withdrawing from a LevPlay account.”

**60–75 sec — Safety**  
“Every product is isolated. Settlement requires redundant oracles, RPC quorum and independent keeper operations. If evidence is missing, signing stays locked.”

**75–90 sec — Why it matters**  
“LevPlay brings public stocks, commodities and eight PreStocks references into one liquidation-free holder experience. We are applying to Stocklana to complete the audited, production-backed path.”

## Three-minute judge walkthrough

1. Open the homepage and state the holder-versus-protocol risk distinction.
2. Enter the app and show Stocks, Commodities and Pre-IPO categories.
3. Select Anthropic, then 2× Long; point out the underlying reference and guard state.
4. Enter $500 and show the $2.50 fee-on-top calculation.
5. Complete the demo position, show portfolio P&L, then close it.
6. Open history to prove the full user loop.
7. Explain why real-money signing is locked and show the launch checklist as evidence of fail-closed behavior.
8. Close with the PreStocks integration, audit and market-maker asks.

## Suggested judge answers

**Is it really liquidation-free?**  
For the holder, yes: there is no user margin account, collateral call or debt beyond the prepaid purchase. The token can still suffer severe or total economic loss, and the protocol’s backing layer still requires collateral and rebalancing.

**What happens near zero NAV?**  
The product enters a guarded or Standby state according to the product policy; issuance can stop while redemption and wind-down rules protect settlement integrity. A tiny quoted value is not a guarantee of recovery.

**What is live today?**  
The product experience, market registry, fee model, safety gates and end-to-end demo are live. Real-money settlement is intentionally locked until audited deployment and external dependencies are evidenced.

**Why not use perps?**  
Perps give the user a leveraged margin position. LevPlay gives the user a prepaid, transferable vault token with bounded holder liability and no personal liquidation engine.

**Why PreStocks?**  
PreStocks provides onchain economic references for companies that are otherwise hard to access. LevPlay adds a distinctly Solana-native leveraged-token and risk-isolation layer while preserving all issuer and eligibility disclosures.

## Final submission checklist

- [ ] Confirm the organizer’s deadline discrepancy; operate to September 18, 2026 at 4:00 PM ET.
- [ ] Register the founder and all teammates on the hackathon portal.
- [ ] Add a one-line founder bio and contact details.
- [x] Publish the canonical GitHub repository for judge review.
- [ ] Upload the 10-slide pitch deck PDF.
- [ ] Record the 90-second product demo using the script above.
- [ ] Verify the public demo URL in a signed-out browser and on mobile.
- [ ] Submit both Main Track and Best Use of PreStocks.
- [ ] Include the live app, GitHub and video URLs.
- [ ] State real-money status exactly; do not call the safety-locked prototype mainnet-live.
- [ ] Re-open the submitted entry and verify every link before the earlier deadline.

## Sources

- Stocklana: https://hackathons.solana.com/hackathons/stocklana
- PreStocks products: https://prestocks.com/products
- Ondo Global Markets: https://ondo.finance/ondo-stocks
- Solana docs: https://solana.com/docs
- LevPlay homepage: https://levplay.tech
- LevPlay safety-locked demo: https://app.levplay.tech
- Public source: https://github.com/arults/LevPlay
- LevPlay repository: https://github.com/arults/LevPlay
