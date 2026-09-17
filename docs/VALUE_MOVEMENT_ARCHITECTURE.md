# LevPlay value-movement architecture

Status: **audit-facing design; not implemented and not deployment evidence**  
Scope: isolated `AAPL2L` and `AAPL2S` 2x canary markets on Solana  
Last updated: 2026-09-17

This document defines the minimum architecture required before LevPlay may replace its
execution-locked SBF shell with a value-moving release. It intentionally does not assign
production addresses, claim venue approval, claim oracle availability, or claim that the
current program can accept funds.

The current SBF entrypoint validates part of the `Open` account envelope and then returns
`EXECUTION_LOCKED_ERROR`. The economic core models fees, shares, caps, oracle agreement,
isolated risk capacity and wind-down behavior, but those functions are not connected to
program-owned state or token CPIs. That fail-closed boundary must remain until this entire
document is implemented, tested and independently audited for one exact release.

## Safety objective

For a holder, “liquidation-free” means:

- no holder margin account, margin call, negative balance or claim on other wallet assets;
- maximum wallet loss is limited to the amount paid for the position and disclosed fee;
- each position token is a pro-rata claim on one isolated market, not on LevPlay generally;
- opening, backing, fee collection and share issuance either all commit or all roll back;
- closing burns shares before value leaves the market and either pays atomically or creates
  a program-owned FIFO claim.

It does **not** mean that principal, a non-zero NAV, recovery, liquidity or continuous
trading is guaranteed. A market can enter Standby, WindDown or Insolvent state. Standby NAV
is real only when an isolated reserve funds it; token decimals or a displayed price floor
are not collateral.

## Why the current layout cannot move value

The current 16-account `Open` boundary is insufficient for a safe handler:

- it has no wallet/market position PDA in which to persist a single-use nonce, wallet
  capital and cost basis;
- it has no Clock sysvar for quote expiry, oracle time or market-session enforcement;
- market state stores configured caps but not current TVL, daily counters, NAV, exposure,
  liabilities or the last settled observation;
- the normalized oracle-envelope validator is not invoked by the entrypoint and is not a
  native Pyth account parser;
- the adapter identity is pinned, but no adapter instruction, account schema, capacity
  proof, balance-delta contract or unwind route is frozen;
- `Close` has no exact account parser or value-moving handler.

Adding only a transfer or mint CPI would therefore create replay, cap, pricing, solvency
and stranded-fund risk. `Open` and `Close` must reach the audit boundary together; a live
deposit-only release is forbidden.

## Program-owned state

Configuration and accounting use separate versioned accounts so an immutable identity
boundary is not confused with mutable balances.

| Account | Role | Minimum bound fields |
|---|---|---|
| Global configuration PDA | Protocol-wide immutable and governed bounds | canonical USDC mint/program, fee vault and treasury owner, governance, guardian, fee ceiling, timelock |
| Market configuration PDA | Immutable identity for one side/leverage product | side, 2x leverage, product mint/program, all vaults, oracle accounts/programs/feed IDs, adapter program/market/version, caps, oracle policy, session policy |
| Market accounting PDA | Mutable ledger for one market | mode, epoch, total shares, capital, conservative NAV, exposure, queued liabilities, daily epoch/minted/redeemed, last settled price/time/slot, next claim ID |
| Position PDA | Wallet-and-market replay/cap domain | owner, market, product mint, shares or reconciled balance, open capital, fee-inclusive cost basis, next nonce, opened/updated slots |
| Paired risk-vault PDA | Solvency ledger shared only by the admitted pair | long/short capital, matched and residual exposure, maker collateral, reserves, unwind capacity, commitment expiry, queued liabilities, epoch and mode |
| FIFO claim PDA | Illiquid-close liability | owner, market, sequence, shares burned, USDC due/paid, created/settled slots and status |

Every layout must have an exact discriminator, version, initialized marker, length and
zeroed reserved bytes. Every encoder must be the inverse of the strict decoder. Duplicate
initialization, unknown versions, non-zero reserved bytes, invalid enum values, aliased
roles and non-canonical PDAs fail closed.

The program must reconcile persisted accounting to actual SPL token balances and product
mint supply. Stored counters alone never prove collateral.

## Exact account boundary

The final `Open` and `Close` account arrays must be frozen in the IDL and release manifest.
They require, at minimum:

1. wallet signer, canonical wallet USDC account and canonical wallet product account;
2. global configuration, market configuration, market accounting, position and paired
   risk-vault PDAs;
3. canonical USDC mint, product mint, clearing vault, fee vault, isolated reserve and the
   side-specific maker-collateral vaults;
4. native Pyth update account, independent secondary observation account, Clock sysvar and
   instructions sysvar;
5. the one compiled adapter program, exact adapter market and its fixed reviewed accounts;
6. canonical SPL Token, Token-2022 and System programs, plus only the sysvars required by
   the reviewed implementation.

No remaining accounts, caller-selected CPI bytes, fee recipient, mint, oracle, adapter,
destination or writable account are accepted. Account key, owner, signer, writable and
executable flags are checked exactly, and all roles that must be isolated are pairwise
distinct. The LevPlay instruction remains the final top-level instruction and may only be
preceded by the bounded Compute Budget prefix defined by the ABI.

## Oracle and market-session gate

Every value-moving or exposure-changing instruction must apply the same onchain gate:

1. Read Solana Clock and reject an expired quote or future-dated observation.
2. Parse the admitted native Pyth receiver/update account with the pinned owner and exact
   AAPL feed ID. Enforce full verification where supported, publish-time age, confidence
   and integer exponent normalization.
3. Parse an independently operated onchain secondary account with a distinct owner,
   provider and update authority. An HTTP API, issuer page, DEX quote or a second account
   controlled by the same operator is display data, not independent settlement evidence.
4. Require both positive observations, the configured publisher/verification threshold
   and deviation at or below the market bound.
5. Require the configured primary trading session to be open and reject an exchange halt,
   stale calendar, pending split/dividend/merger adjustment, issuer pause/freeze or an
   unresolved corporate action.
6. Settle accounting through the admitted observation before pricing new shares or a
   redemption. Persist the exact feed values, publish times and settled slot.

The production representation of sessions, holidays, early closes, halts and corporate
actions must be independently authenticated and reviewed. A browser clock or backend API
cannot unlock an onchain instruction.

## `Open` atomic invariants

`Open(capital, minimum_shares_out, quote_expiry_slot, nonce)` charges
`floor(capital * 50 / 10_000)` USDC on top of capital. The handler must:

1. validate the exact transaction and account boundary, PDA seeds, token programs, mint
   decimals/extensions and market `Active` state;
2. pass the oracle/session/corporate-action gate;
3. consume the position-scoped nonce and reject any skipped or reused value;
4. settle the market, reconcile supply/assets/liabilities and compute shares from
   conservative pre-deposit NAV with floor rounding and an initial-share-inflation defense;
5. enforce minimum capital, slippage, per-transaction, per-wallet, TVL, daily-mint and
   committed-capacity limits using checked integer arithmetic;
6. prove actual reserve/maker balances, commitment horizon and unwind capacity satisfy the
   post-open risk quote;
7. transfer capital to the isolated clearing vault and the fee to the pinned
   multisig-controlled USDC fee vault;
8. invoke only the compiled adapter action, then verify exact pre/post token, position and
   liability deltas against a conservative minimum output;
9. mint exactly the computed product shares to the signer's token account using the market
   PDA authority;
10. update market, risk-vault and position accounting and emit a deterministic event that
    includes capital, fee, shares, nonce, oracle observations and adapter deltas.

Solana transaction atomicity provides rollback only if every step is in the same
transaction and every CPI error propagates. Tests must force failure after each staged CPI
and prove that balances, supply, nonces and state remain byte-for-byte unchanged.

## `Close` atomic invariants

`Close(shares_in, minimum_usdc_out, quote_expiry_slot, nonce)` charges no LevPlay close fee
for the canary. The handler must:

1. enforce the same account, nonce, Clock, oracle, session and reconciliation boundary;
2. compute conservative pro-rata USDC due from settled NAV and reject slippage;
3. prove the signer owns the shares and the close does not skip an existing FIFO rule;
4. unwind only through the market's exact adapter and verify pre/post deltas and maximum
   price impact;
5. burn shares before USDC leaves the isolated market;
6. pay the signer's canonical USDC account atomically when liquidity is available, then
   update all capital, exposure, supply, liability, daily-redemption and position counters;
7. otherwise burn once, create one owner-bound monotonically sequenced FIFO claim for the
   exact unpaid liability, and keep maker collateral locked until all claims are paid.

Close-only mode must remain available during an issuer/source outage when a conservative,
audited pro-rata redemption is possible. No keeper may become a custody signer or choose a
recipient.

## Long and short collateral are not interchangeable

`AAPL2L` and `AAPL2S` must have separate product mints, accounting, vaults, nonce domains,
caps, adapter markets and wind-down evidence.

### AAPL2L

A synthetic writer of uncapped 2x long returns has unbounded upside liability. A safe long
route therefore needs admitted source exposure (for example, program-controlled AAPL-linked
inventory) plus prepaid, non-recallable additional risk capital and deterministic unwind.
Alternatively, the payoff must disclose and enforce an explicit cap, making it a different
product. USDC collateral alone does not prove an uncapped long is fully collateralized.

### AAPL2S

For a discrete interval, the holder's 2x inverse gain is bounded by the reference asset's
maximum 100% fall, while the holder's loss floors at the position NAV. A prepaid synthetic
short can therefore be bounded only if its exact reset interval, maximum payout, user
capital, maker payout collateral, Standby reserve and gap policy are enforced onchain.
That economic bound does not admit an ordinary naked borrow or margin short: an external
short hedge can still have unbounded adverse loss and liquidation risk. If an external
short adapter is used, it must separately prove a non-recourse maximum loss, committed
capacity and deterministic buy-to-cover path.

Matched long/short flow reduces residual exposure but never allows one side to borrow the
other side's isolated reserve or evade its own maximum-liability proof.

## Safe implementation sequence

1. **State v2, still locked:** implement strict encode/decode and PDA loaders for market
   configuration, market accounting, paired risk vault and position accounts. Add no value
   CPI and expose no production initializer.
2. **Oracle/session boundary, still locked:** integrate native Pyth parsing, the independent
   secondary, Clock and fail-closed session/halt/corporate-action state.
3. **One adapter, still locked:** freeze one versioned adapter ABI and exact accounts;
   implement capacity, commitment, unwind and pre/post-delta validation.
4. **Open and Close together, still locked:** implement both complete transitions and all
   CPIs. A partial deposit-only deployment is prohibited.
5. **Adversarial verification:** unit, property, fuzz, differential and local-validator
   tests; devnet deployment and stress/rollback campaign.
6. **Independent review:** Solana program audit and retest plus independent economic/oracle
   review against the exact reproducible SBF/IDL/SBOM/source hashes.
7. **Operational admission:** funded isolated vaults, multisig and timelock ceremony,
   monitoring, permissionless keepers, incident/wind-down drills, legal approval and
   machine-verifiable release evidence.
8. **Capped canary:** explicit multisig GO vote, at most $1,000 aggregate and $100 per
   wallet, followed by reconciliation and the checklist observation window.

Each step preserves the execution lock until all earlier steps have auditable evidence.

## Required adversarial evidence

### Rust and property tests

- strict layout round trips and rejection of truncation, version drift, reserved bytes,
  invalid enums, duplicate initialization and aliased addresses;
- fee ceiling, rounding direction, first-deposit/donation defenses, zero-supply transitions,
  NAV/share conservation and checked-arithmetic boundaries;
- exact cap boundaries, day rollover, nonce sequencing, reordered submissions and
  randomized open/close/claim sequences;
- long/short isolation and proof that no vault, mint, claim or solvency counter is shared.

### Oracle and market tests

- wrong owner/feed, stale/future price, excessive confidence, insufficient verification,
  exponent overflow/underflow, zero/negative price and cross-feed deviation;
- normal sessions, holidays, early closes, daylight-saving changes, scheduled and surprise
  halts, splits, dividends, mergers and source-token scaling/freeze changes;
- Pyth unavailable, secondary unavailable and disagreement all fail closed.

### Local-validator and CPI tests

- permute and duplicate every account; mutate key, owner, signer, writable, executable,
  mint, decimals, authority and Token-2022 extension;
- adapter success, wrong asset, wrong amount, partial fill, excessive slippage, malicious
  return data, reentrancy-shaped CPI attempt and failure at every stage;
- atomic rollback after capital transfer, fee transfer, adapter action, mint, burn and
  payout; state and balances must remain unchanged;
- maker commitment expiry, attempted early collateral withdrawal, source outage, empty
  liquidity, FIFO partial payment, WindDown and emergency redemption without the frontend;
- differential execution against the reviewed economic model across randomized sequences.

### Release and operations tests

- independently reproduce SBF, IDL, SBOM and source hashes;
- verify program-data, upgrade authority/timelock, vaults, mints, oracles, adapter and
  multisigs through independent RPCs;
- reconcile every share, asset, liability, fee and adapter position during devnet and the
  capped mainnet canary;
- complete oracle, RPC, keeper, signer, source-provider and adapter-outage drills.

## Explicit non-claims

Until every critical checklist gate is evidenced for the exact release, LevPlay does not
claim that:

- the current SBF shell moves funds or is ready for a deposit;
- AAPL2L or AAPL2S is fully collateralized onchain;
- Pyth or an independent secondary is enforced by a value-moving instruction;
- Ondo, PreStocks, Tessera or another provider has approved a leveraged wrapper;
- a production long or short adapter, market-maker commitment or unwind route exists;
- the program has passed an independent audit, devnet campaign or real-money canary;
- “liquidation-free” means no loss, guaranteed recovery, guaranteed liquidity or a token
  price that can never reach economic zero.

The release decision remains the objective result of
[`MAINNET_LAUNCH_CHECKLIST.md`](../MAINNET_LAUNCH_CHECKLIST.md), not this design document.
