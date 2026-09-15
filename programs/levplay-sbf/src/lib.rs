//! Solana SBF entrypoint for LevPlay.
//!
//! This shell deliberately validates the frozen wire format and then fails
//! closed. It cannot move funds or mutate accounts until the audited account
//! state, oracle, token and backing-vault handlers are admitted.

use levplay_core::{decode_instruction, Error};
use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
    program_error::ProgramError, pubkey::Pubkey,
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
    decode_instruction(instruction_data).map_err(map_core_error)?;
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

    fn enter_standby(epoch: u64) -> Vec<u8> {
        let mut data = Vec::from(*b"LEVP");
        data.push(1);
        data.push(5);
        data.extend_from_slice(&epoch.to_le_bytes());
        data
    }

    #[test]
    fn valid_wire_data_still_fails_closed() {
        let result = process_instruction(&Pubkey::new_unique(), &[], &enter_standby(7));
        assert_eq!(result, Err(ProgramError::Custom(EXECUTION_LOCKED_ERROR)));
    }

    #[test]
    fn malformed_wire_data_never_reaches_release_lock() {
        let result = process_instruction(&Pubkey::new_unique(), &[], b"invalid");
        assert_eq!(result, Err(ProgramError::Custom(7)));
    }

    #[test]
    fn default_program_id_is_rejected_before_dispatch() {
        let result = process_instruction(&Pubkey::default(), &[], &enter_standby(7));
        assert_eq!(result, Err(ProgramError::InvalidArgument));
    }
}
