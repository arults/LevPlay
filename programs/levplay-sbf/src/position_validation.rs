//! Canonical program-owned position and FIFO claim PDA validation.

use levplay_core::{
    decode_claim_state, decode_position_state, ClaimState, PositionState, CLAIM_STATE_LEN,
    POSITION_STATE_LEN,
};
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

pub const POSITION_SEED: &[u8] = b"position";
pub const CLAIM_SEED: &[u8] = b"claim";

pub fn canonical_position_address(
    program_id: &Pubkey,
    state: &PositionState,
) -> Result<Pubkey, ProgramError> {
    let bump = [state.bump];
    Pubkey::create_program_address(
        &[POSITION_SEED, &state.market, &state.owner, &bump],
        program_id,
    )
    .map_err(|_| ProgramError::InvalidSeeds)
}

pub fn canonical_claim_address(
    program_id: &Pubkey,
    state: &ClaimState,
) -> Result<Pubkey, ProgramError> {
    let claim_id = state.claim_id.to_le_bytes();
    let bump = [state.bump];
    Pubkey::create_program_address(
        &[CLAIM_SEED, &state.market, &claim_id, &bump],
        program_id,
    )
    .map_err(|_| ProgramError::InvalidSeeds)
}

fn validate_envelope(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
    expected_len: usize,
    writable: bool,
) -> Result<(), ProgramError> {
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if account.is_signer || account.is_writable != writable || account.executable {
        return Err(ProgramError::InvalidArgument);
    }
    if account.data_len() != expected_len {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

pub fn load_position_account(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
    writable: bool,
) -> Result<PositionState, ProgramError> {
    validate_envelope(program_id, account, POSITION_STATE_LEN, writable)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_position_state(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if canonical_position_address(program_id, &state)? != *account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn load_claim_account(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
    writable: bool,
) -> Result<ClaimState, ProgramError> {
    validate_envelope(program_id, account, CLAIM_STATE_LEN, writable)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_claim_state(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if canonical_claim_address(program_id, &state)? != *account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use levplay_core::{ClaimStatus, Side, ACCOUNT_VERSION};

    fn write_address(bytes: &mut [u8], offset: usize, value: &Pubkey) {
        bytes[offset..offset + 32].copy_from_slice(value.as_ref());
    }

    fn position_data(
        bump: u8,
        owner: &Pubkey,
        market: &Pubkey,
        mint: &Pubkey,
    ) -> [u8; POSITION_STATE_LEN] {
        let mut data = [0_u8; POSITION_STATE_LEN];
        data[0..8].copy_from_slice(b"LVPPOS01");
        data[8] = ACCOUNT_VERSION;
        data[9] = 1;
        data[10] = bump;
        data[11] = Side::Long as u8;
        write_address(&mut data, 16, owner);
        write_address(&mut data, 48, market);
        write_address(&mut data, 80, mint);
        data[112..120].copy_from_slice(&50_u64.to_le_bytes());
        data[120..128].copy_from_slice(&51_u64.to_le_bytes());
        data[128..136].copy_from_slice(&100_u64.to_le_bytes());
        data[136..144].copy_from_slice(&7_u64.to_le_bytes());
        data
    }

    fn claim_data(
        bump: u8,
        owner: &Pubkey,
        market: &Pubkey,
        claim_id: u64,
    ) -> [u8; CLAIM_STATE_LEN] {
        let mut data = [0_u8; CLAIM_STATE_LEN];
        data[0..8].copy_from_slice(b"LVPCLM01");
        data[8] = ACCOUNT_VERSION;
        data[9] = 1;
        data[10] = bump;
        data[11] = ClaimStatus::Pending as u8;
        write_address(&mut data, 16, owner);
        write_address(&mut data, 48, market);
        data[80..88].copy_from_slice(&claim_id.to_le_bytes());
        data[88..96].copy_from_slice(&50_u64.to_le_bytes());
        data[96..104].copy_from_slice(&45_u64.to_le_bytes());
        data[112..120].copy_from_slice(&100_u64.to_le_bytes());
        data
    }

    #[test]
    fn position_is_bound_to_wallet_and_market_pda() {
        let program_id = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let market = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let (key, bump) =
            Pubkey::find_program_address(&[POSITION_SEED, market.as_ref(), owner.as_ref()], &program_id);
        let mut data = position_data(bump, &owner, &market, &mint);
        let mut lamports = 1;
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &program_id,
            false,
            0,
        );
        let state = load_position_account(&program_id, &account, true).expect("valid position PDA");
        assert_eq!(state.owner, owner.to_bytes());
        assert_eq!(state.market, market.to_bytes());
    }

    #[test]
    fn position_rejects_owner_seed_and_privilege_substitution() {
        let program_id = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let market = Pubkey::new_unique();
        let mint = Pubkey::new_unique();
        let (key, bump) =
            Pubkey::find_program_address(&[POSITION_SEED, market.as_ref(), owner.as_ref()], &program_id);
        let changed_owner = Pubkey::new_unique();
        let mut data = position_data(bump, &changed_owner, &market, &mint);
        let mut lamports = 1;
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &program_id,
            false,
            0,
        );
        assert_eq!(
            load_position_account(&program_id, &account, true),
            Err(ProgramError::InvalidSeeds)
        );
        assert_eq!(
            load_position_account(&program_id, &account, false),
            Err(ProgramError::InvalidArgument)
        );
    }

    #[test]
    fn claim_is_bound_to_market_and_monotonic_id() {
        let program_id = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let market = Pubkey::new_unique();
        let claim_id = 9_u64;
        let id = claim_id.to_le_bytes();
        let (key, bump) =
            Pubkey::find_program_address(&[CLAIM_SEED, market.as_ref(), &id], &program_id);
        let mut data = claim_data(bump, &owner, &market, claim_id);
        let mut lamports = 1;
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &program_id,
            false,
            0,
        );
        let state = load_claim_account(&program_id, &account, true).expect("valid claim PDA");
        assert_eq!(state.claim_id, claim_id);
    }

    #[test]
    fn claim_rejects_relabelled_id_wrong_program_and_readonly_alias() {
        let program_id = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let market = Pubkey::new_unique();
        let claim_id = 9_u64;
        let id = claim_id.to_le_bytes();
        let (key, bump) =
            Pubkey::find_program_address(&[CLAIM_SEED, market.as_ref(), &id], &program_id);
        let mut data = claim_data(bump, &owner, &market, claim_id + 1);
        let mut lamports = 1;
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &program_id,
            false,
            0,
        );
        assert_eq!(
            load_claim_account(&program_id, &account, true),
            Err(ProgramError::InvalidSeeds)
        );

        let wrong_program = Pubkey::new_unique();
        let mut data = claim_data(bump, &owner, &market, claim_id);
        let mut lamports = 1;
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &wrong_program,
            false,
            0,
        );
        assert_eq!(
            load_claim_account(&program_id, &account, true),
            Err(ProgramError::IncorrectProgramId)
        );
    }
}
