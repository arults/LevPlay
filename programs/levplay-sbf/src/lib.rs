//! Solana SBF entrypoint for LevPlay.
//!
//! Every admitted instruction is decoded and its implemented account boundary
//! is validated before the global execution lock is reached. The lock remains
//! fail-closed until state mutation, CPI balance-delta checks and independent
//! audit evidence are complete.

// Solana 2.2's entrypoint macro probes SBF-only cfg values that host Rust 1.85
// does not know. Keep this exception crate-local; all other warnings are denied
// by CI and the dependency-free economic core forbids unsafe code.
#![allow(unexpected_cfgs)]

mod account_validation;
mod open_validation;
mod oracle_validation;
mod position_validation;
mod state_v2_validation;
mod token_validation;
mod transaction_validation;
pub use account_validation::*;
pub use open_validation::*;
pub use oracle_validation::*;
pub use position_validation::*;
pub use state_v2_validation::*;
pub use token_validation::*;
pub use transaction_validation::*;

use levplay_core::{decode_instruction, Error, ProgramInstruction};
use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub const EXECUTION_LOCKED_ERROR: u32 = 0x1000;
pub const MAX_ACCOUNTS: usize = 32;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo<'_>],
    instruction_data: &[u8],
) -> ProgramResult {
    if *program_id == Pubkey::default() || accounts.len() > MAX_ACCOUNTS {
        return Err(ProgramError::InvalidArgument);
    }

    let instruction = decode_instruction(instruction_data).map_err(map_core_error)?;

    // Open is the first frozen boundary with a complete account parser. Wire it
    // into the real entrypoint now so account substitution, privilege changes,
    // token-program confusion and malformed token state fail before the global
    // execution lock. No CPI or account mutation is performed.
    if matches!(instruction, ProgramInstruction::Open { .. }) {
        validate_open_account_set(program_id, accounts)?;
    }

    Err(ProgramError::Custom(EXECUTION_LOCKED_ERROR))
}

fn map_core_error(error: Error) -> ProgramError {
    let code = match error {
        Error::ArithmeticOverflow => 1,
        Error::DivisionByZero => 2,
        Error::InvalidAmount => 3,
        Error::InvalidConfiguration => 4,
        Error::InvalidState => 5,
        Error::InvalidOracle => 6,
        Error::InvalidInstruction => 7,
        Error::InvalidAccounts => 8,
        Error::InvalidTransaction => 9,
        Error::Replay => 10,
        Error::QuoteExpired => 11,
        Error::CapExceeded => 12,
        Error::SlippageExceeded => 13,
        Error::NotIsolated => 14,
    };
    ProgramError::Custom(code)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn instruction(tag: u8, values: &[u64]) -> Vec<u8> {
        let mut data = Vec::from(*b"LEVP");
        data.push(1);
        data.push(tag);
        for value in values {
            data.extend_from_slice(&value.to_le_bytes());
        }
        data
    }

    #[test]
    fn non_value_instruction_still_reaches_release_lock() {
        let result = process_instruction(&Pubkey::new_unique(), &[], &instruction(5, &[7]));
        assert_eq!(result, Err(ProgramError::Custom(EXECUTION_LOCKED_ERROR)));
    }

    #[test]
    fn open_requires_exact_accounts_before_release_lock() {
        let result = process_instruction(
            &Pubkey::new_unique(),
            &[],
            &instruction(1, &[10, 9, 100, 7]),
        );
        assert_eq!(result, Err(ProgramError::NotEnoughAccountKeys));
    }

    #[test]
    fn malformed_wire_data_never_reaches_release_lock() {
        let result = process_instruction(&Pubkey::new_unique(), &[], b"invalid");
        assert_eq!(result, Err(ProgramError::Custom(7)));
    }

    #[test]
    fn default_program_id_is_rejected_before_dispatch() {
        let result = process_instruction(&Pubkey::default(), &[], &instruction(5, &[7]));
        assert_eq!(result, Err(ProgramError::InvalidArgument));
    }
}
