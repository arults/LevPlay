//! Version-two program-owned state layouts.
//!
//! These layouts deliberately contain no mutation or value-moving logic. They
//! freeze byte-exact account identities and the accounting fields required by
//! a later audited processor. All decoders reject trailing bytes, malformed
//! headers, non-zero reserved bytes and inconsistent arithmetic.

use crate::{Address, Error, Result, Side, VaultMode, ENTRY_FEE_BPS};

pub const STATE_V2_VERSION: u8 = 2;
pub const MARKET_CONFIG_V2_DISCRIMINATOR: [u8; 8] = *b"LVPCFG02";
pub const MARKET_ACCOUNTING_V2_DISCRIMINATOR: [u8; 8] = *b"LVPACC02";
pub const PAIRED_RISK_VAULT_V2_DISCRIMINATOR: [u8; 8] = *b"LVPPAIR2";
pub const POSITION_V2_DISCRIMINATOR: [u8; 8] = *b"LVPPOS02";

pub const MARKET_CONFIG_V2_LEN: usize = 800;
pub const MARKET_ACCOUNTING_V2_LEN: usize = 288;
pub const PAIRED_RISK_VAULT_V2_LEN: usize = 640;
pub const POSITION_V2_LEN: usize = 224;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketConfigV2 {
    pub bump: u8,
    pub side: Side,
    pub leverage_bps: u16,
    pub fee_bps: u16,
    pub standby_bps: u16,
    pub max_oracle_deviation_bps: u16,
    pub max_oracle_age_seconds: u32,
    pub minimum_publishers: u8,
    pub adapter_version: u32,
    pub transaction_cap: u64,
    pub wallet_cap: u64,
    pub tvl_cap: u64,
    pub daily_mint_cap: u64,
    pub daily_redeem_cap: u64,
    pub underlying_id: Address,
    pub product_mint: Address,
    pub product_token_program: Address,
    pub settlement_mint: Address,
    pub settlement_token_program: Address,
    pub market_accounting: Address,
    pub paired_risk_vault: Address,
    pub clearing_vault: Address,
    pub source_vault: Address,
    pub reserve_vault: Address,
    pub adapter_program: Address,
    pub adapter_market: Address,
    pub primary_oracle: Address,
    pub primary_oracle_program: Address,
    pub primary_feed_id: Address,
    pub secondary_oracle: Address,
    pub secondary_oracle_program: Address,
    pub secondary_feed_id: Address,
    pub adapter_abi_hash: Address,
    pub session_policy_id: Address,
    pub corporate_action_policy_id: Address,
    pub paired_market_config: Address,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketAccountingV2 {
    pub bump: u8,
    pub side: Side,
    pub mode: VaultMode,
    pub epoch: u64,
    pub daily_window: u64,
    pub capital: u64,
    pub total_supply: u64,
    pub daily_minted: u64,
    pub daily_redeemed: u64,
    pub nav: u64,
    pub gross_exposure: u64,
    pub total_liabilities: u64,
    pub queued_claim_liabilities: u64,
    pub last_primary_price: u64,
    pub last_secondary_price: u64,
    pub last_primary_publish_time: u64,
    pub last_secondary_publish_time: u64,
    pub last_oracle_slot: u64,
    pub last_settlement_slot: u64,
    pub next_market_nonce: u64,
    pub next_claim_id: u64,
    pub market_config: Address,
    pub paired_risk_vault: Address,
    pub product_mint: Address,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PairedRiskVaultV2 {
    pub bump: u8,
    pub mode: VaultMode,
    pub epoch: u64,
    pub long_capital: u64,
    pub short_capital: u64,
    pub matched_exposure: u64,
    pub residual_long_exposure: u64,
    pub residual_short_exposure: u64,
    pub long_maker_collateral: u64,
    pub short_maker_collateral: u64,
    pub long_reserve: u64,
    pub short_reserve: u64,
    pub long_unwind_capacity: u64,
    pub short_unwind_capacity: u64,
    pub maker_commitment_expiry_slot: u64,
    pub long_queued_liabilities: u64,
    pub short_queued_liabilities: u64,
    pub long_nav: u64,
    pub short_nav: u64,
    pub next_vault_nonce: u64,
    pub last_settlement_slot: u64,
    pub long_market_config: Address,
    pub short_market_config: Address,
    pub long_market_accounting: Address,
    pub short_market_accounting: Address,
    pub long_clearing_vault: Address,
    pub short_clearing_vault: Address,
    pub long_reserve_vault: Address,
    pub short_reserve_vault: Address,
    pub long_maker_vault: Address,
    pub short_maker_vault: Address,
    pub long_unwind_route: Address,
    pub short_unwind_route: Address,
    pub primary_maker: Address,
    pub secondary_maker: Address,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PositionV2 {
    pub bump: u8,
    pub side: Side,
    pub owner: Address,
    pub market_config: Address,
    pub market_accounting: Address,
    pub product_mint: Address,
    pub shares: u64,
    pub cost_basis: u64,
    pub wallet_open_capital: u64,
    pub daily_window: u64,
    pub daily_minted: u64,
    pub daily_redeemed: u64,
    pub next_nonce: u64,
    pub last_action_slot: u64,
    pub realized_pnl: i64,
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
        let value = self
            .bytes
            .get(self.offset..end)
            .ok_or(Error::InvalidState)?;
        self.offset = end;
        Ok(value)
    }
    fn u8(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }
    fn u16(&mut self) -> Result<u16> {
        Ok(u16::from_le_bytes(
            self.take(2)?.try_into().map_err(|_| Error::InvalidState)?,
        ))
    }
    fn u32(&mut self) -> Result<u32> {
        Ok(u32::from_le_bytes(
            self.take(4)?.try_into().map_err(|_| Error::InvalidState)?,
        ))
    }
    fn u64(&mut self) -> Result<u64> {
        Ok(u64::from_le_bytes(
            self.take(8)?.try_into().map_err(|_| Error::InvalidState)?,
        ))
    }
    fn i64(&mut self) -> Result<i64> {
        Ok(i64::from_le_bytes(
            self.take(8)?.try_into().map_err(|_| Error::InvalidState)?,
        ))
    }
    fn address(&mut self) -> Result<Address> {
        self.take(32)?.try_into().map_err(|_| Error::InvalidState)
    }
    fn zeroes(&mut self, count: usize) -> Result<()> {
        if self.take(count)?.iter().any(|byte| *byte != 0) {
            return Err(Error::InvalidState);
        }
        Ok(())
    }
    fn finish(self) -> Result<()> {
        if self.offset == self.bytes.len() {
            Ok(())
        } else {
            Err(Error::InvalidState)
        }
    }
}

struct Writer<'a> {
    bytes: &'a mut [u8],
    offset: usize,
}

impl<'a> Writer<'a> {
    fn new(bytes: &'a mut [u8]) -> Self {
        Self { bytes, offset: 0 }
    }
    fn put(&mut self, value: &[u8]) -> Result<()> {
        let end = self
            .offset
            .checked_add(value.len())
            .ok_or(Error::ArithmeticOverflow)?;
        let target = self
            .bytes
            .get_mut(self.offset..end)
            .ok_or(Error::InvalidState)?;
        target.copy_from_slice(value);
        self.offset = end;
        Ok(())
    }
    fn u8(&mut self, value: u8) -> Result<()> {
        self.put(&[value])
    }
    fn u16(&mut self, value: u16) -> Result<()> {
        self.put(&value.to_le_bytes())
    }
    fn u32(&mut self, value: u32) -> Result<()> {
        self.put(&value.to_le_bytes())
    }
    fn u64(&mut self, value: u64) -> Result<()> {
        self.put(&value.to_le_bytes())
    }
    fn i64(&mut self, value: i64) -> Result<()> {
        self.put(&value.to_le_bytes())
    }
    fn address(&mut self, value: &Address) -> Result<()> {
        self.put(value)
    }
    fn zeroes(&mut self, count: usize) -> Result<()> {
        let end = self
            .offset
            .checked_add(count)
            .ok_or(Error::ArithmeticOverflow)?;
        let target = self
            .bytes
            .get_mut(self.offset..end)
            .ok_or(Error::InvalidState)?;
        target.fill(0);
        self.offset = end;
        Ok(())
    }
    fn finish(self) -> Result<()> {
        if self.offset == self.bytes.len() {
            Ok(())
        } else {
            Err(Error::InvalidState)
        }
    }
}

fn side(value: u8) -> Result<Side> {
    match value {
        0 => Ok(Side::Long),
        1 => Ok(Side::Short),
        _ => Err(Error::InvalidState),
    }
}

fn mode(value: u8) -> Result<VaultMode> {
    match value {
        0 => Ok(VaultMode::Active),
        1 => Ok(VaultMode::Standby),
        2 => Ok(VaultMode::Paused),
        3 => Ok(VaultMode::Insolvent),
        4 => Ok(VaultMode::WindDown),
        _ => Err(Error::InvalidState),
    }
}

fn read_header(reader: &mut Reader<'_>, discriminator: &[u8; 8]) -> Result<(u8, Side)> {
    if reader.take(8)? != discriminator || reader.u8()? != STATE_V2_VERSION || reader.u8()? != 1 {
        return Err(Error::InvalidState);
    }
    Ok((reader.u8()?, side(reader.u8()?)?))
}

fn write_header(
    writer: &mut Writer<'_>,
    discriminator: &[u8; 8],
    bump: u8,
    side: Side,
) -> Result<()> {
    writer.put(discriminator)?;
    writer.u8(STATE_V2_VERSION)?;
    writer.u8(1)?;
    writer.u8(bump)?;
    writer.u8(side as u8)
}

fn read_pair_header(reader: &mut Reader<'_>) -> Result<(u8, VaultMode)> {
    if reader.take(8)? != PAIRED_RISK_VAULT_V2_DISCRIMINATOR
        || reader.u8()? != STATE_V2_VERSION
        || reader.u8()? != 1
    {
        return Err(Error::InvalidState);
    }
    let bump = reader.u8()?;
    let mode = mode(reader.u8()?)?;
    reader.zeroes(4)?;
    Ok((bump, mode))
}

fn write_pair_header(writer: &mut Writer<'_>, bump: u8, mode: VaultMode) -> Result<()> {
    writer.put(&PAIRED_RISK_VAULT_V2_DISCRIMINATOR)?;
    writer.u8(STATE_V2_VERSION)?;
    writer.u8(1)?;
    writer.u8(bump)?;
    writer.u8(mode as u8)?;
    writer.zeroes(4)
}

fn validate_addresses(addresses: &[Address]) -> Result<()> {
    for (index, address) in addresses.iter().enumerate() {
        if *address == [0; 32] || addresses[index.saturating_add(1)..].contains(address) {
            return Err(Error::InvalidConfiguration);
        }
    }
    Ok(())
}

fn checked_accounting_sums(state: &MarketAccountingV2) -> Result<()> {
    state
        .nav
        .checked_add(state.total_liabilities)
        .ok_or(Error::ArithmeticOverflow)?;
    state
        .gross_exposure
        .checked_add(state.total_liabilities)
        .ok_or(Error::ArithmeticOverflow)?;
    if state.queued_claim_liabilities > state.total_liabilities {
        return Err(Error::InvalidState);
    }
    if state.daily_window == 0 && (state.daily_minted != 0 || state.daily_redeemed != 0) {
        return Err(Error::InvalidState);
    }
    let no_settlement = state.last_settlement_slot == 0;
    if no_settlement != (state.last_oracle_slot == 0)
        || no_settlement != (state.last_primary_price == 0)
        || no_settlement != (state.last_secondary_price == 0)
        || no_settlement != (state.last_primary_publish_time == 0)
        || no_settlement != (state.last_secondary_publish_time == 0)
        || (!no_settlement && state.last_oracle_slot > state.last_settlement_slot)
    {
        return Err(Error::InvalidState);
    }
    Ok(())
}

fn checked_paired_risk_sums(state: &PairedRiskVaultV2) -> Result<()> {
    state
        .long_capital
        .checked_add(state.short_capital)
        .ok_or(Error::ArithmeticOverflow)?;
    state
        .long_maker_collateral
        .checked_add(state.short_maker_collateral)
        .ok_or(Error::ArithmeticOverflow)?;
    state
        .long_reserve
        .checked_add(state.short_reserve)
        .ok_or(Error::ArithmeticOverflow)?;
    state
        .long_nav
        .checked_add(state.long_queued_liabilities)
        .ok_or(Error::ArithmeticOverflow)?;
    state
        .short_nav
        .checked_add(state.short_queued_liabilities)
        .ok_or(Error::ArithmeticOverflow)?;
    if state.matched_exposure > state.long_capital.max(state.short_capital)
        || (state.residual_long_exposure != 0 && state.residual_short_exposure != 0)
        || (state.mode == VaultMode::Active && state.maker_commitment_expiry_slot == 0)
    {
        return Err(Error::InvalidState);
    }
    Ok(())
}

pub fn validate_market_config_v2(state: &MarketConfigV2) -> Result<()> {
    if !(20_000..=50_000).contains(&state.leverage_bps)
        || state.fee_bps > ENTRY_FEE_BPS
        || !(1..=500).contains(&state.standby_bps)
        || state.max_oracle_deviation_bps == 0
        || state.max_oracle_deviation_bps > 1_000
        || state.max_oracle_age_seconds == 0
        || state.minimum_publishers == 0
        || state.adapter_version == 0
        || state.transaction_cap == 0
        || state.transaction_cap > state.wallet_cap
        || state.wallet_cap > state.tvl_cap
        || state.daily_mint_cap == 0
        || state.daily_redeem_cap == 0
    {
        return Err(Error::InvalidConfiguration);
    }
    validate_addresses(&[
        state.underlying_id,
        state.product_mint,
        state.product_token_program,
        state.settlement_mint,
        state.settlement_token_program,
        state.market_accounting,
        state.paired_risk_vault,
        state.clearing_vault,
        state.source_vault,
        state.reserve_vault,
        state.adapter_program,
        state.adapter_market,
        state.primary_oracle,
        state.primary_oracle_program,
        state.secondary_oracle,
        state.secondary_oracle_program,
        state.paired_market_config,
    ])?;
    validate_addresses(&[state.primary_feed_id, state.secondary_feed_id])?;
    for identifier in [
        state.adapter_abi_hash,
        state.session_policy_id,
        state.corporate_action_policy_id,
    ] {
        if identifier == [0; 32] {
            return Err(Error::InvalidConfiguration);
        }
    }
    Ok(())
}

pub fn encode_market_config_v2(state: &MarketConfigV2) -> Result<[u8; MARKET_CONFIG_V2_LEN]> {
    validate_market_config_v2(state)?;
    let mut bytes = [0_u8; MARKET_CONFIG_V2_LEN];
    let mut w = Writer::new(&mut bytes);
    write_header(
        &mut w,
        &MARKET_CONFIG_V2_DISCRIMINATOR,
        state.bump,
        state.side,
    )?;
    w.u16(state.leverage_bps)?;
    w.u16(state.fee_bps)?;
    w.u16(state.standby_bps)?;
    w.u16(state.max_oracle_deviation_bps)?;
    w.u32(state.max_oracle_age_seconds)?;
    w.u8(state.minimum_publishers)?;
    w.zeroes(3)?;
    w.u32(state.adapter_version)?;
    for value in [
        state.transaction_cap,
        state.wallet_cap,
        state.tvl_cap,
        state.daily_mint_cap,
        state.daily_redeem_cap,
    ] {
        w.u64(value)?;
    }
    for address in [
        state.underlying_id,
        state.product_mint,
        state.product_token_program,
        state.settlement_mint,
        state.settlement_token_program,
        state.market_accounting,
        state.paired_risk_vault,
        state.clearing_vault,
        state.source_vault,
        state.reserve_vault,
        state.adapter_program,
        state.adapter_market,
        state.primary_oracle,
        state.primary_oracle_program,
        state.primary_feed_id,
        state.secondary_oracle,
        state.secondary_oracle_program,
        state.secondary_feed_id,
        state.adapter_abi_hash,
        state.session_policy_id,
        state.corporate_action_policy_id,
        state.paired_market_config,
    ] {
        w.address(&address)?;
    }
    w.zeroes(24)?;
    w.finish()?;
    Ok(bytes)
}

pub fn decode_market_config_v2(bytes: &[u8]) -> Result<MarketConfigV2> {
    if bytes.len() != MARKET_CONFIG_V2_LEN {
        return Err(Error::InvalidState);
    }
    let mut r = Reader::new(bytes);
    let (bump, side) = read_header(&mut r, &MARKET_CONFIG_V2_DISCRIMINATOR)?;
    let state = MarketConfigV2 {
        bump,
        side,
        leverage_bps: r.u16()?,
        fee_bps: r.u16()?,
        standby_bps: r.u16()?,
        max_oracle_deviation_bps: r.u16()?,
        max_oracle_age_seconds: r.u32()?,
        minimum_publishers: r.u8()?,
        adapter_version: {
            r.zeroes(3)?;
            r.u32()?
        },
        transaction_cap: { r.u64()? },
        wallet_cap: r.u64()?,
        tvl_cap: r.u64()?,
        daily_mint_cap: r.u64()?,
        daily_redeem_cap: r.u64()?,
        underlying_id: r.address()?,
        product_mint: r.address()?,
        product_token_program: r.address()?,
        settlement_mint: r.address()?,
        settlement_token_program: r.address()?,
        market_accounting: r.address()?,
        paired_risk_vault: r.address()?,
        clearing_vault: r.address()?,
        source_vault: r.address()?,
        reserve_vault: r.address()?,
        adapter_program: r.address()?,
        adapter_market: r.address()?,
        primary_oracle: r.address()?,
        primary_oracle_program: r.address()?,
        primary_feed_id: r.address()?,
        secondary_oracle: r.address()?,
        secondary_oracle_program: r.address()?,
        secondary_feed_id: r.address()?,
        adapter_abi_hash: r.address()?,
        session_policy_id: r.address()?,
        corporate_action_policy_id: r.address()?,
        paired_market_config: r.address()?,
    };
    r.zeroes(24)?;
    r.finish()?;
    validate_market_config_v2(&state)?;
    Ok(state)
}

pub fn encode_market_accounting_v2(
    state: &MarketAccountingV2,
) -> Result<[u8; MARKET_ACCOUNTING_V2_LEN]> {
    checked_accounting_sums(state)?;
    validate_addresses(&[
        state.market_config,
        state.paired_risk_vault,
        state.product_mint,
    ])?;
    let mut bytes = [0_u8; MARKET_ACCOUNTING_V2_LEN];
    let mut w = Writer::new(&mut bytes);
    write_header(
        &mut w,
        &MARKET_ACCOUNTING_V2_DISCRIMINATOR,
        state.bump,
        state.side,
    )?;
    w.u8(state.mode as u8)?;
    w.zeroes(3)?;
    for value in [
        state.epoch,
        state.daily_window,
        state.capital,
        state.total_supply,
        state.daily_minted,
        state.daily_redeemed,
        state.nav,
        state.gross_exposure,
        state.total_liabilities,
        state.queued_claim_liabilities,
        state.last_primary_price,
        state.last_secondary_price,
        state.last_primary_publish_time,
        state.last_secondary_publish_time,
        state.last_oracle_slot,
        state.last_settlement_slot,
        state.next_market_nonce,
        state.next_claim_id,
    ] {
        w.u64(value)?;
    }
    for address in [
        state.market_config,
        state.paired_risk_vault,
        state.product_mint,
    ] {
        w.address(&address)?;
    }
    w.zeroes(32)?;
    w.finish()?;
    Ok(bytes)
}

pub fn decode_market_accounting_v2(bytes: &[u8]) -> Result<MarketAccountingV2> {
    if bytes.len() != MARKET_ACCOUNTING_V2_LEN {
        return Err(Error::InvalidState);
    }
    let mut r = Reader::new(bytes);
    let (bump, side) = read_header(&mut r, &MARKET_ACCOUNTING_V2_DISCRIMINATOR)?;
    let mode = mode(r.u8()?)?;
    r.zeroes(3)?;
    let state = MarketAccountingV2 {
        bump,
        side,
        mode,
        epoch: r.u64()?,
        daily_window: r.u64()?,
        capital: r.u64()?,
        total_supply: r.u64()?,
        daily_minted: r.u64()?,
        daily_redeemed: r.u64()?,
        nav: r.u64()?,
        gross_exposure: r.u64()?,
        total_liabilities: r.u64()?,
        queued_claim_liabilities: r.u64()?,
        last_primary_price: r.u64()?,
        last_secondary_price: r.u64()?,
        last_primary_publish_time: r.u64()?,
        last_secondary_publish_time: r.u64()?,
        last_oracle_slot: r.u64()?,
        last_settlement_slot: r.u64()?,
        next_market_nonce: r.u64()?,
        next_claim_id: r.u64()?,
        market_config: r.address()?,
        paired_risk_vault: r.address()?,
        product_mint: r.address()?,
    };
    r.zeroes(32)?;
    r.finish()?;
    checked_accounting_sums(&state)?;
    validate_addresses(&[
        state.market_config,
        state.paired_risk_vault,
        state.product_mint,
    ])?;
    Ok(state)
}

pub fn encode_paired_risk_vault_v2(
    state: &PairedRiskVaultV2,
) -> Result<[u8; PAIRED_RISK_VAULT_V2_LEN]> {
    checked_paired_risk_sums(state)?;
    validate_addresses(&[
        state.long_market_config,
        state.short_market_config,
        state.long_market_accounting,
        state.short_market_accounting,
        state.long_clearing_vault,
        state.short_clearing_vault,
        state.long_reserve_vault,
        state.short_reserve_vault,
        state.long_maker_vault,
        state.short_maker_vault,
        state.long_unwind_route,
        state.short_unwind_route,
        state.primary_maker,
        state.secondary_maker,
    ])?;
    let mut bytes = [0_u8; PAIRED_RISK_VAULT_V2_LEN];
    let mut w = Writer::new(&mut bytes);
    write_pair_header(&mut w, state.bump, state.mode)?;
    for value in [
        state.epoch,
        state.long_capital,
        state.short_capital,
        state.matched_exposure,
        state.residual_long_exposure,
        state.residual_short_exposure,
        state.long_maker_collateral,
        state.short_maker_collateral,
        state.long_reserve,
        state.short_reserve,
        state.long_unwind_capacity,
        state.short_unwind_capacity,
        state.maker_commitment_expiry_slot,
        state.long_queued_liabilities,
        state.short_queued_liabilities,
        state.long_nav,
        state.short_nav,
        state.next_vault_nonce,
        state.last_settlement_slot,
    ] {
        w.u64(value)?;
    }
    for address in [
        state.long_market_config,
        state.short_market_config,
        state.long_market_accounting,
        state.short_market_accounting,
        state.long_clearing_vault,
        state.short_clearing_vault,
        state.long_reserve_vault,
        state.short_reserve_vault,
        state.long_maker_vault,
        state.short_maker_vault,
        state.long_unwind_route,
        state.short_unwind_route,
        state.primary_maker,
        state.secondary_maker,
    ] {
        w.address(&address)?;
    }
    w.zeroes(24)?;
    w.finish()?;
    Ok(bytes)
}

pub fn decode_paired_risk_vault_v2(bytes: &[u8]) -> Result<PairedRiskVaultV2> {
    if bytes.len() != PAIRED_RISK_VAULT_V2_LEN {
        return Err(Error::InvalidState);
    }
    let mut r = Reader::new(bytes);
    let (bump, mode) = read_pair_header(&mut r)?;
    let state = PairedRiskVaultV2 {
        bump,
        mode,
        epoch: r.u64()?,
        long_capital: r.u64()?,
        short_capital: r.u64()?,
        matched_exposure: r.u64()?,
        residual_long_exposure: r.u64()?,
        residual_short_exposure: r.u64()?,
        long_maker_collateral: r.u64()?,
        short_maker_collateral: r.u64()?,
        long_reserve: r.u64()?,
        short_reserve: r.u64()?,
        long_unwind_capacity: r.u64()?,
        short_unwind_capacity: r.u64()?,
        maker_commitment_expiry_slot: r.u64()?,
        long_queued_liabilities: r.u64()?,
        short_queued_liabilities: r.u64()?,
        long_nav: r.u64()?,
        short_nav: r.u64()?,
        next_vault_nonce: r.u64()?,
        last_settlement_slot: r.u64()?,
        long_market_config: r.address()?,
        short_market_config: r.address()?,
        long_market_accounting: r.address()?,
        short_market_accounting: r.address()?,
        long_clearing_vault: r.address()?,
        short_clearing_vault: r.address()?,
        long_reserve_vault: r.address()?,
        short_reserve_vault: r.address()?,
        long_maker_vault: r.address()?,
        short_maker_vault: r.address()?,
        long_unwind_route: r.address()?,
        short_unwind_route: r.address()?,
        primary_maker: r.address()?,
        secondary_maker: r.address()?,
    };
    r.zeroes(24)?;
    r.finish()?;
    checked_paired_risk_sums(&state)?;
    validate_addresses(&[
        state.long_market_config,
        state.short_market_config,
        state.long_market_accounting,
        state.short_market_accounting,
        state.long_clearing_vault,
        state.short_clearing_vault,
        state.long_reserve_vault,
        state.short_reserve_vault,
        state.long_maker_vault,
        state.short_maker_vault,
        state.long_unwind_route,
        state.short_unwind_route,
        state.primary_maker,
        state.secondary_maker,
    ])?;
    Ok(state)
}

pub fn encode_position_v2(state: &PositionV2) -> Result<[u8; POSITION_V2_LEN]> {
    validate_position_v2(state)?;
    let mut bytes = [0_u8; POSITION_V2_LEN];
    let mut w = Writer::new(&mut bytes);
    write_header(&mut w, &POSITION_V2_DISCRIMINATOR, state.bump, state.side)?;
    w.zeroes(4)?;
    for address in [
        state.owner,
        state.market_config,
        state.market_accounting,
        state.product_mint,
    ] {
        w.address(&address)?;
    }
    for value in [
        state.shares,
        state.cost_basis,
        state.wallet_open_capital,
        state.daily_window,
        state.daily_minted,
        state.daily_redeemed,
        state.next_nonce,
        state.last_action_slot,
    ] {
        w.u64(value)?;
    }
    w.i64(state.realized_pnl)?;
    w.zeroes(8)?;
    w.finish()?;
    Ok(bytes)
}

pub fn decode_position_v2(bytes: &[u8]) -> Result<PositionV2> {
    if bytes.len() != POSITION_V2_LEN {
        return Err(Error::InvalidState);
    }
    let mut r = Reader::new(bytes);
    let (bump, side) = read_header(&mut r, &POSITION_V2_DISCRIMINATOR)?;
    r.zeroes(4)?;
    let state = PositionV2 {
        bump,
        side,
        owner: r.address()?,
        market_config: r.address()?,
        market_accounting: r.address()?,
        product_mint: r.address()?,
        shares: r.u64()?,
        cost_basis: r.u64()?,
        wallet_open_capital: r.u64()?,
        daily_window: r.u64()?,
        daily_minted: r.u64()?,
        daily_redeemed: r.u64()?,
        next_nonce: r.u64()?,
        last_action_slot: r.u64()?,
        realized_pnl: r.i64()?,
    };
    r.zeroes(8)?;
    r.finish()?;
    validate_position_v2(&state)?;
    Ok(state)
}

pub fn validate_position_v2(state: &PositionV2) -> Result<()> {
    validate_addresses(&[
        state.owner,
        state.market_config,
        state.market_accounting,
        state.product_mint,
    ])?;
    state
        .cost_basis
        .checked_add(state.wallet_open_capital)
        .ok_or(Error::ArithmeticOverflow)?;
    if (state.shares == 0) != (state.cost_basis == 0)
        || (state.shares == 0) != (state.wallet_open_capital == 0)
        || (state.daily_window == 0 && (state.daily_minted != 0 || state.daily_redeemed != 0))
    {
        return Err(Error::InvalidState);
    }
    Ok(())
}

pub fn validate_market_roles_v2(
    config_key: Address,
    config: &MarketConfigV2,
    accounting: &MarketAccountingV2,
    paired_risk_key: Address,
) -> Result<()> {
    if config.side != accounting.side
        || accounting.market_config != config_key
        || config.paired_risk_vault != paired_risk_key
        || accounting.paired_risk_vault != paired_risk_key
        || accounting.product_mint != config.product_mint
        || accounting.capital > config.tvl_cap
        || accounting.daily_minted > config.daily_mint_cap
        || accounting.daily_redeemed > config.daily_redeem_cap
    {
        return Err(Error::InvalidConfiguration);
    }
    Ok(())
}

pub fn validate_position_roles_v2(
    config: &MarketConfigV2,
    accounting: &MarketAccountingV2,
    position: &PositionV2,
) -> Result<()> {
    if position.side != config.side
        || position.market_config != accounting.market_config
        || position.market_accounting != config.market_accounting
        || position.product_mint != config.product_mint
        || position.wallet_open_capital > config.wallet_cap
        || position.daily_minted > config.daily_mint_cap
        || position.daily_redeemed > config.daily_redeem_cap
    {
        return Err(Error::InvalidConfiguration);
    }
    Ok(())
}

pub struct MarketSideV2<'a> {
    pub config_key: Address,
    pub config: &'a MarketConfigV2,
    pub accounting: &'a MarketAccountingV2,
}

pub fn validate_paired_market_roles_v2(
    paired_risk_key: Address,
    paired_risk: &PairedRiskVaultV2,
    long_side: MarketSideV2<'_>,
    short_side: MarketSideV2<'_>,
) -> Result<()> {
    let MarketSideV2 {
        config_key: long_key,
        config: long,
        accounting: long_accounting,
    } = long_side;
    let MarketSideV2 {
        config_key: short_key,
        config: short,
        accounting: short_accounting,
    } = short_side;
    if long.side != Side::Long
        || short.side != Side::Short
        || long.underlying_id != short.underlying_id
        || long.paired_market_config != short_key
        || short.paired_market_config != long_key
        || long.paired_risk_vault != paired_risk_key
        || short.paired_risk_vault != paired_risk_key
        || paired_risk.long_market_config != long_key
        || paired_risk.short_market_config != short_key
        || paired_risk.long_market_accounting != long.market_accounting
        || paired_risk.short_market_accounting != short.market_accounting
        || paired_risk.long_clearing_vault != long.clearing_vault
        || paired_risk.short_clearing_vault != short.clearing_vault
        || paired_risk.long_reserve_vault != long.reserve_vault
        || paired_risk.short_reserve_vault != short.reserve_vault
        || long_accounting.capital != paired_risk.long_capital
        || short_accounting.capital != paired_risk.short_capital
        || long_accounting.nav != paired_risk.long_nav
        || short_accounting.nav != paired_risk.short_nav
        || long_accounting.queued_claim_liabilities != paired_risk.long_queued_liabilities
        || short_accounting.queued_claim_liabilities != paired_risk.short_queued_liabilities
        || long_accounting.mode != paired_risk.mode
        || short_accounting.mode != paired_risk.mode
    {
        return Err(Error::NotIsolated);
    }
    let long_roles = [
        long.product_mint,
        long.market_accounting,
        long.clearing_vault,
        long.source_vault,
        long.reserve_vault,
        long.adapter_market,
        paired_risk.long_maker_vault,
        paired_risk.long_unwind_route,
    ];
    let short_roles = [
        short.product_mint,
        short.market_accounting,
        short.clearing_vault,
        short.source_vault,
        short.reserve_vault,
        short.adapter_market,
        paired_risk.short_maker_vault,
        paired_risk.short_unwind_route,
    ];
    if long_roles.iter().any(|role| short_roles.contains(role)) {
        return Err(Error::NotIsolated);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    extern crate std;
    use super::*;

    fn a(value: u8) -> Address {
        [value; 32]
    }
    fn config(side: Side, offset: u8) -> MarketConfigV2 {
        let next = |delta: u8| offset.saturating_add(delta);
        MarketConfigV2 {
            bump: 250,
            side,
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
            underlying_id: a(1),
            product_mint: a(offset),
            product_token_program: a(next(1)),
            settlement_mint: a(next(2)),
            settlement_token_program: a(next(3)),
            market_accounting: a(next(4)),
            paired_risk_vault: a(next(5)),
            clearing_vault: a(next(6)),
            source_vault: a(next(7)),
            reserve_vault: a(next(8)),
            adapter_program: a(next(9)),
            adapter_market: a(next(10)),
            primary_oracle: a(next(11)),
            primary_oracle_program: a(next(12)),
            primary_feed_id: a(next(13)),
            secondary_oracle: a(next(14)),
            secondary_oracle_program: a(next(15)),
            secondary_feed_id: a(next(16)),
            adapter_abi_hash: a(next(17)),
            session_policy_id: a(next(18)),
            corporate_action_policy_id: a(next(19)),
            paired_market_config: a(next(20)),
        }
    }
    fn accounting(
        side: Side,
        config_key: Address,
        risk_key: Address,
        mint: Address,
    ) -> MarketAccountingV2 {
        MarketAccountingV2 {
            bump: 249,
            side,
            mode: VaultMode::Active,
            epoch: 1,
            daily_window: 1,
            capital: 100,
            total_supply: 100,
            daily_minted: 10,
            daily_redeemed: 5,
            nav: 100,
            gross_exposure: 200,
            total_liabilities: 2,
            queued_claim_liabilities: 1,
            last_primary_price: 100,
            last_secondary_price: 101,
            last_primary_publish_time: 7,
            last_secondary_publish_time: 7,
            last_oracle_slot: 8,
            last_settlement_slot: 9,
            next_market_nonce: 10,
            next_claim_id: 2,
            market_config: config_key,
            paired_risk_vault: risk_key,
            product_mint: mint,
        }
    }
    fn paired_risk(
        long_key: Address,
        short_key: Address,
        long_accounting: Address,
        short_accounting: Address,
        offset: u8,
    ) -> PairedRiskVaultV2 {
        let next = |delta: u8| offset.saturating_add(delta);
        PairedRiskVaultV2 {
            bump: 248,
            mode: VaultMode::Active,
            epoch: 1,
            long_capital: 100,
            short_capital: 100,
            matched_exposure: 100,
            residual_long_exposure: 0,
            residual_short_exposure: 0,
            long_maker_collateral: 100,
            short_maker_collateral: 100,
            long_reserve: 10,
            short_reserve: 10,
            long_unwind_capacity: 200,
            short_unwind_capacity: 200,
            maker_commitment_expiry_slot: 1_000,
            long_queued_liabilities: 1,
            short_queued_liabilities: 1,
            long_nav: 100,
            short_nav: 100,
            next_vault_nonce: 4,
            last_settlement_slot: 9,
            long_market_config: long_key,
            short_market_config: short_key,
            long_market_accounting: long_accounting,
            short_market_accounting: short_accounting,
            long_clearing_vault: a(offset),
            short_clearing_vault: a(next(1)),
            long_reserve_vault: a(next(2)),
            short_reserve_vault: a(next(3)),
            long_maker_vault: a(next(4)),
            short_maker_vault: a(next(5)),
            long_unwind_route: a(next(6)),
            short_unwind_route: a(next(7)),
            primary_maker: a(next(8)),
            secondary_maker: a(next(9)),
        }
    }
    fn position(
        side: Side,
        config_key: Address,
        accounting_key: Address,
        mint: Address,
    ) -> PositionV2 {
        PositionV2 {
            bump: 247,
            side,
            owner: a(90),
            market_config: config_key,
            market_accounting: accounting_key,
            product_mint: mint,
            shares: 50,
            cost_basis: 51,
            wallet_open_capital: 50,
            daily_window: 1,
            daily_minted: 50,
            daily_redeemed: 0,
            next_nonce: 2,
            last_action_slot: 9,
            realized_pnl: -1,
        }
    }

    #[test]
    fn every_layout_roundtrips_exactly() {
        let cfg = config(Side::Long, 10);
        assert_eq!(
            decode_market_config_v2(&encode_market_config_v2(&cfg).expect("encode")),
            Ok(cfg)
        );
        let acc = accounting(Side::Long, a(80), cfg.paired_risk_vault, cfg.product_mint);
        assert_eq!(
            decode_market_accounting_v2(&encode_market_accounting_v2(&acc).expect("encode")),
            Ok(acc)
        );
        let vault = paired_risk(a(80), a(81), a(82), a(83), 100);
        assert_eq!(
            decode_paired_risk_vault_v2(&encode_paired_risk_vault_v2(&vault).expect("encode")),
            Ok(vault)
        );
        let pos = position(Side::Long, a(80), cfg.market_accounting, cfg.product_mint);
        assert_eq!(
            decode_position_v2(&encode_position_v2(&pos).expect("encode")),
            Ok(pos)
        );
    }

    #[test]
    fn exact_lengths_headers_and_all_reserved_bytes_are_enforced() {
        let cfg = encode_market_config_v2(&config(Side::Long, 10)).expect("encode");
        assert_eq!(
            decode_market_config_v2(&cfg[..cfg.len() - 1]),
            Err(Error::InvalidState)
        );
        for index in [0_usize, 8, 9, 25, 27, 776, 799] {
            let mut corrupt = cfg;
            corrupt[index] ^= 1;
            assert!(decode_market_config_v2(&corrupt).is_err(), "index {index}");
        }
        let acc = accounting(Side::Long, a(80), a(81), a(82));
        let encoded = encode_market_accounting_v2(&acc).expect("encode");
        for index in 256..288 {
            let mut corrupt = encoded;
            corrupt[index] = 1;
            assert!(decode_market_accounting_v2(&corrupt).is_err());
        }
        let encoded = encode_paired_risk_vault_v2(&paired_risk(a(80), a(81), a(82), a(83), 100))
            .expect("encode");
        for index in 616..640 {
            let mut corrupt = encoded;
            corrupt[index] = 1;
            assert!(decode_paired_risk_vault_v2(&corrupt).is_err());
        }
        let encoded =
            encode_position_v2(&position(Side::Long, a(80), a(81), a(82))).expect("encode");
        for index in 216..224 {
            let mut corrupt = encoded;
            corrupt[index] = 1;
            assert!(decode_position_v2(&corrupt).is_err());
        }
    }

    #[test]
    fn arithmetic_boundaries_fail_closed() {
        let mut acc = accounting(Side::Long, a(80), a(81), a(82));
        acc.nav = u64::MAX;
        acc.total_liabilities = 1;
        assert_eq!(
            encode_market_accounting_v2(&acc),
            Err(Error::ArithmeticOverflow)
        );
        let mut vault = paired_risk(a(80), a(81), a(82), a(83), 100);
        vault.long_capital = u64::MAX;
        vault.short_capital = 1;
        assert_eq!(
            encode_paired_risk_vault_v2(&vault),
            Err(Error::ArithmeticOverflow)
        );
        let mut pos = position(Side::Long, a(80), a(81), a(82));
        pos.cost_basis = u64::MAX;
        pos.wallet_open_capital = 1;
        assert_eq!(encode_position_v2(&pos), Err(Error::ArithmeticOverflow));
    }

    #[test]
    fn role_binding_and_long_short_isolation_are_strict() {
        let mut long = config(Side::Long, 10);
        let mut short = config(Side::Short, 40);
        let long_key = a(98);
        let short_key = a(99);
        let paired_risk_key = a(97);
        long.paired_risk_vault = paired_risk_key;
        short.paired_risk_vault = paired_risk_key;
        long.paired_market_config = short_key;
        short.paired_market_config = long_key;
        let long_accounting = accounting(Side::Long, long_key, paired_risk_key, long.product_mint);
        let short_accounting =
            accounting(Side::Short, short_key, paired_risk_key, short.product_mint);
        let mut paired = paired_risk(
            long_key,
            short_key,
            long.market_accounting,
            short.market_accounting,
            100,
        );
        paired.long_clearing_vault = long.clearing_vault;
        paired.short_clearing_vault = short.clearing_vault;
        paired.long_reserve_vault = long.reserve_vault;
        paired.short_reserve_vault = short.reserve_vault;
        let long_side = MarketSideV2 {
            config_key: long_key,
            config: &long,
            accounting: &long_accounting,
        };
        let short_side = MarketSideV2 {
            config_key: short_key,
            config: &short,
            accounting: &short_accounting,
        };
        assert_eq!(
            validate_paired_market_roles_v2(paired_risk_key, &paired, long_side, short_side),
            Ok(())
        );
        short.reserve_vault = long.reserve_vault;
        let long_side = MarketSideV2 {
            config_key: long_key,
            config: &long,
            accounting: &long_accounting,
        };
        let short_side = MarketSideV2 {
            config_key: short_key,
            config: &short,
            accounting: &short_accounting,
        };
        assert_eq!(
            validate_paired_market_roles_v2(paired_risk_key, &paired, long_side, short_side),
            Err(Error::NotIsolated)
        );
    }

    #[test]
    fn deterministic_corruption_property_never_silently_changes_state() {
        let original = config(Side::Long, 10);
        let encoded = encode_market_config_v2(&original).expect("encode");
        for index in 0..encoded.len() {
            let mut corrupt = encoded;
            corrupt[index] ^= 0x80;
            if let Ok(decoded) = decode_market_config_v2(&corrupt) {
                assert_ne!(decoded, original);
            }
        }
    }
}
