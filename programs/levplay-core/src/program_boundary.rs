//! Strict, allocation-free boundary checks for the future Solana SBF wrapper.
//!
//! The SBF entrypoint must parse AccountInfo values into these descriptors and
//! use the fixed validators below before calling economic-core transitions.

use crate::{Address, Error, Result};

pub const WIRE_MAGIC: [u8; 4] = *b"LEVP";
pub const WIRE_VERSION: u8 = 1;
pub const MAX_INSTRUCTION_BYTES: usize = 64;
pub const MAX_COMPUTE_BUDGET_PREFIXES: usize = 2;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProgramInstruction {
    Open {
        capital: u64,
        minimum_shares_out: u64,
        quote_expiry_slot: u64,
        nonce: u64,
    },
    Close {
        shares: u64,
        minimum_assets_out: u64,
        quote_expiry_slot: u64,
        nonce: u64,
    },
    QueueClose {
        shares: u64,
        claim_amount: u64,
        quote_expiry_slot: u64,
        nonce: u64,
    },
    SettleClaim {
        sequence: u64,
        amount: u64,
    },
    EnterStandby {
        expected_epoch: u64,
    },
    Resume {
        recapitalization: u64,
        expected_epoch: u64,
    },
    BeginWindDown {
        expected_epoch: u64,
    },
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, count: usize) -> Result<&'a [u8]> {
        let end = self
            .offset
            .checked_add(count)
            .ok_or(Error::ArithmeticOverflow)?;
        if end > self.bytes.len() {
            return Err(Error::InvalidInstruction);
        }
        let value = &self.bytes[self.offset..end];
        self.offset = end;
        Ok(value)
    }

    fn u8(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }

    fn u64(&mut self) -> Result<u64> {
        let bytes: [u8; 8] = self
            .take(8)?
            .try_into()
            .map_err(|_| Error::InvalidInstruction)?;
        Ok(u64::from_le_bytes(bytes))
    }

    fn finish(self) -> Result<()> {
        if self.offset != self.bytes.len() {
            return Err(Error::InvalidInstruction);
        }
        Ok(())
    }
}

pub fn decode_instruction(bytes: &[u8]) -> Result<ProgramInstruction> {
    if bytes.len() > MAX_INSTRUCTION_BYTES {
        return Err(Error::InvalidInstruction);
    }
    let mut reader = Reader::new(bytes);
    if reader.take(4)? != WIRE_MAGIC || reader.u8()? != WIRE_VERSION {
        return Err(Error::InvalidInstruction);
    }
    let tag = reader.u8()?;
    let instruction = match tag {
        1 => ProgramInstruction::Open {
            capital: reader.u64()?,
            minimum_shares_out: reader.u64()?,
            quote_expiry_slot: reader.u64()?,
            nonce: reader.u64()?,
        },
        2 => ProgramInstruction::Close {
            shares: reader.u64()?,
            minimum_assets_out: reader.u64()?,
            quote_expiry_slot: reader.u64()?,
            nonce: reader.u64()?,
        },
        3 => ProgramInstruction::QueueClose {
            shares: reader.u64()?,
            claim_amount: reader.u64()?,
            quote_expiry_slot: reader.u64()?,
            nonce: reader.u64()?,
        },
        4 => ProgramInstruction::SettleClaim {
            sequence: reader.u64()?,
            amount: reader.u64()?,
        },
        5 => ProgramInstruction::EnterStandby {
            expected_epoch: reader.u64()?,
        },
        6 => ProgramInstruction::Resume {
            recapitalization: reader.u64()?,
            expected_epoch: reader.u64()?,
        },
        7 => ProgramInstruction::BeginWindDown {
            expected_epoch: reader.u64()?,
        },
        _ => return Err(Error::InvalidInstruction),
    };
    reader.finish()?;
    Ok(instruction)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AccountDescriptor {
    pub key: Address,
    pub owner: Address,
    pub is_signer: bool,
    pub is_writable: bool,
    pub executable: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct AccountRule {
    key: Address,
    owner: Address,
    is_signer: bool,
    is_writable: bool,
    executable: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OpenAccountBindings {
    pub program_id: Address,
    pub system_program: Address,
    pub sysvar_owner: Address,
    pub bpf_loader: Address,
    pub user: Address,
    pub user_usdc: Address,
    pub user_product: Address,
    pub config: Address,
    pub market: Address,
    pub product_mint: Address,
    pub clearing_vault: Address,
    pub fee_vault: Address,
    pub reserve_vault: Address,
    pub primary_oracle: Address,
    pub primary_oracle_program: Address,
    pub secondary_oracle: Address,
    pub secondary_oracle_program: Address,
    pub adapter_program: Address,
    pub adapter_market: Address,
    pub token_program: Address,
    pub instructions_sysvar: Address,
}

fn rule(
    key: Address,
    owner: Address,
    is_signer: bool,
    is_writable: bool,
    executable: bool,
) -> AccountRule {
    AccountRule {
        key,
        owner,
        is_signer,
        is_writable,
        executable,
    }
}

fn validate_rules(actual: &[AccountDescriptor], expected: &[AccountRule]) -> Result<()> {
    if actual.len() != expected.len() {
        return Err(Error::InvalidAccounts);
    }
    let zero = [0_u8; 32];
    let mut index = 0_usize;
    while index < actual.len() {
        let account = actual[index];
        let required = expected[index];
        if account.key == zero
            || account.key != required.key
            || account.owner != required.owner
            || account.is_signer != required.is_signer
            || account.is_writable != required.is_writable
            || account.executable != required.executable
        {
            return Err(Error::InvalidAccounts);
        }
        let mut other = index
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
        while other < actual.len() {
            if account.key == actual[other].key {
                return Err(Error::InvalidAccounts);
            }
            other = other
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?;
        }
        index = index
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
    }
    Ok(())
}

pub fn validate_open_accounts(
    bindings: &OpenAccountBindings,
    actual: &[AccountDescriptor],
) -> Result<()> {
    let expected = [
        rule(bindings.user, bindings.system_program, true, true, false),
        rule(bindings.user_usdc, bindings.token_program, false, true, false),
        rule(
            bindings.user_product,
            bindings.token_program,
            false,
            true,
            false,
        ),
        rule(bindings.config, bindings.program_id, false, false, false),
        rule(bindings.market, bindings.program_id, false, true, false),
        rule(
            bindings.product_mint,
            bindings.token_program,
            false,
            true,
            false,
        ),
        rule(
            bindings.clearing_vault,
            bindings.token_program,
            false,
            true,
            false,
        ),
        rule(bindings.fee_vault, bindings.token_program, false, true, false),
        rule(
            bindings.reserve_vault,
            bindings.token_program,
            false,
            false,
            false,
        ),
        rule(
            bindings.primary_oracle,
            bindings.primary_oracle_program,
            false,
            false,
            false,
        ),
        rule(
            bindings.secondary_oracle,
            bindings.secondary_oracle_program,
            false,
            false,
            false,
        ),
        rule(
            bindings.adapter_program,
            bindings.bpf_loader,
            false,
            false,
            true,
        ),
        rule(
            bindings.adapter_market,
            bindings.adapter_program,
            false,
            true,
            false,
        ),
        rule(
            bindings.token_program,
            bindings.bpf_loader,
            false,
            false,
            true,
        ),
        rule(
            bindings.instructions_sysvar,
            bindings.sysvar_owner,
            false,
            false,
            false,
        ),
    ];
    validate_rules(actual, &expected)
}

pub fn validate_transaction_shape(
    current_index: usize,
    top_level_programs: &[Address],
    levplay_program: Address,
    compute_budget_program: Address,
) -> Result<()> {
    if top_level_programs.is_empty()
        || current_index >= top_level_programs.len()
        || current_index
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?
            != top_level_programs.len()
        || top_level_programs[current_index] != levplay_program
        || current_index > MAX_COMPUTE_BUDGET_PREFIXES
    {
        return Err(Error::InvalidTransaction);
    }
    let mut index = 0_usize;
    while index < current_index {
        if top_level_programs[index] != compute_budget_program {
            return Err(Error::InvalidTransaction);
        }
        index = index
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
    }
    Ok(())
}

pub fn consume_nonce(stored_nonce: u64, supplied_nonce: u64) -> Result<u64> {
    if supplied_nonce != stored_nonce {
        return Err(Error::Replay);
    }
    stored_nonce
        .checked_add(1)
        .ok_or(Error::ArithmeticOverflow)
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn open_bytes(tag: u8, values: &[u64]) -> std::vec::Vec<u8> {
        let mut bytes = std::vec::Vec::from(WIRE_MAGIC);
        bytes.push(WIRE_VERSION);
        bytes.push(tag);
        for value in values {
            bytes.extend_from_slice(&value.to_le_bytes());
        }
        bytes
    }

    fn bindings() -> OpenAccountBindings {
        OpenAccountBindings {
            program_id: address(1),
            system_program: address(2),
            sysvar_owner: address(3),
            bpf_loader: address(4),
            user: address(5),
            user_usdc: address(6),
            user_product: address(7),
            config: address(8),
            market: address(9),
            product_mint: address(10),
            clearing_vault: address(11),
            fee_vault: address(12),
            reserve_vault: address(13),
            primary_oracle: address(14),
            primary_oracle_program: address(15),
            secondary_oracle: address(16),
            secondary_oracle_program: address(17),
            adapter_program: address(18),
            adapter_market: address(19),
            token_program: address(20),
            instructions_sysvar: address(21),
        }
    }

    fn accounts(value: &OpenAccountBindings) -> [AccountDescriptor; 15] {
        [
            AccountDescriptor { key: value.user, owner: value.system_program, is_signer: true, is_writable: true, executable: false },
            AccountDescriptor { key: value.user_usdc, owner: value.token_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.user_product, owner: value.token_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.config, owner: value.program_id, is_signer: false, is_writable: false, executable: false },
            AccountDescriptor { key: value.market, owner: value.program_id, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.product_mint, owner: value.token_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.clearing_vault, owner: value.token_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.fee_vault, owner: value.token_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.reserve_vault, owner: value.token_program, is_signer: false, is_writable: false, executable: false },
            AccountDescriptor { key: value.primary_oracle, owner: value.primary_oracle_program, is_signer: false, is_writable: false, executable: false },
            AccountDescriptor { key: value.secondary_oracle, owner: value.secondary_oracle_program, is_signer: false, is_writable: false, executable: false },
            AccountDescriptor { key: value.adapter_program, owner: value.bpf_loader, is_signer: false, is_writable: false, executable: true },
            AccountDescriptor { key: value.adapter_market, owner: value.adapter_program, is_signer: false, is_writable: true, executable: false },
            AccountDescriptor { key: value.token_program, owner: value.bpf_loader, is_signer: false, is_writable: false, executable: true },
            AccountDescriptor { key: value.instructions_sysvar, owner: value.sysvar_owner, is_signer: false, is_writable: false, executable: false },
        ]
    }

    #[test]
    fn instruction_decoder_rejects_trailing_unknown_and_oversized_data() {
        let valid = open_bytes(1, &[10, 9, 100, 7]);
        assert_eq!(
            decode_instruction(&valid),
            Ok(ProgramInstruction::Open {
                capital: 10,
                minimum_shares_out: 9,
                quote_expiry_slot: 100,
                nonce: 7,
            })
        );
        let mut trailing = valid.clone();
        trailing.push(0);
        assert_eq!(decode_instruction(&trailing), Err(Error::InvalidInstruction));
        assert_eq!(
            decode_instruction(&open_bytes(99, &[])),
            Err(Error::InvalidInstruction)
        );
        assert_eq!(
            decode_instruction(&[0_u8; MAX_INSTRUCTION_BYTES + 1]),
            Err(Error::InvalidInstruction)
        );
    }

    #[test]
    fn instruction_decoder_rejects_bad_header_and_truncation() {
        assert_eq!(decode_instruction(b"LEVP"), Err(Error::InvalidInstruction));
        let mut wrong = open_bytes(5, &[1]);
        wrong[0] = b'X';
        assert_eq!(decode_instruction(&wrong), Err(Error::InvalidInstruction));
        assert_eq!(
            decode_instruction(&open_bytes(1, &[1, 2, 3])),
            Err(Error::InvalidInstruction)
        );
    }

    #[test]
    fn open_layout_is_exact_and_pinned() {
        let bindings = bindings();
        assert_eq!(
            validate_open_accounts(&bindings, &accounts(&bindings)),
            Ok(())
        );
    }

    #[test]
    fn open_layout_rejects_extra_missing_and_reordered_accounts() {
        let bindings = bindings();
        let actual = accounts(&bindings);
        assert_eq!(
            validate_open_accounts(&bindings, &actual[..14]),
            Err(Error::InvalidAccounts)
        );
        let mut reordered = actual;
        reordered.swap(1, 2);
        assert_eq!(
            validate_open_accounts(&bindings, &reordered),
            Err(Error::InvalidAccounts)
        );
    }

    #[test]
    fn open_layout_rejects_alias_wrong_owner_and_privilege_change() {
        let bindings = bindings();
        let mut actual = accounts(&bindings);
        actual[2].key = actual[1].key;
        assert_eq!(
            validate_open_accounts(&bindings, &actual),
            Err(Error::InvalidAccounts)
        );
        let mut actual = accounts(&bindings);
        actual[9].owner = address(99);
        assert_eq!(
            validate_open_accounts(&bindings, &actual),
            Err(Error::InvalidAccounts)
        );
        let mut actual = accounts(&bindings);
        actual[3].is_writable = true;
        assert_eq!(
            validate_open_accounts(&bindings, &actual),
            Err(Error::InvalidAccounts)
        );
    }

    #[test]
    fn transaction_shape_allows_only_compute_budget_prefixes() {
        let levplay = address(1);
        let compute = address(2);
        assert_eq!(
            validate_transaction_shape(0, &[levplay], levplay, compute),
            Ok(())
        );
        assert_eq!(
            validate_transaction_shape(2, &[compute, compute, levplay], levplay, compute),
            Ok(())
        );
        assert_eq!(
            validate_transaction_shape(1, &[address(3), levplay], levplay, compute),
            Err(Error::InvalidTransaction)
        );
    }

    #[test]
    fn transaction_shape_rejects_suffixes_and_excess_prefixes() {
        let levplay = address(1);
        let compute = address(2);
        assert_eq!(
            validate_transaction_shape(0, &[levplay, address(3)], levplay, compute),
            Err(Error::InvalidTransaction)
        );
        assert_eq!(
            validate_transaction_shape(
                3,
                &[compute, compute, compute, levplay],
                levplay,
                compute
            ),
            Err(Error::InvalidTransaction)
        );
    }

    #[test]
    fn nonce_is_single_use_and_overflow_safe() {
        assert_eq!(consume_nonce(7, 7), Ok(8));
        assert_eq!(consume_nonce(7, 6), Err(Error::Replay));
        assert_eq!(
            consume_nonce(u64::MAX, u64::MAX),
            Err(Error::ArithmeticOverflow)
        );
    }
}
