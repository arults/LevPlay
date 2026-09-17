# Reference and Settlement Data Policy

LevPlay treats display references and settlement oracles as separate trust domains.

## Display references

- Ondo stock and commodity references require the server-side `ONDO_API_KEY`.
- PreStocks secondary-market references are pinned by mint and selected from Solana pairs by highest reported liquidity.
- Display data is never passed into a value-moving instruction.
- The API emits an explicit state for every market: `live`, `stale`, `provider_unconfigured`, `provider_offline`, or `not_admitted`.
- A stale or missing display quote remains visible as status information and cannot silently fall back to a fabricated price.

## Settlement oracles

A market may execute only after its program-owned market state pins:

1. the primary oracle account and its owner program;
2. the secondary oracle account and its owner program;
3. freshness, confidence and maximum-deviation bounds; and
4. the exact product mint, token program, vaults and admitted adapter.

Both normalized observations must pass in the same atomic transaction. Failure, staleness, owner substitution, account substitution, excessive confidence width or excessive cross-source deviation fails closed before funds move.

## Production configuration

Required display configuration:

- `ONDO_API_KEY`: production credential issued by Ondo.
- `LEVPLAY_SVM_READ_RPC`: authenticated HTTPS Solana read endpoint.

Required settlement evidence is not an environment-variable shortcut. Exact oracle program IDs, feed accounts and risk limits must be written to program-owned market state through the audited governance path and independently verified onchain.

## Operations

- Alert on provider state changes and stale-reference rates.
- Use at least two independent Solana RPC operators for reads and transaction confirmation.
- Never promote display availability to settlement readiness.
- Keep opening and minting disabled when either settlement source fails; close-only recovery must follow the audited wind-down path.
- Record provider, timestamp, feed account, owner program and validation outcome in release/canary evidence without recording API secrets.
