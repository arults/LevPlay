//! Exact Open-instruction account binding.
//!
//! This module joins the allocation-free ABI rules to parsed Solana accounts.
//! Every critical identity comes from program-owned config/market state or a
//! canonical Solana program ID; no browser-supplied address is trusted.

use crate::{
    load_config_account, load_market_account, validate_legacy_token_account,
    validate_product_mint, validate_product_token_account,
};
use levplay_core::{
    validate_open_accounts as validate_descriptor_set, AccountDescriptor, ConfigState, MarketState,
    OpenAccountBindings,
};
use solana_program::{
    account_info::AccountInfo, bpf_loader_upgradeable, program_error::ProgramError, pubkey::Pubkey,
    system_program, sysvar,
};

pub const OPEN_ACCOUNT_COUNT: usize = 16;
pub const PRODUCT_DECIMALS: u8 = 6;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ValidatedOpen {
    pub config: ConfigState,
    pub market: MarketState,
}

fn descriptor(account: &AccountInfo<'_>) -> AccountDescriptor {
    AccountDescriptor {
        key: account.key.to_bytes(),
        owner: account.owner.to_bytes(),
        is_signer: account.is_signer,
        is_writable: account.is_writable,
        executable: account.executable,
    }
}

pub fn validate_open_account_set(
    program_id: &Pubkey,
    accounts: &[AccountInfo<'_>],
) -> Result<ValidatedOpen, ProgramError> {
    let accounts: &[AccountInfo<'_>; OPEN_ACCOUNT_COUNT] = accounts
        .try_into()
        .map_err(|_| ProgramError::NotEnoughAccountKeys)?;

    let config = load_config_account(program_id, &accounts[3])?;
    let market = load_market_account(program_id, &accounts[4], true)?;

    if config.usdc_token_program != spl_token::ID.to_bytes()
        || market.product_token_program != spl_token_2022::ID.to_bytes()
    {
        return Err(ProgramError::IncorrectProgramId);
    }

    let bindings = OpenAccountBindings {
        program_id: program_id.to_bytes(),
        system_program: system_program::ID.to_bytes(),
        sysvar_owner: sysvar::ID.to_bytes(),
        bpf_loader: bpf_loader_upgradeable::ID.to_bytes(),
        user: accounts[0].key.to_bytes(),
        user_usdc: accounts[1].key.to_bytes(),
        user_product: accounts[2].key.to_bytes(),
        config: accounts[3].key.to_bytes(),
        market: accounts[4].key.to_bytes(),
        product_mint: market.product_mint,
        clearing_vault: market.clearing_vault,
        fee_vault: config.fee_vault,
        reserve_vault: market.reserve_vault,
        primary_oracle: market.primary_oracle,
        primary_oracle_program: market.primary_oracle_program,
        secondary_oracle: market.secondary_oracle,
        secondary_oracle_program: market.secondary_oracle_program,
        adapter_program: market.adapter_program,
        adapter_market: market.adapter_market,
        usdc_token_program: config.usdc_token_program,
        product_token_program: market.product_token_program,
        instructions_sysvar: sysvar::instructions::ID.to_bytes(),
    };

    let descriptors = accounts.map(|account| descriptor(&account));
    validate_descriptor_set(&bindings, &descriptors)
        .map_err(|_| ProgramError::InvalidAccountData)?;

    let user = accounts[0].key;
    let market_authority = accounts[4].key;
    let treasury_authority = Pubkey::new_from_array(config.treasury_owner);
    let usdc_mint = Pubkey::new_from_array(config.usdc_mint);
    let product_mint = Pubkey::new_from_array(market.product_mint);

    validate_legacy_token_account(&accounts[1], &usdc_mint, user, true)?;
    validate_product_token_account(&accounts[2], &product_mint, user, true)?;
    validate_product_mint(
        &accounts[5],
        &product_mint,
        market_authority,
        PRODUCT_DECIMALS,
        true,
    )?;
    validate_legacy_token_account(&accounts[6], &usdc_mint, market_authority, true)?;
    validate_legacy_token_account(&accounts[7], &usdc_mint, &treasury_authority, true)?;
    validate_legacy_token_account(&accounts[8], &usdc_mint, market_authority, false)?;

    Ok(ValidatedOpen { config, market })
}

#[cfg(test)]
mod tests {
    use super::*;
    use levplay_core::{
        Side, VaultMode, ACCOUNT_VERSION, CONFIG_STATE_LEN, ENTRY_FEE_BPS, MARKET_STATE_LEN,
        PILOT_LEVERAGE_BPS,
    };
    use solana_program::{
        account_info::AccountInfo, program_option::COption, program_pack::Pack,
    };
    use spl_token::state::{Account as LegacyAccount, AccountState as LegacyState};
    use spl_token_2022::state::{
        Account as ProductAccount, AccountState as ProductState, Mint as ProductMint,
    };

    fn write_address(bytes: &mut [u8], offset: usize, value: &Pubkey) {
        bytes[offset..offset + 32].copy_from_slice(value.as_ref());
    }

    fn token_account_data(mint: Pubkey, owner: Pubkey) -> Vec<u8> {
        let token = LegacyAccount {
            mint,
            owner,
            amount: 100,
            delegate: COption::None,
            state: LegacyState::Initialized,
            is_native: COption::None,
            delegated_amount: 0,
            close_authority: COption::None,
        };
        let mut data = vec![0_u8; LegacyAccount::LEN];
        LegacyAccount::pack(token, &mut data).unwrap();
        data
    }

    fn product_account_data(mint: Pubkey, owner: Pubkey) -> Vec<u8> {
        let token = ProductAccount {
            mint,
            owner,
            amount: 100,
            delegate: COption::None,
            state: ProductState::Initialized,
            is_native: COption::None,
            delegated_amount: 0,
            close_authority: COption::None,
        };
        let mut data = vec![0_u8; ProductAccount::LEN];
        ProductAccount::pack(token, &mut data).unwrap();
        data
    }

    fn product_mint_data(authority: Pubkey) -> Vec<u8> {
        let mint = ProductMint {
            mint_authority: COption::Some(authority),
            supply: 100,
            decimals: PRODUCT_DECIMALS,
            is_initialized: true,
            freeze_authority: COption::None,
        };
        let mut data = vec![0_u8; ProductMint::LEN];
        ProductMint::pack(mint, &mut data).unwrap();
        data
    }

    #[test]
    fn rejects_oracle_owner_substitution_before_execution() {
        let program_id = Pubkey::new_unique();
        let (config_key, config_bump) = Pubkey::find_program_address(&[b"config"], &program_id);

        let user = Pubkey::new_unique();
        let user_usdc = Pubkey::new_unique();
        let user_product = Pubkey::new_unique();
        let product_mint = Pubkey::new_unique();
        let clearing_vault = Pubkey::new_unique();
        let fee_vault = Pubkey::new_unique();
        let reserve_vault = Pubkey::new_unique();
        let adapter_program = Pubkey::new_unique();
        let adapter_market = Pubkey::new_unique();
        let primary_oracle = Pubkey::new_unique();
        let primary_oracle_program = Pubkey::new_unique();
        let secondary_oracle = Pubkey::new_unique();
        let secondary_oracle_program = Pubkey::new_unique();
        let treasury_authority = Pubkey::new_unique();
        let governance = Pubkey::new_unique();
        let guardian = Pubkey::new_unique();
        let usdc_mint = Pubkey::new_unique();

        let side_seed = [Side::Long as u8];
        let leverage_seed = PILOT_LEVERAGE_BPS.to_le_bytes();
        let (market_key, market_bump) = Pubkey::find_program_address(
            &[
                b"market",
                product_mint.as_ref(),
                &side_seed,
                &leverage_seed,
            ],
            &program_id,
        );

        let mut config_data = vec![0_u8; CONFIG_STATE_LEN];
        config_data[0..8].copy_from_slice(b"LVPCFG01");
        config_data[8] = ACCOUNT_VERSION;
        config_data[9] = 1;
        config_data[10] = config_bump;
        write_address(&mut config_data, 16, &governance);
        write_address(&mut config_data, 48, &guardian);
        write_address(&mut config_data, 80, &treasury_authority);
        write_address(&mut config_data, 112, &fee_vault);
        write_address(&mut config_data, 144, &usdc_mint);
        write_address(&mut config_data, 176, &spl_token::ID);

        let mut market_data = vec![0_u8; MARKET_STATE_LEN];
        market_data[0..8].copy_from_slice(b"LVPMKT01");
        market_data[8] = ACCOUNT_VERSION;
        market_data[9] = 1;
        market_data[10] = market_bump;
        market_data[11] = Side::Long as u8;
        market_data[12] = VaultMode::Active as u8;
        market_data[16..24].copy_from_slice(&7_u64.to_le_bytes());
        market_data[24..32].copy_from_slice(&100_u64.to_le_bytes());
        market_data[32..40].copy_from_slice(&100_u64.to_le_bytes());
        market_data[40..48].copy_from_slice(&1_000_u64.to_le_bytes());
        market_data[48..56].copy_from_slice(&1_000_u64.to_le_bytes());
        market_data[56..64].copy_from_slice(&1_000_u64.to_le_bytes());
        market_data[64..66].copy_from_slice(&100_u16.to_le_bytes());
        market_data[66..68].copy_from_slice(&PILOT_LEVERAGE_BPS.to_le_bytes());
        market_data[68..70].copy_from_slice(&ENTRY_FEE_BPS.to_le_bytes());
        write_address(&mut market_data, 72, &product_mint);
        write_address(&mut market_data, 104, &spl_token_2022::ID);
        write_address(&mut market_data, 136, &clearing_vault);
        write_address(&mut market_data, 168, &reserve_vault);
        write_address(&mut market_data, 200, &adapter_program);
        write_address(&mut market_data, 232, &adapter_market);
        write_address(&mut market_data, 264, &primary_oracle);
        write_address(&mut market_data, 296, &secondary_oracle);
        write_address(&mut market_data, 328, &primary_oracle_program);
        write_address(&mut market_data, 360, &secondary_oracle_program);

        let mut user_product_data = product_account_data(product_mint, user);
        let mut product_mint_bytes = product_mint_data(market_key);
        let mut user_usdc_data = token_account_data(usdc_mint, user);
        let mut clearing_data = token_account_data(usdc_mint, market_key);
        let mut fee_data = token_account_data(usdc_mint, treasury_authority);
        let mut reserve_data = token_account_data(usdc_mint, market_key);
        let mut empty0 = [];
        let mut empty9 = [];
        let mut empty10 = [];
        let mut empty11 = [];
        let mut empty12 = [];
        let mut empty13 = [];
        let mut empty14 = [];
        let mut empty15 = [];
        let mut lamports = [1_u64; OPEN_ACCOUNT_COUNT];
        let wrong_oracle_owner = Pubkey::new_unique();

        let accounts = [
            AccountInfo::new(&user, true, true, &mut lamports[0], &mut empty0, &system_program::ID, false, 0),
            AccountInfo::new(&user_usdc, false, true, &mut lamports[1], &mut user_usdc_data, &spl_token::ID, false, 0),
            AccountInfo::new(&user_product, false, true, &mut lamports[2], &mut user_product_data, &spl_token_2022::ID, false, 0),
            AccountInfo::new(&config_key, false, false, &mut lamports[3], &mut config_data, &program_id, false, 0),
            AccountInfo::new(&market_key, false, true, &mut lamports[4], &mut market_data, &program_id, false, 0),
            AccountInfo::new(&product_mint, false, true, &mut lamports[5], &mut product_mint_bytes, &spl_token_2022::ID, false, 0),
            AccountInfo::new(&clearing_vault, false, true, &mut lamports[6], &mut clearing_data, &spl_token::ID, false, 0),
            AccountInfo::new(&fee_vault, false, true, &mut lamports[7], &mut fee_data, &spl_token::ID, false, 0),
            AccountInfo::new(&reserve_vault, false, false, &mut lamports[8], &mut reserve_data, &spl_token::ID, false, 0),
            AccountInfo::new(&primary_oracle, false, false, &mut lamports[9], &mut empty9, &wrong_oracle_owner, false, 0),
            AccountInfo::new(&secondary_oracle, false, false, &mut lamports[10], &mut empty10, &secondary_oracle_program, false, 0),
            AccountInfo::new(&adapter_program, false, false, &mut lamports[11], &mut empty11, &bpf_loader_upgradeable::ID, true, 0),
            AccountInfo::new(&adapter_market, false, true, &mut lamports[12], &mut empty12, &adapter_program, false, 0),
            AccountInfo::new(&spl_token::ID, false, false, &mut lamports[13], &mut empty13, &bpf_loader_upgradeable::ID, true, 0),
            AccountInfo::new(&spl_token_2022::ID, false, false, &mut lamports[14], &mut empty14, &bpf_loader_upgradeable::ID, true, 0),
            AccountInfo::new(&sysvar::instructions::ID, false, false, &mut lamports[15], &mut empty15, &sysvar::ID, false, 0),
        ];

        assert_eq!(
            validate_open_account_set(&program_id, &accounts),
            Err(ProgramError::InvalidAccountData)
        );
    }
}
