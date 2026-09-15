//! SBF-specific ownership, privilege and canonical-PDA validation.

use levplay_core::{
    decode_config_state, decode_market_state, ConfigState, MarketState, Side, CONFIG_STATE_LEN,
    MARKET_STATE_LEN,
};
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

pub const CONFIG_SEED: &[u8] = b"config";
pub const MARKET_SEED: &[u8] = b"market";

pub fn canonical_config_address(
    program_id: &Pubkey,
    bump: u8,
) -> Result<Pubkey, ProgramError> {
    let bump_seed = [bump];
    Pubkey::create_program_address(&[CONFIG_SEED, &bump_seed], program_id)
        .map_err(|_| ProgramError::InvalidSeeds)
}

pub fn canonical_market_address(
    program_id: &Pubkey,
    state: &MarketState,
) -> Result<Pubkey, ProgramError> {
    let side_seed = [state.side as u8];
    let leverage_seed = state.leverage_bps.to_le_bytes();
    let bump_seed = [state.bump];
    Pubkey::create_program_address(
        &[
            MARKET_SEED,
            &state.product_mint,
            &side_seed,
            &leverage_seed,
            &bump_seed,
        ],
        program_id,
    )
    .map_err(|_| ProgramError::InvalidSeeds)
}

pub fn load_config_account(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
) -> Result<ConfigState, ProgramError> {
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if account.is_signer || account.is_writable || account.executable {
        return Err(ProgramError::InvalidArgument);
    }
    if account.data_len() != CONFIG_STATE_LEN {
        return Err(ProgramError::InvalidAccountData);
    }
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_config_state(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if canonical_config_address(program_id, state.bump)? != *account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn load_market_account(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
    writable: bool,
) -> Result<MarketState, ProgramError> {
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if account.is_signer || account.is_writable != writable || account.executable {
        return Err(ProgramError::InvalidArgument);
    }
    if account.data_len() != MARKET_STATE_LEN {
        return Err(ProgramError::InvalidAccountData);
    }
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_market_state(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if canonical_market_address(program_id, &state)? != *account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use levplay_core::{VaultMode, ACCOUNT_VERSION, ENTRY_FEE_BPS, PILOT_LEVERAGE_BPS};

    fn write_address(bytes: &mut [u8], offset: usize, value: u8) {
        let end = offset.saturating_add(32);
        bytes[offset..end].copy_from_slice(&[value; 32]);
    }

    fn config_data(bump: u8) -> [u8; CONFIG_STATE_LEN] {
        let mut data = [0_u8; CONFIG_STATE_LEN];
        data[0..8].copy_from_slice(b"LVPCFG01");
        data[8] = ACCOUNT_VERSION;
        data[9] = 1;
        data[10] = bump;
        write_address(&mut data, 16, 1);
        write_address(&mut data, 48, 2);
        write_address(&mut data, 80, 3);
        write_address(&mut data, 112, 4);
        write_address(&mut data, 144, 5);
        write_address(&mut data, 176, 6);
        data
    }

    fn market_data(bump: u8, product_mint: [u8; 32]) -> [u8; MARKET_STATE_LEN] {
        let mut data = [0_u8; MARKET_STATE_LEN];
        data[0..8].copy_from_slice(b"LVPMKT01");
        data[8] = ACCOUNT_VERSION;
        data[9] = 1;
        data[10] = bump;
        data[11] = Side::Long as u8;
        data[12] = VaultMode::Active as u8;
        data[16..24].copy_from_slice(&7_u64.to_le_bytes());
        data[24..32].copy_from_slice(&100_u64.to_le_bytes());
        data[32..40].copy_from_slice(&100_u64.to_le_bytes());
        data[40..48].copy_from_slice(&1_000_u64.to_le_bytes());
        data[48..56].copy_from_slice(&1_000_u64.to_le_bytes());
        data[56..64].copy_from_slice(&1_000_u64.to_le_bytes());
        data[64..66].copy_from_slice(&100_u16.to_le_bytes());
        data[66..68].copy_from_slice(&PILOT_LEVERAGE_BPS.to_le_bytes());
        data[68..70].copy_from_slice(&ENTRY_FEE_BPS.to_le_bytes());
        data[72..104].copy_from_slice(&product_mint);
        write_address(&mut data, 104, 12);
        write_address(&mut data, 136, 13);
        write_address(&mut data, 168, 14);
        write_address(&mut data, 200, 15);
        write_address(&mut data, 232, 16);
        write_address(&mut data, 264, 17);
        data
    }

    #[test]
    fn config_requires_program_owner_flags_and_canonical_pda() {
        let program_id = Pubkey::new_unique();
        let (key, bump) = Pubkey::find_program_address(&[CONFIG_SEED], &program_id);
        let owner = program_id;
        let mut lamports = 1;
        let mut data = config_data(bump);
        let account = AccountInfo::new(
            &key,
            false,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(load_config_account(&program_id, &account).map(|v| v.bump), Ok(bump));
    }

    #[test]
    fn config_rejects_owner_key_and_privilege_substitution() {
        let program_id = Pubkey::new_unique();
        let (key, bump) = Pubkey::find_program_address(&[CONFIG_SEED], &program_id);
        let wrong_owner = Pubkey::new_unique();
        let mut lamports = 1;
        let mut data = config_data(bump);
        let account = AccountInfo::new(
            &key,
            false,
            false,
            &mut lamports,
            &mut data,
            &wrong_owner,
            false,
            0,
        );
        assert_eq!(
            load_config_account(&program_id, &account),
            Err(ProgramError::IncorrectProgramId)
        );

        let wrong_key = Pubkey::new_unique();
        let owner = program_id;
        let mut lamports = 1;
        let mut data = config_data(bump);
        let account = AccountInfo::new(
            &wrong_key,
            false,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(
            load_config_account(&program_id, &account),
            Err(ProgramError::InvalidSeeds)
        );

        let mut lamports = 1;
        let mut data = config_data(bump);
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(
            load_config_account(&program_id, &account),
            Err(ProgramError::InvalidArgument)
        );
    }

    #[test]
    fn market_requires_identity_bound_pda_and_writable_state() {
        let program_id = Pubkey::new_unique();
        let product_mint = [11_u8; 32];
        let side_seed = [Side::Long as u8];
        let leverage_seed = PILOT_LEVERAGE_BPS.to_le_bytes();
        let (key, bump) = Pubkey::find_program_address(
            &[MARKET_SEED, &product_mint, &side_seed, &leverage_seed],
            &program_id,
        );
        let owner = program_id;
        let mut lamports = 1;
        let mut data = market_data(bump, product_mint);
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        let loaded = load_market_account(&program_id, &account, true);
        assert_eq!(loaded.map(|value| value.product_mint), Ok(product_mint));
        assert_eq!(
            load_market_account(&program_id, &account, false),
            Err(ProgramError::InvalidArgument)
        );
    }

    #[test]
    fn market_rejects_state_identity_changed_without_matching_pda() {
        let program_id = Pubkey::new_unique();
        let product_mint = [11_u8; 32];
        let side_seed = [Side::Long as u8];
        let leverage_seed = PILOT_LEVERAGE_BPS.to_le_bytes();
        let (key, bump) = Pubkey::find_program_address(
            &[MARKET_SEED, &product_mint, &side_seed, &leverage_seed],
            &program_id,
        );
        let owner = program_id;
        let mut lamports = 1;
        let mut data = market_data(bump, [19_u8; 32]);
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(
            load_market_account(&program_id, &account, true),
            Err(ProgramError::InvalidSeeds)
        );
    }
}
