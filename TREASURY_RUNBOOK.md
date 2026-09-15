# LevPlay fee treasury runbook

Status: **not configured**. The current paper preview calculates the disclosed 0.5% entry fee on position capital and adds it on top for UX and accounting tests, but it does not collect or move funds. Deposits and withdrawals carry no LevPlay fee.

## Production ownership model

- The fee destination must be a USDC token account owned by a Solana multisig vault, not a founder hot wallet.
- The program stores both the exact token-account address and its expected multisig owner. Two independent mainnet RPCs must confirm the canonical USDC mint, Token Program owner and initialized state before signing can unlock.
- Use a 3-of-5 threshold for production. Avoid 1-of-N and unanimous thresholds.
- Suggested roles: founder, finance/operations, security lead, independent recovery signer and an institutional backup signer.
- Every member controls only their own hardware-wallet key. Seed phrases and private keys must never be shared with LevPlay, a deployer, a hosting provider or another signer.
- The multisig vault is a program-derived address. It has no private key of its own; the multisig program enforces the approval threshold.

## Access

The owner accesses the treasury by connecting their signer wallet to the chosen multisig interface, creating a transfer proposal and collecting at least three approvals. No single person can transfer fees alone. Signers should verify the destination, mint, amount and transaction message on independent devices before approval.

## Required setup evidence

1. Create the governance, guardian and fee-treasury multisigs with distinct responsibilities.
2. Record public member addresses, threshold and vault address. Never record seed phrases.
3. Create the treasury's canonical USDC associated token account and fund it with a dust test.
4. Prove a propose/approve/execute flow and a lost-signer replacement flow.
5. Configure the exact treasury token account in `LEVPLAY_SVM_FEE_RECIPIENT`.
6. Verify onchain that the account is initialized, uses the canonical Solana USDC mint and is owned by the expected treasury vault.
7. Pin the verified address in the program release and display it in every order review.
8. Put fee changes behind governance, a public timelock and an immutable maximum of 50 basis points; the launch release fixes the fee at 50 basis points on position capital only.

## Operational controls

- Hardware wallets for all production signers; geographically and organizationally separate failure domains.
- Treasury segmentation: fee revenue, user backing assets and deployment authority must never share a vault.
- Daily reconciliation of collected fees against onchain entry events.
- Allowlisted withdrawal destinations, spending limits and a 48-hour timelock for non-routine transfers.
- Quarterly key rotation/recovery drill and immediate signer removal after suspected compromise.
- Publicly disclose the treasury address before real-money launch.

## Current answer

No fee wallet exists today, nobody has its private key, and no real 0.5% fee is being collected. Mainnet remains locked until the multisig vault and its canonical USDC account are created and independently verified.
