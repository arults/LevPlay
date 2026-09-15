//! Canonical, allocation-free layouts for LevPlay program-owned accounts.
//!
//! Decoding is strict: account data must have the exact length, discriminator,
//! version, initialized marker and zeroed reserved bytes. Critical addresses
//! must be nonzero and pairwise distinct.

use crate::{Address, Error, Result, Side, VaultMode, ENTRY_FEE_BPS, PILOT_LEVERAGE_BPS};

pub const CONFIG_DISCRIMINATOR: [u8; 8] = *b"LVPCFG01";
pub const MARKET_DISCRIMINATOR: [u8; 8] = *b"LVPMKT01";
pub const ACCOUNT_VERSION: u8 = 1;
pub const CONFIG_STATE_LEN: usize = 208;
pub const MARKET_STATE_LEN: usize = 296;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ConfigState {
    pub bump: u8,
    pub governance: Address,
    pub guardian: Address,
    pub treasury_owner: Address,
    pub fee_vault: Address,
    pub usdc_mint: Address,
    pub token_program: Address,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketState {
    pub bump: u8,
    pub side: Side,
    pub mode: VaultMode,
    pub nonce: u64,
    pub transaction_cap: u64,
    pub wallet_cap: u64,
    pub tvl_cap: u64,
    pub daily_mint_cap: u64,
    pub daily_redeem_cap: u64,
    pub standby_bps: u16,
    pub leverage_bps: u16,
    pub fee_bps: u16,
    pub product_mint: Address,
    pub clearing_vault: Address,
    pub reserve_vault: Address,
    pub adapter_program: Address,
    pub adapter_market: Address,
    pub primary_oracle: Address,
    pub secondary_oracle: Address,
}

struct StateReader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> StateReader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, count: usize) -> Result<&'a [u8]> {
        let end = self
            .offset
            .checked_add(count)
            .ok_or(Error::ArithmeticOverflow)?;
        if end > self.bytes.len() {
            return Err(Error::InvalidState);
        }
        let value = &self.bytes[self.offset..end];
        self.offset = end;
        Ok(value)
    }

    fn u8(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }

    fn u16(&mut self) -> Result<u16> {
        let bytes: [u8; 2] = self
            .take(2)?
            .try_into()
            .map_err(|_| Error::InvalidState)?;
        Ok(u16::from_le_bytes(bytes))
    }

    fn u64(&mut self) -> Result<u64> {
        let bytes: [u8; 8] = self
            .take(8)?
            .try_into()
            .map_err(|_| Error::InvalidState)?;
        Ok(u64::from_le_bytes(bytes))
    }

    fn address(&mut self) -> Result<Address> {
        self.take(32)?
            .try_into()
            .map_err(|_| Error::InvalidState)
    }

    fn zeroes(&mut self, count: usize) -> Result<()> {
        if self.take(count)?.iter().any(|value| *value != 0) {
            return Err(Error::InvalidState);
        }
        Ok(())
    }

    fn finish(self) -> Result<()> {
        if self.offset != self.bytes.len() {
            return Err(Error::InvalidState);
        }
        Ok(())
    }
}

fn validate_addresses(addresses: &[Address]) -> Result<()> {
    let zero = [0_u8; 32];
    let mut outer = 0_usize;
    while outer < addresses.len() {
        if addresses[outer] == zero {
            return Err(Error::InvalidConfiguration);
        }
        let mut inner = outer.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
        while inner < addresses.len() {
            if addresses[outer] == addresses[inner] {
                return Err(Error::InvalidConfiguration);
            }
            inner = inner.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
        }
        outer = outer.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
    }
    Ok(())
}

fn read_header(
    reader: &mut StateReader<'_>,
    discriminator: &[u8; 8],
) -> Result<u8> {
    if reader.take(8)? != discriminator
        || reader.u8()? != ACCOUNT_VERSION
        || reader.u8()? == 0
    {
        return Err(Error::InvalidState);
    }
    let bump = reader.u8()?;
    Ok(bump)
}

pub fn decode_config_state(bytes: &[u8]) -> Result<ConfigState> {
    if bytes.len() != CONFIG_STATE_LEN {
        return Err(Error::InvalidState);
    }
    let mut reader = StateReader::new(bytes);
    let bump = read_header(&mut reader, &CONFIG_DISCRIMINATOR)?;
    reader.zeroes(5)?;
    let state = ConfigState {
        bump,
        governance: reader.address()?,
        guardian: reader.address()?,
        treasury_owner: reader.address()?,
        fee_vault: reader.address()?,
        usdc_mint: reader.address()?,
        token_program: reader.address()?,
    };
    reader.finish()?;
    validate_addresses(&[
        state.governance,
        state.guardian,
        state.treasury_owner,
        state.fee_vault,
        state.usdc_mint,
        state.token_program,
    ])?;
    Ok(state)
}

pub fn decode_market_state(bytes: &[u8]) -> Result<MarketState> {
    if bytes.len() != MARKET_STATE_LEN {
        return Err(Error::InvalidState);
    }
    let mut reader = StateReader::new(bytes);
    let bump = read_header(&mut reader, &MARKET_DISCRIMINATOR)?;
    let side = match reader.u8()? {
        0 => Side::Long,
        1 => Side::Short,
        _ => return Err(Error::InvalidState),
    };
    let mode = match reader.u8()? {
        0 => VaultMode::Active,
        1 => VaultMode::Standby,
        2 => VaultMode::Paused,
        3 => VaultMode::Insolvent,
        4 => VaultMode::WindDown,
        _ => return Err(Error::InvalidState),
    };
    reader.zeroes(3)?;
    let nonce = reader.u64()?;
    let transaction_cap = reader.u64()?;
    let wallet_cap = reader.u64()?;
    let tvl_cap = reader.u64()?;
    let daily_mint_cap = reader.u64()?;
    let daily_redeem_cap = reader.u64()?;
    let standby_bps = reader.u16()?;
    let leverage_bps = reader.u16()?;
    let fee_bps = reader.u16()?;
    reader.zeroes(2)?;
    let state = MarketState {
        bump,
        side,
        mode,
        nonce,
        transaction_cap,
        wallet_cap,
        tvl_cap,
        daily_mint_cap,
        daily_redeem_cap,
        standby_bps,
        leverage_bps,
        fee_bps,
        product_mint: reader.address()?,
        clearing_vault: reader.address()?,
        reserve_vault: reader.address()?,
        adapter_program: reader.address()?,
        adapter_market: reader.address()?,
        primary_oracle: reader.address()?,
        secondary_oracle: reader.address()?,
    };
    reader.finish()?;
    if state.leverage_bps != PILOT_LEVERAGE_BPS
        || state.fee_bps > ENTRY_FEE_BPS
        || !(1..=500).contains(&state.standby_bps)
        || state.transaction_cap == 0
        || state.transaction_cap > state.wallet_cap
        || state.wallet_cap > state.tvl_cap
        || state.daily_mint_cap == 0
        || state.daily_redeem_cap == 0
    {
        return Err(Error::InvalidConfiguration);
    }
    validate_addresses(&[
        state.product_mint,
        state.clearing_vault,
        state.reserve_vault,
        state.adapter_program,
        state.adapter_market,
        state.primary_oracle,
        state.secondary_oracle,
    ])?;
    Ok(state)
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn write_address(bytes: &mut [u8], offset: usize, value: u8) {
        bytes[offset..offset + 32].copy_from_slice(&address(value));
    }

    fn config_bytes() -> [u8; CONFIG_STATE_LEN] {
        let mut bytes = [0_u8; CONFIG_STATE_LEN];
        bytes[0..8].copy_from_slice(&CONFIG_DISCRIMINATOR);
        bytes[8] = ACCOUNT_VERSION;
        bytes[9] = 1;
        bytes[10] = 253;
        write_address(&mut bytes, 16, 1);
        write_address(&mut bytes, 48, 2);
        write_address(&mut bytes, 80, 3);
        write_address(&mut bytes, 112, 4);
        write_address(&mut bytes, 144, 5);
        write_address(&mut bytes, 176, 6);
        bytes
    }

    fn market_bytes() -> [u8; MARKET_STATE_LEN] {
        let mut bytes = [0_u8; MARKET_STATE_LEN];
        bytes[0..8].copy_from_slice(&MARKET_DISCRIMINATOR);
        bytes[8] = ACCOUNT_VERSION;
        bytes[9] = 1;
        bytes[10] = 252;
        bytes[11] = Side::Long as u8;
        bytes[12] = VaultMode::Active as u8;
        bytes[16..24].copy_from_slice(&7_u64.to_le_bytes());
        bytes[24..32].copy_from_slice(&100_u64.to_le_bytes());
        bytes[32..40].copy_from_slice(&100_u64.to_le_bytes());
        bytes[40..48].copy_from_slice(&1_000_u64.to_le_bytes());
        bytes[48..56].copy_from_slice(&1_000_u64.to_le_bytes());
        bytes[56..64].copy_from_slice(&1_000_u64.to_le_bytes());
        bytes[64..66].copy_from_slice(&100_u16.to_le_bytes());
        bytes[66..68].copy_from_slice(&PILOT_LEVERAGE_BPS.to_le_bytes());
        bytes[68..70].copy_from_slice(&ENTRY_FEE_BPS.to_le_bytes());
        write_address(&mut bytes, 72, 11);
        write_address(&mut bytes, 104, 12);
        write_address(&mut bytes, 136, 13);
        write_address(&mut bytes, 168, 14);
        write_address(&mut bytes, 200, 15);
        write_address(&mut bytes, 232, 16);
        write_address(&mut bytes, 264, 17);
        bytes
    }

    #[test]
    fn config_layout_is_exact_versioned_and_isolated() {
        let decoded = decode_config_state(&config_bytes()).expect("valid config");
        assert_eq!(decoded.bump, 253);
        assert_eq!(decoded.governance, address(1));
        assert_eq!(decoded.guardian, address(2));
        assert_eq!(decoded.fee_vault, address(4));
    }

    #[test]
    fn config_rejects_wrong_length_header_uninitialized_and_reserved_data() {
        assert_eq!(
            decode_config_state(&config_bytes()[..CONFIG_STATE_LEN - 1]),
            Err(Error::InvalidState)
        );
        let mut bytes = config_bytes();
        bytes[0] = b'X';
        assert_eq!(decode_config_state(&bytes), Err(Error::InvalidState));
        let mut bytes = config_bytes();
        bytes[9] = 0;
        assert_eq!(decode_config_state(&bytes), Err(Error::InvalidState));
        let mut bytes = config_bytes();
        bytes[11] = 1;
        assert_eq!(decode_config_state(&bytes), Err(Error::InvalidState));
    }

    #[test]
    fn config_rejects_zero_and_aliased_critical_accounts() {
        let mut bytes = config_bytes();
        write_address(&mut bytes, 144, 0);
        assert_eq!(
            decode_config_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
        let mut bytes = config_bytes();
        write_address(&mut bytes, 112, 1);
        assert_eq!(
            decode_config_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
    }

    #[test]
    fn market_layout_is_exact_and_bounded() {
        let decoded = decode_market_state(&market_bytes()).expect("valid market");
        assert_eq!(decoded.bump, 252);
        assert_eq!(decoded.nonce, 7);
        assert_eq!(decoded.side, Side::Long);
        assert_eq!(decoded.mode, VaultMode::Active);
        assert_eq!(decoded.product_mint, address(11));
    }

    #[test]
    fn market_rejects_bad_enums_reserved_bytes_and_caps() {
        let mut bytes = market_bytes();
        bytes[11] = 2;
        assert_eq!(decode_market_state(&bytes), Err(Error::InvalidState));
        let mut bytes = market_bytes();
        bytes[13] = 1;
        assert_eq!(decode_market_state(&bytes), Err(Error::InvalidState));
        let mut bytes = market_bytes();
        bytes[32..40].copy_from_slice(&99_u64.to_le_bytes());
        assert_eq!(
            decode_market_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
    }

    #[test]
    fn market_rejects_wrong_leverage_fee_and_aliased_accounts() {
        let mut bytes = market_bytes();
        bytes[66..68].copy_from_slice(&30_000_u16.to_le_bytes());
        assert_eq!(
            decode_market_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
        let mut bytes = market_bytes();
        bytes[68..70].copy_from_slice(&51_u16.to_le_bytes());
        assert_eq!(
            decode_market_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
        let mut bytes = market_bytes();
        write_address(&mut bytes, 264, 11);
        assert_eq!(
            decode_market_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
    }
}
