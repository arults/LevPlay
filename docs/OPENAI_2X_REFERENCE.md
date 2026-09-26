# OpenAI 2X Long and Short reference gate

Status: **isolated economic reference; no mainnet execution authorization**.
This pilot covers only the OpenAI PreStocks mint and the distinct Tessera
T-OpenAI mint. They are different issuer instruments and must never share a
market, collateral account, price feed or approval. The other catalog entries
remain candidates and are outside this implementation.

## Mechanics in `lib/openai-reference.mjs`

Amounts are integer USDC base units. A user opening with capital `C` pays
`C + floor(C × 0.005)` from their wallet. Entry exposure is `2C`; the fee is
separate from collateral. The isolated counterparty commitment is `2C`, and
the segregated standby reserve is at least `ceil(C × 0.01)` in the reference
scenario. The reference requires separate available maker escrow and reserve
vault amounts before quoting. The onchain handler must prove actual token
balances, reserve them atomically and prevent concurrent reuse; caller-supplied
amounts are not funding evidence and a quote never creates funds.

For each accepted observation, interval P/L is
`floor(2 × current NAV × signed price change / previous price)` using integer
division toward zero. Long uses the price change; short reverses it. NAV is
previous NAV plus P/L and any funded reserve draw. Active exposure resets to
`2 × new NAV`, so this is interval rebalanced 2X exposure, not 2X of the
original entry for the entire holding period. At the 1% original-capital
floor, exposure becomes zero and the position enters standby. Holder loss is
limited to paid capital in this reference ledger, but the floor is contingent
on funded reserves and execution liquidity. There is no guaranteed payout.

An observation must advance its slot and attest to two independent sources.
The reference deliberately rejects a price interval outside its funded bound,
an underfunded floor or gain, stale observations, expired quotes, insufficient
maker commitment, bad source identity, close slippage and repeated closes.
These rejections are **halts**, not permission to use a clamped price.
The `primary` and `secondary` flags are test fixtures, not signature or owner
verification. `closePosition` computes a liability; it does not transfer USDC.

## Production interface and release gates

The actual SBF handler must derive fixed market and wallet PDAs, verify signer,
nonce, source mint and token program identities, exact account owners and
balances, canonical USDC, independent oracle owners/feed IDs and timestamps,
market hours/halts, price confidence and divergence, transaction expiry and
slippage. It must atomically transfer USDC, reserve maker and floor funds,
mint/burn shares, reconcile liabilities and settle or queue closes. Every
value-moving CPI needs a pinned audited adapter and a bounded compute/priority
fee plan. An RPC/issuer API price is display-only. Vercel is an interface host,
not the settlement authority.

The current repository contains an economic core and account validators, but
no wired value-moving SBF entrypoint. Its release manifest v2 now pins the
PreStocks OpenAI pair, and the execution switch is hard locked. There is no
OpenAI-specific audited program binary, deployed account manifest, funded
escrow proof, production oracle pair, signed provider approvals, legal
eligibility decision, independent security and quantitative audits, retests,
or governance GO vote. No script may treat the passing model tests as these
artifacts. The proposed one-interval bound cannot safely absorb arbitrary
overnight gaps or open-ended long upside; a quantitative risk design and
funded unwind route must close this gap before mainnet certification.

## Phased rollout decision

1. **Reference build:** OpenAI PreStocks and Tessera economic ledger and
   isolated tests are implemented.
2. **Validation:** deterministic positive and negative cases pass locally;
   SBF integration, independent audit, source authority and funding checks
   remain open. Phase 2 is therefore not certified.
3. **Template and remaining assets:** blocked until the OpenAI product is
   certified, with separate evidence per issuer and market.
4. **Documentation:** this status page and README describe the pilot. Public
   product claims must continue to say candidate rather than live execution.

Run `node --test tests/openai-reference.mjs` for the isolated model checks.
No mainnet deployment command is supplied because the executable handler and
required immutable release evidence do not yet exist.
