//! Transaction-shape validation backed by Solana's instructions sysvar.
//!
//! Open must be the final top-level instruction and may only be preceded by at
//! most two Compute Budget instructions. This prevents unreviewed suffixes,
//! CPI invocation and transaction-composition assumptions from bypassing the
//! frozen account boundary.

use levplay_core::{validate_transaction_shape, Address, MAX_COMPUTE_BUDGET_PREFIXES};
use solana_program::{
    account_info::AccountInfo,
    compute_budget,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::{self, instructions::{load_current_index_checked, load_instruction_at_checked}},
};

pub fn validate_top_level_transaction(
    program_id: &Pubkey,
    instructions_sysvar: &AccountInfo<'_>,
) -> Result<(), ProgramError> {
    if instructions_sysvar.key != &sysvar::instructions::ID
        || instructions_sysvar.owner != &sysvar::ID
        || instructions_sysvar.is_signer
        || instructions_sysvar.is_writable
        || instructions_sysvar.executable
    {
        return Err(ProgramError::InvalidArgument);
    }

    let current_index = usize::from(load_current_index_checked(instructions_sysvar)?);
    if current_index > MAX_COMPUTE_BUDGET_PREFIXES {
        return Err(ProgramError::InvalidArgument);
    }

    // A successful lookup after the current instruction proves an unsafe
    // suffix exists. Any malformed sysvar also fails while loading the admitted
    // prefix/current instruction below.
    if load_instruction_at_checked(
        current_index
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?,
        instructions_sysvar,
    )
    .is_ok()
    {
        return Err(ProgramError::InvalidArgument);
    }

    let mut programs: [Address; MAX_COMPUTE_BUDGET_PREFIXES + 1] =
        [[0_u8; 32]; MAX_COMPUTE_BUDGET_PREFIXES + 1];
    let count = current_index
        .checked_add(1)
        .ok_or(ProgramError::ArithmeticOverflow)?;
    let mut index = 0_usize;
    while index < count {
        programs[index] = load_instruction_at_checked(index, instructions_sysvar)?
            .program_id
            .to_bytes();
        index = index
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
    }

    validate_transaction_shape(
        current_index,
        &programs[..count],
        program_id.to_bytes(),
        compute_budget::ID.to_bytes(),
    )
    .map_err(|_| ProgramError::InvalidArgument)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_spoofed_instructions_sysvar_identity() {
        let key = Pubkey::new_unique();
        let owner = sysvar::ID;
        let mut lamports = 1_u64;
        let mut data = [];
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
        assert_eq!(
            validate_top_level_transaction(&Pubkey::new_unique(), &account),
            Err(ProgramError::InvalidArgument)
        );
    }

    #[test]
    fn rejects_writable_instructions_sysvar() {
        let key = sysvar::instructions::ID;
        let owner = sysvar::ID;
        let mut lamports = 1_u64;
        let mut data = [];
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
            validate_top_level_transaction(&Pubkey::new_unique(), &account),
            Err(ProgramError::InvalidArgument)
        );
    }
}
