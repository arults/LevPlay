//! Canonical PDA and role validation for the execution-locked state-v2 shell.

use levplay_core::{
    decode_market_accounting_v2, decode_market_config_v2, decode_paired_risk_vault_v2,
    decode_position_v2, validate_market_roles_v2, validate_position_roles_v2, MarketAccountingV2,
    MarketConfigV2, PairedRiskVaultV2, PositionV2, MARKET_ACCOUNTING_V2_LEN, MARKET_CONFIG_V2_LEN,
    PAIRED_RISK_VAULT_V2_LEN, POSITION_V2_LEN,
};
use solana_program::{account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey};

pub const MARKET_CONFIG_V2_SEED: &[u8] = b"market-config-v2";
pub const MARKET_ACCOUNTING_V2_SEED: &[u8] = b"market-accounting-v2";
pub const PAIRED_RISK_VAULT_V2_SEED: &[u8] = b"paired-risk-v2";
pub const POSITION_V2_SEED: &[u8] = b"position-v2";

fn key(address: [u8; 32]) -> Pubkey {
    Pubkey::new_from_array(address)
}

fn canonical(seeds: &[&[u8]], bump: u8, program_id: &Pubkey) -> Result<Pubkey, ProgramError> {
    let bump_seed = [bump];
    let mut all = [b"".as_slice(); 6];
    if seeds.len() >= all.len() {
        return Err(ProgramError::InvalidSeeds);
    }
    for (index, seed) in seeds.iter().enumerate() {
        all[index] = seed;
    }
    all[seeds.len()] = &bump_seed;
    Pubkey::create_program_address(&all[..seeds.len() + 1], program_id)
        .map_err(|_| ProgramError::InvalidSeeds)
}

pub fn canonical_market_config_v2(
    program_id: &Pubkey,
    state: &MarketConfigV2,
) -> Result<Pubkey, ProgramError> {
    let side = [state.side as u8];
    let leverage = state.leverage_bps.to_le_bytes();
    canonical(
        &[
            MARKET_CONFIG_V2_SEED,
            &state.underlying_id,
            &state.product_mint,
            &side,
            &leverage,
        ],
        state.bump,
        program_id,
    )
}

pub fn canonical_market_accounting_v2(
    program_id: &Pubkey,
    config: &Pubkey,
    bump: u8,
) -> Result<Pubkey, ProgramError> {
    canonical(
        &[MARKET_ACCOUNTING_V2_SEED, config.as_ref()],
        bump,
        program_id,
    )
}

pub fn canonical_paired_risk_vault_v2(
    program_id: &Pubkey,
    long_config: &Pubkey,
    short_config: &Pubkey,
    bump: u8,
) -> Result<Pubkey, ProgramError> {
    canonical(
        &[
            PAIRED_RISK_VAULT_V2_SEED,
            long_config.as_ref(),
            short_config.as_ref(),
        ],
        bump,
        program_id,
    )
}

pub fn canonical_position_v2(
    program_id: &Pubkey,
    config: &Pubkey,
    owner: &Pubkey,
    bump: u8,
) -> Result<Pubkey, ProgramError> {
    canonical(
        &[POSITION_V2_SEED, config.as_ref(), owner.as_ref()],
        bump,
        program_id,
    )
}

fn validate_program_account(
    account: &AccountInfo<'_>,
    program_id: &Pubkey,
    writable: bool,
    len: usize,
) -> Result<(), ProgramError> {
    if account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if account.is_signer || account.is_writable != writable || account.executable {
        return Err(ProgramError::InvalidArgument);
    }
    if account.data_len() != len {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

pub fn load_market_config_v2(
    program_id: &Pubkey,
    account: &AccountInfo<'_>,
) -> Result<MarketConfigV2, ProgramError> {
    validate_program_account(account, program_id, false, MARKET_CONFIG_V2_LEN)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_market_config_v2(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if canonical_market_config_v2(program_id, &state)? != *account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn load_market_accounting_v2(
    program_id: &Pubkey,
    config: &Pubkey,
    account: &AccountInfo<'_>,
) -> Result<MarketAccountingV2, ProgramError> {
    validate_program_account(account, program_id, true, MARKET_ACCOUNTING_V2_LEN)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_market_accounting_v2(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if state.market_config != config.to_bytes()
        || canonical_market_accounting_v2(program_id, config, state.bump)? != *account.key
    {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn load_paired_risk_vault_v2(
    program_id: &Pubkey,
    long_config: &Pubkey,
    short_config: &Pubkey,
    account: &AccountInfo<'_>,
) -> Result<PairedRiskVaultV2, ProgramError> {
    validate_program_account(account, program_id, true, PAIRED_RISK_VAULT_V2_LEN)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_paired_risk_vault_v2(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if state.long_market_config != long_config.to_bytes()
        || state.short_market_config != short_config.to_bytes()
        || canonical_paired_risk_vault_v2(program_id, long_config, short_config, state.bump)?
            != *account.key
    {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn load_position_v2(
    program_id: &Pubkey,
    config: &Pubkey,
    owner: &Pubkey,
    account: &AccountInfo<'_>,
) -> Result<PositionV2, ProgramError> {
    validate_program_account(account, program_id, true, POSITION_V2_LEN)?;
    let data = account
        .try_borrow_data()
        .map_err(|_| ProgramError::AccountBorrowFailed)?;
    let state = decode_position_v2(&data).map_err(|_| ProgramError::InvalidAccountData)?;
    if state.market_config != config.to_bytes()
        || state.owner != owner.to_bytes()
        || canonical_position_v2(program_id, config, owner, state.bump)? != *account.key
    {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok(state)
}

pub fn validate_state_v2_roles(
    config_key: &Pubkey,
    config: &MarketConfigV2,
    accounting_key: &Pubkey,
    accounting: &MarketAccountingV2,
    paired_risk_key: &Pubkey,
    position: Option<&PositionV2>,
) -> Result<(), ProgramError> {
    if config.market_accounting != accounting_key.to_bytes()
        || config.paired_risk_vault != paired_risk_key.to_bytes()
    {
        return Err(ProgramError::InvalidAccountData);
    }
    validate_market_roles_v2(
        config_key.to_bytes(),
        config,
        accounting,
        paired_risk_key.to_bytes(),
    )
    .map_err(|_| ProgramError::InvalidAccountData)?;
    if let Some(position) = position {
        validate_position_roles_v2(config, accounting, position)
            .map_err(|_| ProgramError::InvalidAccountData)?;
    }
    if key(accounting.paired_risk_vault) != *paired_risk_key {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use levplay_core::{
        encode_market_accounting_v2, encode_market_config_v2, encode_paired_risk_vault_v2,
        encode_position_v2, MarketAccountingV2, PairedRiskVaultV2, PositionV2, Side, VaultMode,
    };

    fn address(value: u8) -> [u8; 32] {
        [value; 32]
    }
    fn config() -> MarketConfigV2 {
        MarketConfigV2 {
            bump: 0,
            side: Side::Long,
            leverage_bps: 20_000,
            fee_bps: 50,
            standby_bps: 100,
            max_oracle_deviation_bps: 100,
            max_oracle_age_seconds: 30,
            minimum_publishers: 3,
            adapter_version: 1,
            transaction_cap: 100,
            wallet_cap: 100,
            tvl_cap: 1_000,
            daily_mint_cap: 1_000,
            daily_redeem_cap: 1_000,
            underlying_id: address(1),
            product_mint: address(2),
            product_token_program: address(3),
            settlement_mint: address(4),
            settlement_token_program: address(5),
            market_accounting: address(6),
            paired_risk_vault: address(7),
            clearing_vault: address(8),
            source_vault: address(9),
            reserve_vault: address(10),
            adapter_program: address(11),
            adapter_market: address(12),
            primary_oracle: address(13),
            primary_oracle_program: address(14),
            primary_feed_id: address(15),
            secondary_oracle: address(16),
            secondary_oracle_program: address(17),
            secondary_feed_id: address(18),
            adapter_abi_hash: address(19),
            session_policy_id: address(20),
            corporate_action_policy_id: address(21),
            paired_market_config: address(22),
        }
    }

    #[test]
    fn immutable_config_loader_requires_canonical_pda_and_read_only_role() {
        let program_id = Pubkey::new_unique();
        let mut state = config();
        let side = [state.side as u8];
        let leverage = state.leverage_bps.to_le_bytes();
        let (account_key, bump) = Pubkey::find_program_address(
            &[
                MARKET_CONFIG_V2_SEED,
                &state.underlying_id,
                &state.product_mint,
                &side,
                &leverage,
            ],
            &program_id,
        );
        state.bump = bump;
        let mut data = encode_market_config_v2(&state).expect("encode");
        let mut lamports = 1;
        let owner = program_id;
        let account = AccountInfo::new(
            &account_key,
            false,
            false,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(load_market_config_v2(&program_id, &account), Ok(state));

        let mut data = encode_market_config_v2(&state).expect("encode");
        let mut lamports = 1;
        let writable = AccountInfo::new(
            &account_key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            0,
        );
        assert_eq!(
            load_market_config_v2(&program_id, &writable),
            Err(ProgramError::InvalidArgument)
        );
    }

    #[test]
    fn every_mutable_role_has_a_distinct_identity_bound_seed_domain() {
        let program_id = Pubkey::new_unique();
        let config_key = Pubkey::new_unique();
        let short_config_key = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let (accounting, accounting_bump) = Pubkey::find_program_address(
            &[MARKET_ACCOUNTING_V2_SEED, config_key.as_ref()],
            &program_id,
        );
        let (risk, risk_bump) = Pubkey::find_program_address(
            &[
                PAIRED_RISK_VAULT_V2_SEED,
                config_key.as_ref(),
                short_config_key.as_ref(),
            ],
            &program_id,
        );
        let (position, position_bump) = Pubkey::find_program_address(
            &[POSITION_V2_SEED, config_key.as_ref(), owner.as_ref()],
            &program_id,
        );
        assert_eq!(
            canonical_market_accounting_v2(&program_id, &config_key, accounting_bump),
            Ok(accounting)
        );
        assert_eq!(
            canonical_paired_risk_vault_v2(&program_id, &config_key, &short_config_key, risk_bump,),
            Ok(risk)
        );
        assert_eq!(
            canonical_position_v2(&program_id, &config_key, &owner, position_bump),
            Ok(position)
        );
        assert_ne!(accounting, risk);
        assert_ne!(risk, position);
        assert_ne!(accounting, position);
    }

    #[test]
    fn mutable_loaders_and_cross_account_roles_are_identity_bound() {
        let program_id = Pubkey::new_unique();
        let mut config = config();
        let side = [config.side as u8];
        let leverage = config.leverage_bps.to_le_bytes();
        let (config_key, config_bump) = Pubkey::find_program_address(
            &[
                MARKET_CONFIG_V2_SEED,
                &config.underlying_id,
                &config.product_mint,
                &side,
                &leverage,
            ],
            &program_id,
        );
        let (accounting_key, accounting_bump) = Pubkey::find_program_address(
            &[MARKET_ACCOUNTING_V2_SEED, config_key.as_ref()],
            &program_id,
        );
        let short_config_key = Pubkey::new_unique();
        let short_accounting_key = Pubkey::new_unique();
        let (risk_key, risk_bump) = Pubkey::find_program_address(
            &[
                PAIRED_RISK_VAULT_V2_SEED,
                config_key.as_ref(),
                short_config_key.as_ref(),
            ],
            &program_id,
        );
        let position_owner = Pubkey::new_unique();
        let (position_key, position_bump) = Pubkey::find_program_address(
            &[
                POSITION_V2_SEED,
                config_key.as_ref(),
                position_owner.as_ref(),
            ],
            &program_id,
        );
        config.bump = config_bump;
        config.market_accounting = accounting_key.to_bytes();
        config.paired_risk_vault = risk_key.to_bytes();

        let accounting = MarketAccountingV2 {
            bump: accounting_bump,
            side: Side::Long,
            mode: VaultMode::Active,
            epoch: 1,
            daily_window: 1,
            capital: 50,
            total_supply: 50,
            daily_minted: 50,
            daily_redeemed: 0,
            nav: 50,
            gross_exposure: 100,
            total_liabilities: 0,
            queued_claim_liabilities: 0,
            last_primary_price: 100,
            last_secondary_price: 100,
            last_primary_publish_time: 8,
            last_secondary_publish_time: 8,
            last_oracle_slot: 9,
            last_settlement_slot: 10,
            next_market_nonce: 1,
            next_claim_id: 1,
            market_config: config_key.to_bytes(),
            paired_risk_vault: risk_key.to_bytes(),
            product_mint: config.product_mint,
        };
        let risk = PairedRiskVaultV2 {
            bump: risk_bump,
            mode: VaultMode::Active,
            epoch: 1,
            long_capital: 50,
            short_capital: 50,
            matched_exposure: 50,
            residual_long_exposure: 0,
            residual_short_exposure: 0,
            long_maker_collateral: 50,
            short_maker_collateral: 50,
            long_reserve: 5,
            short_reserve: 5,
            long_unwind_capacity: 100,
            short_unwind_capacity: 100,
            maker_commitment_expiry_slot: 1_000,
            long_queued_liabilities: 0,
            short_queued_liabilities: 0,
            long_nav: 50,
            short_nav: 50,
            next_vault_nonce: 1,
            last_settlement_slot: 10,
            long_market_config: config_key.to_bytes(),
            short_market_config: short_config_key.to_bytes(),
            long_market_accounting: accounting_key.to_bytes(),
            short_market_accounting: short_accounting_key.to_bytes(),
            long_clearing_vault: config.clearing_vault,
            short_clearing_vault: address(30),
            long_reserve_vault: config.reserve_vault,
            short_reserve_vault: address(31),
            long_maker_vault: address(32),
            short_maker_vault: address(33),
            long_unwind_route: address(34),
            short_unwind_route: address(35),
            primary_maker: address(36),
            secondary_maker: address(37),
        };
        let position = PositionV2 {
            bump: position_bump,
            side: Side::Long,
            owner: position_owner.to_bytes(),
            market_config: config_key.to_bytes(),
            market_accounting: accounting_key.to_bytes(),
            product_mint: config.product_mint,
            shares: 50,
            cost_basis: 51,
            wallet_open_capital: 50,
            daily_window: 1,
            daily_minted: 50,
            daily_redeemed: 0,
            next_nonce: 1,
            last_action_slot: 10,
            realized_pnl: -1,
        };

        let owner = program_id;
        let mut accounting_lamports = 1;
        let mut accounting_data = encode_market_accounting_v2(&accounting).expect("accounting");
        let accounting_account = AccountInfo::new(
            &accounting_key,
            false,
            true,
            &mut accounting_lamports,
            &mut accounting_data,
            &owner,
            false,
            0,
        );
        let loaded_accounting =
            load_market_accounting_v2(&program_id, &config_key, &accounting_account)
                .expect("canonical accounting");

        let mut risk_lamports = 1;
        let mut risk_data = encode_paired_risk_vault_v2(&risk).expect("risk");
        let risk_account = AccountInfo::new(
            &risk_key,
            false,
            true,
            &mut risk_lamports,
            &mut risk_data,
            &owner,
            false,
            0,
        );
        let loaded_risk =
            load_paired_risk_vault_v2(&program_id, &config_key, &short_config_key, &risk_account)
                .expect("canonical risk");
        assert_eq!(loaded_risk, risk);

        let mut position_lamports = 1;
        let mut position_data = encode_position_v2(&position).expect("position");
        let position_account = AccountInfo::new(
            &position_key,
            false,
            true,
            &mut position_lamports,
            &mut position_data,
            &owner,
            false,
            0,
        );
        let loaded_position =
            load_position_v2(&program_id, &config_key, &position_owner, &position_account)
                .expect("canonical position");

        assert_eq!(
            validate_state_v2_roles(
                &config_key,
                &config,
                &accounting_key,
                &loaded_accounting,
                &risk_key,
                Some(&loaded_position),
            ),
            Ok(())
        );

        let wrong_owner = Pubkey::new_unique();
        assert_eq!(
            load_position_v2(&program_id, &config_key, &wrong_owner, &position_account),
            Err(ProgramError::InvalidSeeds)
        );
    }
}
