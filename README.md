# LevPlay

LevPlay is a Solana-native infrastructure layer for 2× long and short tokenized pre-IPO economic exposure. The active public catalog is limited to eight pinned PreStocks references and two pinned Tessera references. Ondo and xStocks are not part of the active application.

## Current release boundary

- 20 isolated candidates: one 2× long and one 2× short candidate for each of ten source tokens.
- PreStocks sources: Anthropic, OpenAI, Anduril, Neuralink, Figure AI, Kalshi, Polymarket and SpaceX.
- Tessera sources: pinned T-OpenAI and T-Kalshi mints.
- Direct-wallet design: position capital plus the 0.5% entry fee is paid from the user's Solana wallet; there is no LevPlay deposit balance.
- Provider and DEX prices are display-only. They never authorize mint, redeem or rebalance.
- Real-money signing remains hard-locked in source until the exact release has deployed-program, funded-vault, dual-oracle, multisig, legal/provider-approval and independent-audit evidence.

The first auditable canary pair is `ANTH2L` and `ANTH2S`. This is a release constraint, not a claim that the pair is currently deployed or approved.

## Why “liquidation-free”

A holder buys a fully paid token rather than opening a margin account. The holder cannot be margin-called, cannot owe more than the purchase, and other wallet assets cannot be seized by the protocol. Exposure is managed in an isolated vault. A separately funded Standby reserve may remove directional exposure at a small NAV floor. This does not guarantee principal or recovery: gaps, compounding, illiquidity, issuer controls, oracle failures and smart-contract failures can still cause severe or total loss.

## Reference providers

PreStocks products provide economic exposure and do not convey shareholder ownership, voting, dividend or information rights. Tessera T-Tokens are unsecured loan participation rights, not equity. Both are external trust boundaries with issuer, liquidity, legal and operational risks. See [REFERENCE_DATA_POLICY.md](REFERENCE_DATA_POLICY.md) and [TESSERA_INTEGRATION.md](TESSERA_INTEGRATION.md).

## Development

```bash
bash scripts/sites-env.sh -- bash scripts/install-pnpm.sh
npm run lint
npm run build
npm run test:products
npm run test:venue
npm run test:oracles
npm run test:security
npm run test:release-manifest
npm run test:ui
npm run test:audit-package
cargo test --workspace --locked
```

## Production evidence required

The environment does not accept placeholders:

- `LEVPLAY_SVM_DEPLOYMENT_MANIFEST_JSON`
- `LEVPLAY_SVM_DEPLOYMENT_MANIFEST_HASH`
- `LEVPLAY_SVM_VENUE_MANIFEST_JSON`
- `LEVPLAY_SVM_PRODUCT_MANIFESTS_JSON`
- `LEVPLAY_SVM_RPC_URLS_JSON` with independent provider domains
- `LEVPLAY_SVM_EXECUTION_ENABLED=true` only after a release-bound multisig GO vote

Even perfect configuration cannot enable execution in this source revision because the value-moving handler and external-evidence signature verifier are deliberately hard-locked false. Enabling them requires audited code, deployed program identities and independently verifiable evidence.

## Public surfaces

- Homepage and documentation: [levplay.tech](https://levplay.tech)
- Application: [app.levplay.tech](https://app.levplay.tech)
- X: [@lev__play](https://x.com/lev__play)
- Email: [info@levplay.tech](mailto:info@levplay.tech)

Experimental software. Not investment advice. Availability does not establish legal eligibility.
