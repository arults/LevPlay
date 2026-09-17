#![no_std]
#![forbid(unsafe_code)]

mod position_accounts;
mod program_boundary;
mod risk_vault;
mod state_accounts;
mod source_token;
pub use position_accounts::*;
pub use program_boundary::*;
pub use risk_vault::*;
pub use state_accounts::*;
pub use source_token::*;

pub const BPS: u64 = 10_000;
pub const ENTRY_FEE_BPS: u16 = 50;
pub const PILOT_LEVERAGE_BPS: u16 = 20_000;

pub type Address = [u8; 32];

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum Side {
    Long = 0,
    Short = 1,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum VaultMode {
    Active = 0,
    Standby = 1,
    Paused = 2,
    Insolvent = 3,
    WindDown = 4,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    ArithmeticOverflow,
    DivisionByZero,
    InvalidAmount,
    InvalidConfiguration,
    InvalidState,
    InvalidOracle,
    InvalidInstruction,
    InvalidAccounts,
    InvalidTransaction,
    Replay,
    QuoteExpired,
    CapExceeded,
    SlippageExceeded,
    NotIsolated,
}

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MarketConfig {
    pub side: Side,
    pub leverage_bps: u16,
    pub fee_bps: u16,
    pub standby_bps: u16,
    pub transaction_cap: u64,
    pub wallet_cap: u64,
    pub tvl_cap: u64,
    pub daily_mint_cap: u64,
    pub daily_redeem_cap: u64,
    pub market: Address,
    pub product_mint: Address,
    pub backing_vault: Address,
    pub reserve_vault: Address,
    pub adapter_program: Address,
    pub adapter_market: Address,
    pub primary_oracle: Address,
    pub secondary_oracle: Address,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct VaultState {
    pub mode: VaultMode,
    pub side: Side,
    pub leverage_bps: u16,
    pub nav: u64,
    pub reference_nav: u64,
    pub exposure: u64,
    pub reserve: u64,
    pub standby_bps: u16,
    pub epoch: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub state: VaultState,
    pub pnl: i128,
    pub reserve_draw: u64,
    pub uncovered_deficit: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OpenContext {
    pub capital: u64,
    pub minimum_shares_out: u64,
    pub current_slot: u64,
    pub quote_expiry_slot: u64,
    pub wallet_open_capital: u64,
    pub market_tvl: u64,
    pub daily_minted: u64,
    pub available_backing_capital: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OracleObservation {
    pub price: u64,
    pub age_seconds: u32,
    pub confidence_bps: u16,
    pub publishers: u8,
}

fn checked_u64(value: u128) -> Result<u64> {
    u64::try_from(value).map_err(|_| Error::ArithmeticOverflow)
}

pub fn mul_div_floor(a: u64, b: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Err(Error::DivisionByZero);
    }
    let product = u128::from(a)
        .checked_mul(u128::from(b))
        .ok_or(Error::ArithmeticOverflow)?;
    checked_u64(
        product
            .checked_div(u128::from(denominator))
            .ok_or(Error::DivisionByZero)?,
    )
}

pub fn mul_div_ceil(a: u64, b: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Err(Error::DivisionByZero);
    }
    let product = u128::from(a)
        .checked_mul(u128::from(b))
        .ok_or(Error::ArithmeticOverflow)?;
    let adjusted = product
        .checked_add(
            u128::from(denominator)
                .checked_sub(1)
                .ok_or(Error::ArithmeticOverflow)?,
        )
        .ok_or(Error::ArithmeticOverflow)?;
    checked_u64(
        adjusted
            .checked_div(u128::from(denominator))
            .ok_or(Error::DivisionByZero)?,
    )
}

pub fn entry_fee(capital: u64, fee_bps: u16) -> Result<u64> {
    if capital == 0 || fee_bps > ENTRY_FEE_BPS {
        return Err(Error::InvalidAmount);
    }
    mul_div_floor(capital, u64::from(fee_bps), BPS)
}

pub fn shares_on_open(capital: u64, supply: u64, nav: u64) -> Result<u64> {
    if capital == 0 {
        return Err(Error::InvalidAmount);
    }
    match (supply, nav) {
        (0, 0) => Ok(capital),
        (0, _) | (_, 0) => Err(Error::InvalidState),
        _ => mul_div_floor(capital, supply, nav),
    }
}

pub fn assets_on_close(shares: u64, supply: u64, nav: u64) -> Result<u64> {
    if shares == 0 || supply == 0 || shares > supply {
        return Err(Error::InvalidAmount);
    }
    mul_div_floor(shares, nav, supply)
}

pub fn validate_market(config: &MarketConfig) -> Result<()> {
    let zero = [0_u8; 32];
    if config.leverage_bps != PILOT_LEVERAGE_BPS
        || config.fee_bps > ENTRY_FEE_BPS
        || !(1..=500).contains(&config.standby_bps)
        || config.transaction_cap == 0
        || config.transaction_cap > config.wallet_cap
        || config.wallet_cap > config.tvl_cap
        || config.daily_mint_cap == 0
        || config.daily_redeem_cap == 0
    {
        return Err(Error::InvalidConfiguration);
    }
    let addresses = [
        config.market,
        config.product_mint,
        config.backing_vault,
        config.reserve_vault,
        config.adapter_program,
        config.adapter_market,
        config.primary_oracle,
        config.secondary_oracle,
    ];
    if addresses.contains(&zero) {
        return Err(Error::InvalidConfiguration);
    }
    let mut outer = 0_usize;
    while outer < addresses.len() {
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

pub fn validate_isolation(long: &MarketConfig, short: &MarketConfig) -> Result<()> {
    if long.side != Side::Long || short.side != Side::Short {
        return Err(Error::NotIsolated);
    }
    let long_accounts = [
        long.market,
        long.product_mint,
        long.backing_vault,
        long.reserve_vault,
        long.adapter_market,
    ];
    let short_accounts = [
        short.market,
        short.product_mint,
        short.backing_vault,
        short.reserve_vault,
        short.adapter_market,
    ];
    for left in long_accounts {
        if short_accounts.contains(&left) {
            return Err(Error::NotIsolated);
        }
    }
    Ok(())
}

pub fn preflight_open(
    config: &MarketConfig,
    context: &OpenContext,
    computed_shares: u64,
) -> Result<u64> {
    validate_market(config)?;
    if context.capital == 0 || computed_shares < context.minimum_shares_out {
        return Err(Error::SlippageExceeded);
    }
    if context.current_slot > context.quote_expiry_slot {
        return Err(Error::QuoteExpired);
    }
    let wallet_after = context
        .wallet_open_capital
        .checked_add(context.capital)
        .ok_or(Error::ArithmeticOverflow)?;
    let tvl_after = context
        .market_tvl
        .checked_add(context.capital)
        .ok_or(Error::ArithmeticOverflow)?;
    let daily_after = context
        .daily_minted
        .checked_add(context.capital)
        .ok_or(Error::ArithmeticOverflow)?;
    if context.capital > config.transaction_cap
        || wallet_after > config.wallet_cap
        || tvl_after > config.tvl_cap
        || daily_after > config.daily_mint_cap
        || context.capital > context.available_backing_capital
    {
        return Err(Error::CapExceeded);
    }
    context
        .capital
        .checked_add(entry_fee(context.capital, config.fee_bps)?)
        .ok_or(Error::ArithmeticOverflow)
}

pub fn oracle_agrees(
    primary: OracleObservation,
    secondary: OracleObservation,
    max_age_seconds: u32,
    max_confidence_bps: u16,
    max_deviation_bps: u16,
    minimum_publishers: u8,
) -> Result<()> {
    if primary.price == 0
        || secondary.price == 0
        || primary.age_seconds > max_age_seconds
        || secondary.age_seconds > max_age_seconds
        || primary.confidence_bps > max_confidence_bps
        || secondary.confidence_bps > max_confidence_bps
        || primary.publishers < minimum_publishers
        || secondary.publishers < minimum_publishers
    {
        return Err(Error::InvalidOracle);
    }
    let lower = primary.price.min(secondary.price);
    let difference = primary.price.abs_diff(secondary.price);
    if mul_div_floor(difference, BPS, lower)? > u64::from(max_deviation_bps) {
        return Err(Error::InvalidOracle);
    }
    Ok(())
}

pub fn settle_interval(current: VaultState, move_bps: i32) -> Result<Settlement> {
    if current.mode != VaultMode::Active {
        return Ok(Settlement {
            state: current,
            pnl: 0,
            reserve_draw: 0,
            uncovered_deficit: 0,
        });
    }
    if !(-10_000..=10_000).contains(&move_bps) {
        return Err(Error::InvalidAmount);
    }
    let direction = if current.side == Side::Long {
        1_i128
    } else {
        -1_i128
    };
    let pnl = i128::from(current.exposure)
        .checked_mul(i128::from(move_bps))
        .ok_or(Error::ArithmeticOverflow)?
        .checked_mul(direction)
        .ok_or(Error::ArithmeticOverflow)?
        .checked_div(i128::from(BPS))
        .ok_or(Error::DivisionByZero)?;
    let raw_nav = i128::from(current.nav)
        .checked_add(pnl)
        .ok_or(Error::ArithmeticOverflow)?;
    let floor = mul_div_ceil(current.reference_nav, u64::from(current.standby_bps), BPS)?;
    let required = if raw_nav < i128::from(floor) {
        u64::try_from(
            i128::from(floor)
                .checked_sub(raw_nav)
                .ok_or(Error::ArithmeticOverflow)?,
        )
        .map_err(|_| Error::ArithmeticOverflow)?
    } else {
        0
    };
    let reserve_draw = required.min(current.reserve);
    let covered_nav = raw_nav
        .checked_add(i128::from(reserve_draw))
        .ok_or(Error::ArithmeticOverflow)?;
    let uncovered_deficit = if covered_nav < i128::from(floor) {
        u64::try_from(
            i128::from(floor)
                .checked_sub(covered_nav)
                .ok_or(Error::ArithmeticOverflow)?,
        )
        .map_err(|_| Error::ArithmeticOverflow)?
    } else {
        0
    };
    let nav = if covered_nav <= 0 {
        0
    } else {
        u64::try_from(covered_nav).map_err(|_| Error::ArithmeticOverflow)?
    };
    let mode = if nav < floor {
        VaultMode::Insolvent
    } else if raw_nav <= i128::from(floor) {
        VaultMode::Standby
    } else {
        VaultMode::Active
    };
    let exposure = if mode == VaultMode::Active {
        mul_div_floor(nav, u64::from(current.leverage_bps), BPS)?
    } else {
        0
    };
    Ok(Settlement {
        state: VaultState {
            mode,
            nav,
            exposure,
            reserve: current
                .reserve
                .checked_sub(reserve_draw)
                .ok_or(Error::ArithmeticOverflow)?,
            epoch: current
                .epoch
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?,
            ..current
        },
        pnl,
        reserve_draw,
        uncovered_deficit,
    })
}

pub fn resume_from_standby(current: VaultState, recapitalization: u64) -> Result<VaultState> {
    if current.mode != VaultMode::Standby || recapitalization == 0 {
        return Err(Error::InvalidState);
    }
    let nav = current
        .nav
        .checked_add(recapitalization)
        .ok_or(Error::ArithmeticOverflow)?;
    Ok(VaultState {
        mode: VaultMode::Active,
        nav,
        reference_nav: nav,
        exposure: mul_div_floor(nav, u64::from(current.leverage_bps), BPS)?,
        epoch: current
            .epoch
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?,
        ..current
    })
}

pub fn capacity_allows_mint(
    active_exposure: u64,
    requested_exposure: u64,
    primary_capacity: u64,
    unwind_capacity: u64,
) -> Result<bool> {
    Ok(active_exposure
        .checked_add(requested_exposure)
        .ok_or(Error::ArithmeticOverflow)?
        <= primary_capacity
        && active_exposure <= unwind_capacity)
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn market(side: Side, offset: u8) -> MarketConfig {
        MarketConfig {
            side,
            leverage_bps: PILOT_LEVERAGE_BPS,
            fee_bps: ENTRY_FEE_BPS,
            standby_bps: 100,
            transaction_cap: 100_000_000,
            wallet_cap: 100_000_000,
            tvl_cap: 1_000_000_000,
            daily_mint_cap: 1_000_000_000,
            daily_redeem_cap: 1_000_000_000,
            market: address(offset),
            product_mint: address(offset.saturating_add(1)),
            backing_vault: address(offset.saturating_add(2)),
            reserve_vault: address(offset.saturating_add(3)),
            adapter_program: address(offset.saturating_add(4)),
            adapter_market: address(offset.saturating_add(5)),
            primary_oracle: address(offset.saturating_add(6)),
            secondary_oracle: address(offset.saturating_add(7)),
        }
    }

    fn vault(side: Side, reserve: u64) -> VaultState {
        VaultState {
            mode: VaultMode::Active,
            side,
            leverage_bps: PILOT_LEVERAGE_BPS,
            nav: 100_000_000,
            reference_nav: 100_000_000,
            exposure: 200_000_000,
            reserve,
            standby_bps: 100,
            epoch: 0,
        }
    }

    #[test]
    fn fee_is_half_percent_on_top() {
        assert_eq!(entry_fee(500_000_000, 50), Ok(2_500_000));
        assert_eq!(entry_fee(1, 51), Err(Error::InvalidAmount));
    }

    #[test]
    fn share_rounding_never_overissues_or_overpays() {
        assert_eq!(shares_on_open(10, 3, 7), Ok(4));
        assert_eq!(assets_on_close(2, 3, 7), Ok(4));
        assert_eq!(shares_on_open(10, 0, 1), Err(Error::InvalidState));
    }

    #[test]
    fn configuration_and_market_isolation_are_strict() {
        let long = market(Side::Long, 1);
        let short = market(Side::Short, 20);
        assert_eq!(validate_market(&long), Ok(()));
        assert_eq!(validate_isolation(&long, &short), Ok(()));
        let mut aliased = short;
        aliased.reserve_vault = long.reserve_vault;
        assert_eq!(validate_isolation(&long, &aliased), Err(Error::NotIsolated));
    }

    #[test]
    fn duplicate_or_zero_critical_accounts_fail() {
        let mut config = market(Side::Long, 1);
        config.secondary_oracle = config.primary_oracle;
        assert_eq!(validate_market(&config), Err(Error::InvalidConfiguration));
        config.secondary_oracle = [0; 32];
        assert_eq!(validate_market(&config), Err(Error::InvalidConfiguration));
    }

    #[test]
    fn open_checks_expiry_slippage_caps_and_backing() {
        let config = market(Side::Long, 1);
        let good = OpenContext {
            capital: 50_000_000,
            minimum_shares_out: 49_000_000,
            current_slot: 10,
            quote_expiry_slot: 11,
            wallet_open_capital: 0,
            market_tvl: 0,
            daily_minted: 0,
            available_backing_capital: 50_000_000,
        };
        assert_eq!(preflight_open(&config, &good, 50_000_000), Ok(50_250_000));
        assert_eq!(
            preflight_open(
                &config,
                &OpenContext {
                    current_slot: 12,
                    ..good
                },
                50_000_000,
            ),
            Err(Error::QuoteExpired)
        );
        assert_eq!(
            preflight_open(
                &config,
                &OpenContext {
                    available_backing_capital: 49_999_999,
                    ..good
                },
                50_000_000,
            ),
            Err(Error::CapExceeded)
        );
        assert_eq!(
            preflight_open(&config, &good, 48_999_999),
            Err(Error::SlippageExceeded)
        );
    }

    #[test]
    fn oracle_requires_two_fresh_agreeing_sources() {
        let first = OracleObservation {
            price: 10_000,
            age_seconds: 5,
            confidence_bps: 20,
            publishers: 5,
        };
        let second = OracleObservation {
            price: 10_050,
            age_seconds: 8,
            confidence_bps: 30,
            publishers: 5,
        };
        assert_eq!(oracle_agrees(first, second, 30, 100, 100, 3), Ok(()));
        assert_eq!(
            oracle_agrees(
                first,
                OracleObservation {
                    price: 10_500,
                    ..second
                },
                30,
                100,
                100,
                3,
            ),
            Err(Error::InvalidOracle)
        );
        assert_eq!(
            oracle_agrees(
                first,
                OracleObservation {
                    age_seconds: 31,
                    ..second
                },
                30,
                100,
                100,
                3,
            ),
            Err(Error::InvalidOracle)
        );
    }

    #[test]
    fn funded_floor_enters_zero_exposure_standby() {
        let settled =
            settle_interval(vault(Side::Long, 1_000_000), -5_000).expect("valid settlement");
        assert_eq!(settled.state.mode, VaultMode::Standby);
        assert_eq!(settled.state.nav, 1_000_000);
        assert_eq!(settled.state.exposure, 0);
        assert_eq!(settled.reserve_draw, 1_000_000);
    }

    #[test]
    fn unfunded_floor_is_explicitly_insolvent() {
        let settled = settle_interval(vault(Side::Long, 0), -5_000).expect("valid settlement");
        assert_eq!(settled.state.mode, VaultMode::Insolvent);
        assert_eq!(settled.state.nav, 0);
        assert_eq!(settled.uncovered_deficit, 1_000_000);
    }

    #[test]
    fn standby_cannot_recover_from_price_only() {
        let standby = settle_interval(vault(Side::Long, 1_000_000), -5_000)
            .expect("valid settlement")
            .state;
        assert_eq!(
            settle_interval(standby, 5_000)
                .expect("frozen settlement")
                .state,
            standby
        );
        let resumed = resume_from_standby(standby, 2_000_000).expect("funded resume");
        assert_eq!(resumed.nav, 3_000_000);
        assert_eq!(resumed.exposure, 6_000_000);
    }

    #[test]
    fn capacity_stops_mints_before_exits() {
        for active in 0..=255 {
            let allowed = capacity_allows_mint(active, 17, 200, 151).expect("bounded addition");
            assert_eq!(allowed, active.saturating_add(17) <= 200 && active <= 151);
        }
    }

    #[test]
    fn adversarial_settlements_never_create_negative_balances() {
        for side in [Side::Long, Side::Short] {
            for movement in (-10_000..=10_000).step_by(137) {
                let result =
                    settle_interval(vault(side, 25_000_000), movement).expect("bounded settlement");
                assert!(result.reserve_draw <= 25_000_000);
                if result.state.mode != VaultMode::Active {
                    assert_eq!(result.state.exposure, 0);
                }
            }
        }
    }
}
