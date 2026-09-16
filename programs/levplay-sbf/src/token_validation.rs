//! Canonical SPL Token and Token-2022 account parsing.
//!
//! The execution layer must never infer a token program from caller-supplied
//! accounts. Settlement USDC is bound to the legacy SPL Token program and
//! LevPlay product tokens are bound to Token-2022 by persisted config/market
//! state before these helpers are called.

use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, program_option::COption,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_token::state::{
    Account as LegacyTokenAccount, AccountState as LegacyAccountState, Mint as LegacyMint,
};
use spl_token_2022::{
    extension::{BaseStateWithExtensions, ExtensionType, StateWithExtensions},
    state::{
        Account as Token2022Account, AccountState as Token2022AccountState, Mint as Token2022Mint,
    },
};

fn validate_account_envelope(
    account: &AccountInfo<'_>,
    expected_key: Option<&Pubkey>,
    expected_program: &Pubkey,
    writable: bool,
) -> Result<(), ProgramError> {
    if expected_key.is_some_and(|key| account.key != key) {
        return Err(ProgramError::InvalidArgument);
    }
    if account.owner != expected_program {
        return Err(ProgramError::IncorrectProgramId);
    }
    if account.is_signer || account.is_writable != writable || account.executable {
        return Err(ProgramError::InvalidArgument);
    }
    Ok(())
}

/// Parse the configured settlement mint as a canonical legacy SPL mint.
pub fn validate_legacy_mint(
    account: &AccountInfo<'_>,
    expected_mint: &Pubkey,
    expected_decimals: u8,
) -> Result<LegacyMint, ProgramError> {
    validate_account_envelope(account, Some(expected_mint), &spl_token::ID, false)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let mint = LegacyMint::unpack(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if !mint.is_initialized || mint.decimals != expected_decimals {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(mint)
}

/// Parse a legacy SPL token account and bind it to an exact mint and authority.
///
/// Delegated, native-wrapped and closeable accounts are rejected. This keeps
/// value-moving routes from accepting balances with hidden third-party control.
pub fn validate_legacy_token_account(
    account: &AccountInfo<'_>,
    expected_mint: &Pubkey,
    expected_authority: &Pubkey,
    writable: bool,
) -> Result<LegacyTokenAccount, ProgramError> {
    validate_account_envelope(account, None, &spl_token::ID, writable)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let token = LegacyTokenAccount::unpack(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if token.mint != *expected_mint
        || token.owner != *expected_authority
        || token.state != LegacyAccountState::Initialized
        || token.delegate != COption::None
        || token.is_native != COption::None
        || token.close_authority != COption::None
    {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(token)
}

/// Parse a LevPlay product mint and apply a default-deny extension policy.
///
/// The pilot product mint intentionally has no Token-2022 extensions. Transfer
/// fees, hooks, permanent delegates, pausing, close authorities, scaled UI
/// amounts and future extensions therefore cannot silently change holder
/// economics or introduce an external control plane.
pub fn validate_product_mint(
    account: &AccountInfo<'_>,
    expected_mint: &Pubkey,
    expected_mint_authority: &Pubkey,
    expected_decimals: u8,
    writable: bool,
) -> Result<Token2022Mint, ProgramError> {
    validate_account_envelope(account, Some(expected_mint), &spl_token_2022::ID, writable)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let mint = StateWithExtensions::<Token2022Mint>::unpack(&data)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    let extensions = mint
        .get_extension_types()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if !extensions.is_empty()
        || !mint.base.is_initialized
        || mint.base.decimals != expected_decimals
        || mint.base.mint_authority != COption::Some(*expected_mint_authority)
        || mint.base.freeze_authority != COption::None
    {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(mint.base)
}

/// Parse a Token-2022 product holding account.
///
/// Only ImmutableOwner is admitted because the associated-token program may
/// initialize that defensive extension. Every extension with economic or
/// transfer semantics is rejected.
pub fn validate_product_token_account(
    account: &AccountInfo<'_>,
    expected_mint: &Pubkey,
    expected_authority: &Pubkey,
    writable: bool,
) -> Result<Token2022Account, ProgramError> {
    validate_account_envelope(account, None, &spl_token_2022::ID, writable)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let token = StateWithExtensions::<Token2022Account>::unpack(&data)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    let extensions = token
        .get_extension_types()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if extensions
        .iter()
        .any(|extension| *extension != ExtensionType::ImmutableOwner)
        || token.base.mint != *expected_mint
        || token.base.owner != *expected_authority
        || token.base.state != Token2022AccountState::Initialized
        || token.base.delegate != COption::None
        || token.base.is_native != COption::None
        || token.base.close_authority != COption::None
    {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(token.base)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account_info<'a>(
        key: &'a Pubkey,
        owner: &'a Pubkey,
        writable: bool,
        lamports: &'a mut u64,
        data: &'a mut [u8],
    ) -> AccountInfo<'a> {
        AccountInfo::new(key, false, writable, lamports, data, owner, false, 0)
    }

    #[test]
    fn legacy_mint_is_bound_to_key_program_state_and_decimals() {
        let key = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mut mint = LegacyMint {
            mint_authority: COption::Some(authority),
            supply: 10,
            decimals: 6,
            is_initialized: true,
            freeze_authority: COption::None,
        };
        let mut data = vec![0_u8; LegacyMint::LEN];
        LegacyMint::pack(mint, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(&key, &spl_token::ID, false, &mut lamports, &mut data);
        assert!(validate_legacy_mint(&account, &key, 6).is_ok());
        assert_eq!(
            validate_legacy_mint(&account, &Pubkey::new_unique(), 6),
            Err(ProgramError::InvalidArgument)
        );
        assert_eq!(
            validate_legacy_mint(&account, &key, 8),
            Err(ProgramError::InvalidAccountData)
        );

        mint.is_initialized = false;
        let mut data = vec![0_u8; LegacyMint::LEN];
        LegacyMint::pack(mint, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(&key, &spl_token::ID, false, &mut lamports, &mut data);
        assert!(validate_legacy_mint(&account, &key, 6).is_err());
    }

    #[test]
    fn legacy_account_rejects_wrong_mint_authority_and_delegate() {
        let key = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let delegate = Pubkey::new_unique();
        let mut token = LegacyTokenAccount {
            mint,
            owner: authority,
            amount: 100,
            delegate: COption::None,
            state: LegacyAccountState::Initialized,
            is_native: COption::None,
            delegated_amount: 0,
            close_authority: COption::None,
        };
        let mut data = vec![0_u8; LegacyTokenAccount::LEN];
        LegacyTokenAccount::pack(token, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(&key, &spl_token::ID, true, &mut lamports, &mut data);
        assert!(validate_legacy_token_account(&account, &mint, &authority, true).is_ok());
        assert!(validate_legacy_token_account(
            &account,
            &Pubkey::new_unique(),
            &authority,
            true
        )
        .is_err());
        assert!(validate_legacy_token_account(
            &account,
            &mint,
            &Pubkey::new_unique(),
            true
        )
        .is_err());

        token.delegate = COption::Some(delegate);
        token.delegated_amount = 1;
        let mut data = vec![0_u8; LegacyTokenAccount::LEN];
        LegacyTokenAccount::pack(token, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(&key, &spl_token::ID, true, &mut lamports, &mut data);
        assert_eq!(
            validate_legacy_token_account(&account, &mint, &authority, true),
            Err(ProgramError::InvalidAccountData)
        );
    }

    #[test]
    fn product_mint_requires_token_2022_authority_and_no_extensions() {
        let key = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mint = Token2022Mint {
            mint_authority: COption::Some(authority),
            supply: 0,
            decimals: 6,
            is_initialized: true,
            freeze_authority: COption::None,
        };
        let mut data = vec![0_u8; Token2022Mint::LEN];
        Token2022Mint::pack(mint, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(
            &key,
            &spl_token_2022::ID,
            true,
            &mut lamports,
            &mut data,
        );
        assert!(validate_product_mint(&account, &key, &authority, 6, true).is_ok());
        assert!(validate_product_mint(
            &account,
            &key,
            &Pubkey::new_unique(),
            6,
            true
        )
        .is_err());

        let wrong_program = spl_token::ID;
        let mut lamports = 1;
        let account = account_info(&key, &wrong_program, true, &mut lamports, &mut data);
        assert_eq!(
            validate_product_mint(&account, &key, &authority, 6, true),
            Err(ProgramError::IncorrectProgramId)
        );
    }

    #[test]
    fn product_account_rejects_frozen_and_closeable_balances() {
        let key = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mut token = Token2022Account {
            mint,
            owner: authority,
            amount: 50,
            delegate: COption::None,
            state: Token2022AccountState::Initialized,
            is_native: COption::None,
            delegated_amount: 0,
            close_authority: COption::None,
        };
        let mut data = vec![0_u8; Token2022Account::LEN];
        Token2022Account::pack(token, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(
            &key,
            &spl_token_2022::ID,
            true,
            &mut lamports,
            &mut data,
        );
        assert!(validate_product_token_account(&account, &mint, &authority, true).is_ok());

        token.state = Token2022AccountState::Frozen;
        token.close_authority = COption::Some(authority);
        let mut data = vec![0_u8; Token2022Account::LEN];
        Token2022Account::pack(token, &mut data).unwrap();
        let mut lamports = 1;
        let account = account_info(
            &key,
            &spl_token_2022::ID,
            true,
            &mut lamports,
            &mut data,
        );
        assert_eq!(
            validate_product_token_account(&account, &mint, &authority, true),
            Err(ProgramError::InvalidAccountData)
        );
    }

    #[test]
    fn malformed_data_fails_closed() {
        let key = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let mut lamports = 1;
        let mut data = [0_u8; 9];
        let account = account_info(&key, &spl_token_2022::ID, false, &mut lamports, &mut data);
        assert_eq!(
            validate_product_mint(&account, &key, &authority, 6, false),
            Err(ProgramError::InvalidAccountData)
        );
    }
}
