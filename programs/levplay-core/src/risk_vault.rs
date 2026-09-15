//! Deterministic economic core for LevPlay's Solana-native clearing vault.
//!
//! The vault matches AAPL2L/AAPL2S exposure first and admits only the residual
//! exposure that is covered by segregated, non-recallable maker collateral.
//! This module intentionally performs no CPI. A later SBF wrapper must bind its
//! inputs to fixed PDAs, token accounts and audited adapters.

use crate::{
    mul_div_ceil, mul_div_floor, Address, Error, Result, Settlement, Side, VaultMode, VaultState,
    BPS, PILOT_LEVERAGE_BPS,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum RiskVenueMode {
    Locked = 0,
    Active = 1,
    Paused = 2,
    WindDown = 3,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RiskVaultConfig {
    pub collateral_mint: Address,
    pub clearing_vault: Address,
    pub long_market: Address,
    pub short_market: Address,
    pub long_reserve_vault: Address,
    pub short_reserve_vault: Address,
    pub long_maker_vault: Address,
    pub short_maker_vault: Address,
    pub maker_a: Address,
    pub maker_b: Address,
    pub leverage_bps: u16,
    pub floor_bps: u16,
    pub aggregate_capital_cap: u64,
    pub side_capital_cap: u64,
    pub maximum_up_move_bps: u16,
    pub maximum_down_move_bps: u16,
    pub unwind_bps: u16,
    pub minimum_reserve_per_side: u64,
    pub minimum_maker_commitment: u64,
    pub minimum_commitment_slots: u64,
    pub commitment_expiry_slot: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RiskVaultState {
    pub mode: RiskVenueMode,
    pub long_capital: u64,
    pub short_capital: u64,
    pub long_reserve: u64,
    pub short_reserve: u64,
    pub long_maker_funding: u64,
    pub short_maker_loss_collateral: u64,
    pub long_unwind_capacity: u64,
    pub short_unwind_capacity: u64,
    pub queued_claim_liability: u64,
    pub epoch: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CapacityQuote {
    pub long_capital_after: u64,
    pub short_capital_after: u64,
    pub matched_exposure: u64,
    pub unmatched_long_exposure: u64,
    pub unmatched_short_exposure: u64,
    pub required_long_maker_funding: u64,
    pub required_short_loss_collateral: u64,
    pub required_long_reserve: u64,
    pub required_short_reserve: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CloseQuote {
    pub long_capital_after: u64,
    pub short_capital_after: u64,
    pub matched_exposure: u64,
    pub unmatched_long_exposure: u64,
    pub unmatched_short_exposure: u64,
    pub remaining_long_maker_funding: u64,
    pub remaining_short_loss_collateral: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ClaimQueueState {
    pub next_sequence: u64,
    pub next_payable_sequence: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct QueuedClaim {
    pub sequence: u64,
    pub owner: Address,
    pub original_amount: u64,
    pub remaining_amount: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PairSettlement {
    pub long: Settlement,
    pub short: Settlement,
    pub expected_external_pnl: i128,
    pub reported_external_pnl: i128,
}

fn addresses_are_unique_and_nonzero(addresses: &[Address]) -> bool {
    let zero = [0_u8; 32];
    let mut outer = 0_usize;
    while outer < addresses.len() {
        if addresses[outer] == zero {
            return false;
        }
        let mut inner = match outer.checked_add(1) {
            Some(value) => value,
            None => return false,
        };
        while inner < addresses.len() {
            if addresses[outer] == addresses[inner] {
                return false;
            }
            inner = match inner.checked_add(1) {
                Some(value) => value,
                None => return false,
            };
        }
        outer = match outer.checked_add(1) {
            Some(value) => value,
            None => return false,
        };
    }
    true
}

pub fn validate_risk_vault_config(config: &RiskVaultConfig) -> Result<()> {
    let addresses = [
        config.collateral_mint,
        config.clearing_vault,
        config.long_market,
        config.short_market,
        config.long_reserve_vault,
        config.short_reserve_vault,
        config.long_maker_vault,
        config.short_maker_vault,
        config.maker_a,
        config.maker_b,
    ];
    if !addresses_are_unique_and_nonzero(&addresses)
        || config.leverage_bps != PILOT_LEVERAGE_BPS
        || !(1..=500).contains(&config.floor_bps)
        || config.aggregate_capital_cap == 0
        || config.side_capital_cap == 0
        || config.side_capital_cap > config.aggregate_capital_cap
        || config.maximum_up_move_bps == 0
        || config.maximum_up_move_bps > 10_000
        || config.maximum_down_move_bps != 10_000
        || config.unwind_bps > 1_000
        || config.minimum_reserve_per_side == 0
        || config.minimum_maker_commitment == 0
        || config.minimum_commitment_slots == 0
    {
        return Err(Error::InvalidConfiguration);
    }
    Ok(())
}

fn exposure(capital: u64, leverage_bps: u16) -> Result<u64> {
    mul_div_ceil(capital, u64::from(leverage_bps), BPS)
}

fn reserve_requirement(config: &RiskVaultConfig, capital: u64) -> Result<u64> {
    let floor = mul_div_ceil(capital, u64::from(config.floor_bps), BPS)?;
    let unwind = mul_div_ceil(
        exposure(capital, config.leverage_bps)?,
        u64::from(config.unwind_bps),
        BPS,
    )?;
    let variable = floor.checked_add(unwind).ok_or(Error::ArithmeticOverflow)?;
    Ok(variable.max(config.minimum_reserve_per_side))
}

fn capacity_quote_for_totals(
    config: &RiskVaultConfig,
    long_capital_after: u64,
    short_capital_after: u64,
) -> Result<CapacityQuote> {
    let aggregate = long_capital_after
        .checked_add(short_capital_after)
        .ok_or(Error::ArithmeticOverflow)?;
    if long_capital_after > config.side_capital_cap
        || short_capital_after > config.side_capital_cap
        || aggregate > config.aggregate_capital_cap
    {
        return Err(Error::CapExceeded);
    }

    let long_exposure = exposure(long_capital_after, config.leverage_bps)?;
    let short_exposure = exposure(short_capital_after, config.leverage_bps)?;
    let matched_exposure = long_exposure.min(short_exposure);
    let unmatched_long_exposure = long_exposure
        .checked_sub(matched_exposure)
        .ok_or(Error::ArithmeticOverflow)?;
    let unmatched_short_exposure = short_exposure
        .checked_sub(matched_exposure)
        .ok_or(Error::ArithmeticOverflow)?;
    let additional_leverage_bps = u64::from(config.leverage_bps)
        .checked_sub(BPS)
        .ok_or(Error::InvalidConfiguration)?;
    let required_long_maker_funding = mul_div_ceil(
        long_exposure,
        additional_leverage_bps,
        u64::from(config.leverage_bps),
    )?;
    let required_short_loss_collateral =
        mul_div_ceil(short_exposure, u64::from(config.maximum_down_move_bps), BPS)?;

    Ok(CapacityQuote {
        long_capital_after,
        short_capital_after,
        matched_exposure,
        unmatched_long_exposure,
        unmatched_short_exposure,
        required_long_maker_funding,
        required_short_loss_collateral,
        required_long_reserve: reserve_requirement(config, long_capital_after)?,
        required_short_reserve: reserve_requirement(config, short_capital_after)?,
    })
}

pub fn quote_pair_open(
    config: &RiskVaultConfig,
    state: &RiskVaultState,
    long_capital_delta: u64,
    short_capital_delta: u64,
    current_slot: u64,
) -> Result<CapacityQuote> {
    validate_risk_vault_config(config)?;
    if state.mode != RiskVenueMode::Active || (long_capital_delta == 0 && short_capital_delta == 0)
    {
        return Err(Error::InvalidState);
    }
    if current_slot > config.commitment_expiry_slot {
        return Err(Error::QuoteExpired);
    }
    let long_capital_after = state
        .long_capital
        .checked_add(long_capital_delta)
        .ok_or(Error::ArithmeticOverflow)?;
    let short_capital_after = state
        .short_capital
        .checked_add(short_capital_delta)
        .ok_or(Error::ArithmeticOverflow)?;
    capacity_quote_for_totals(config, long_capital_after, short_capital_after)
}

pub fn quote_open(
    config: &RiskVaultConfig,
    state: &RiskVaultState,
    side: Side,
    capital: u64,
    current_slot: u64,
) -> Result<CapacityQuote> {
    match side {
        Side::Long => quote_pair_open(config, state, capital, 0, current_slot),
        Side::Short => quote_pair_open(config, state, 0, capital, current_slot),
    }
}

fn quote_is_funded(state: &RiskVaultState, quote: &CapacityQuote) -> bool {
    state.long_maker_funding >= quote.required_long_maker_funding
        && state.short_maker_loss_collateral >= quote.required_short_loss_collateral
        && state.long_reserve >= quote.required_long_reserve
        && state.short_reserve >= quote.required_short_reserve
        && state.long_unwind_capacity
            >= quote
                .matched_exposure
                .checked_add(quote.unmatched_long_exposure)
                .unwrap_or(u64::MAX)
        && state.short_unwind_capacity
            >= quote
                .matched_exposure
                .checked_add(quote.unmatched_short_exposure)
                .unwrap_or(u64::MAX)
}

pub fn admit_risk_vault(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    current_slot: u64,
) -> Result<RiskVaultState> {
    validate_risk_vault_config(config)?;
    if state.mode != RiskVenueMode::Locked {
        return Err(Error::InvalidState);
    }
    let minimum_expiry = current_slot
        .checked_add(config.minimum_commitment_slots)
        .ok_or(Error::ArithmeticOverflow)?;
    if config.commitment_expiry_slot < minimum_expiry
        || state.long_reserve < config.minimum_reserve_per_side
        || state.short_reserve < config.minimum_reserve_per_side
        || state.long_maker_funding < config.minimum_maker_commitment
        || state.short_maker_loss_collateral < config.minimum_maker_commitment
    {
        return Err(Error::CapExceeded);
    }
    Ok(RiskVaultState {
        mode: RiskVenueMode::Active,
        ..state
    })
}

pub fn apply_pair_open(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    long_capital_delta: u64,
    short_capital_delta: u64,
    current_slot: u64,
) -> Result<RiskVaultState> {
    let quote = quote_pair_open(
        config,
        &state,
        long_capital_delta,
        short_capital_delta,
        current_slot,
    )?;
    if !quote_is_funded(&state, &quote) {
        return Err(Error::CapExceeded);
    }
    Ok(RiskVaultState {
        long_capital: quote.long_capital_after,
        short_capital: quote.short_capital_after,
        ..state
    })
}

pub fn apply_open(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    side: Side,
    capital: u64,
    current_slot: u64,
) -> Result<RiskVaultState> {
    match side {
        Side::Long => apply_pair_open(config, state, capital, 0, current_slot),
        Side::Short => apply_pair_open(config, state, 0, capital, current_slot),
    }
}

pub fn quote_pair_close(
    config: &RiskVaultConfig,
    state: &RiskVaultState,
    long_capital_delta: u64,
    short_capital_delta: u64,
) -> Result<CloseQuote> {
    validate_risk_vault_config(config)?;
    if state.mode == RiskVenueMode::Locked
        || (long_capital_delta == 0 && short_capital_delta == 0)
        || long_capital_delta > state.long_capital
        || short_capital_delta > state.short_capital
    {
        return Err(Error::InvalidState);
    }
    let long_capital_after = state
        .long_capital
        .checked_sub(long_capital_delta)
        .ok_or(Error::ArithmeticOverflow)?;
    let short_capital_after = state
        .short_capital
        .checked_sub(short_capital_delta)
        .ok_or(Error::ArithmeticOverflow)?;
    let remaining = capacity_quote_for_totals(config, long_capital_after, short_capital_after)?;
    Ok(CloseQuote {
        long_capital_after,
        short_capital_after,
        matched_exposure: remaining.matched_exposure,
        unmatched_long_exposure: remaining.unmatched_long_exposure,
        unmatched_short_exposure: remaining.unmatched_short_exposure,
        remaining_long_maker_funding: remaining.required_long_maker_funding,
        remaining_short_loss_collateral: remaining.required_short_loss_collateral,
    })
}

pub fn apply_pair_close(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    long_capital_delta: u64,
    short_capital_delta: u64,
) -> Result<RiskVaultState> {
    let quote = quote_pair_close(config, &state, long_capital_delta, short_capital_delta)?;
    Ok(RiskVaultState {
        long_capital: quote.long_capital_after,
        short_capital: quote.short_capital_after,
        epoch: state
            .epoch
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?,
        ..state
    })
}

pub fn apply_close(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    side: Side,
    capital: u64,
) -> Result<RiskVaultState> {
    match side {
        Side::Long => apply_pair_close(config, state, capital, 0),
        Side::Short => apply_pair_close(config, state, 0, capital),
    }
}

fn apply_pair_queued_close_total(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    long_capital_delta: u64,
    short_capital_delta: u64,
    claim_liability: u64,
) -> Result<RiskVaultState> {
    if claim_liability == 0 {
        return Err(Error::InvalidAmount);
    }
    let closed = apply_pair_close(config, state, long_capital_delta, short_capital_delta)?;
    Ok(RiskVaultState {
        queued_claim_liability: closed
            .queued_claim_liability
            .checked_add(claim_liability)
            .ok_or(Error::ArithmeticOverflow)?,
        ..closed
    })
}

fn settle_queued_claim_total(
    state: RiskVaultState,
    paid_liability: u64,
) -> Result<RiskVaultState> {
    if paid_liability == 0 || paid_liability > state.queued_claim_liability {
        return Err(Error::InvalidAmount);
    }
    Ok(RiskVaultState {
        queued_claim_liability: state
            .queued_claim_liability
            .checked_sub(paid_liability)
            .ok_or(Error::ArithmeticOverflow)?,
        epoch: state
            .epoch
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?,
        ..state
    })
}

fn enqueue_claim(
    queue: ClaimQueueState,
    owner: Address,
    amount: u64,
) -> Result<(ClaimQueueState, QueuedClaim)> {
    if owner == [0_u8; 32] || amount == 0 {
        return Err(Error::InvalidAmount);
    }
    let claim = QueuedClaim {
        sequence: queue.next_sequence,
        owner,
        original_amount: amount,
        remaining_amount: amount,
    };
    Ok((
        ClaimQueueState {
            next_sequence: queue
                .next_sequence
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?,
            ..queue
        },
        claim,
    ))
}

pub fn apply_pair_queued_close(
    config: &RiskVaultConfig,
    state: RiskVaultState,
    queue: ClaimQueueState,
    owner: Address,
    long_capital_delta: u64,
    short_capital_delta: u64,
    claim_liability: u64,
) -> Result<(RiskVaultState, ClaimQueueState, QueuedClaim)> {
    let closed = apply_pair_queued_close_total(
        config,
        state,
        long_capital_delta,
        short_capital_delta,
        claim_liability,
    )?;
    let (queue_after, claim) = enqueue_claim(queue, owner, claim_liability)?;
    Ok((closed, queue_after, claim))
}

pub fn settle_fifo_claim(
    state: RiskVaultState,
    queue: ClaimQueueState,
    claim: QueuedClaim,
    paid_liability: u64,
) -> Result<(RiskVaultState, ClaimQueueState, QueuedClaim)> {
    if claim.sequence != queue.next_payable_sequence
        || paid_liability == 0
        || paid_liability > claim.remaining_amount
    {
        return Err(Error::InvalidState);
    }
    let state_after = settle_queued_claim_total(state, paid_liability)?;
    let remaining_amount = claim
        .remaining_amount
        .checked_sub(paid_liability)
        .ok_or(Error::ArithmeticOverflow)?;
    let queue_after = if remaining_amount == 0 {
        ClaimQueueState {
            next_payable_sequence: queue
                .next_payable_sequence
                .checked_add(1)
                .ok_or(Error::ArithmeticOverflow)?,
            ..queue
        }
    } else {
        queue
    };
    Ok((
        state_after,
        queue_after,
        QueuedClaim {
            remaining_amount,
            ..claim
        },
    ))
}

pub fn begin_wind_down(state: RiskVaultState) -> Result<RiskVaultState> {
    if state.mode == RiskVenueMode::Locked || state.mode == RiskVenueMode::WindDown {
        return Err(Error::InvalidState);
    }
    Ok(RiskVaultState {
        mode: RiskVenueMode::WindDown,
        epoch: state
            .epoch
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?,
        ..state
    })
}

pub fn maker_escrow_releasable(state: &RiskVaultState) -> bool {
    state.mode == RiskVenueMode::WindDown
        && state.long_capital == 0
        && state.short_capital == 0
        && state.queued_claim_liability == 0
}

fn signed_abs(value: i128) -> Result<u128> {
    let absolute = value.checked_abs().ok_or(Error::ArithmeticOverflow)?;
    u128::try_from(absolute).map_err(|_| Error::ArithmeticOverflow)
}

pub fn reconcile_pair_settlement(
    config: &RiskVaultConfig,
    long: VaultState,
    short: VaultState,
    move_bps: i32,
    reported_external_pnl: i128,
    maximum_reconciliation_error: u64,
) -> Result<PairSettlement> {
    validate_risk_vault_config(config)?;
    if long.side != Side::Long || short.side != Side::Short {
        return Err(Error::NotIsolated);
    }
    if move_bps < -10_000 {
        return Err(Error::InvalidOracle);
    }
    let long_result = settle_nonrecourse_interval(long, move_bps)?;
    let short_result = settle_nonrecourse_interval(short, move_bps)?;
    let expected_external_pnl = long_result
        .pnl
        .checked_add(short_result.pnl)
        .ok_or(Error::ArithmeticOverflow)?;
    let difference = expected_external_pnl
        .checked_sub(reported_external_pnl)
        .ok_or(Error::ArithmeticOverflow)?;
    if signed_abs(difference)? > u128::from(maximum_reconciliation_error) {
        return Err(Error::SlippageExceeded);
    }
    Ok(PairSettlement {
        long: long_result,
        short: short_result,
        expected_external_pnl,
        reported_external_pnl,
    })
}

fn settle_nonrecourse_interval(current: VaultState, move_bps: i32) -> Result<Settlement> {
    if current.mode != VaultMode::Active {
        return Ok(Settlement {
            state: current,
            pnl: 0,
            reserve_draw: 0,
            uncovered_deficit: 0,
        });
    }
    if move_bps < -10_000 {
        return Err(Error::InvalidOracle);
    }
    let direction = if current.side == Side::Long {
        1_i128
    } else {
        -1_i128
    };
    let raw_pnl = i128::from(current.exposure)
        .checked_mul(i128::from(move_bps))
        .ok_or(Error::ArithmeticOverflow)?
        .checked_mul(direction)
        .ok_or(Error::ArithmeticOverflow)?
        .checked_div(i128::from(BPS))
        .ok_or(Error::DivisionByZero)?;
    let raw_nav = i128::from(current.nav)
        .checked_add(raw_pnl)
        .ok_or(Error::ArithmeticOverflow)?;

    // Non-recourse settlement clips the holder claim at zero. The counterparty
    // cannot collect a negative balance after the holder's capital is exhausted.
    let holder_claim = if raw_nav <= 0 {
        0
    } else {
        u64::try_from(raw_nav).map_err(|_| Error::ArithmeticOverflow)?
    };
    let floor = mul_div_ceil(current.reference_nav, u64::from(current.standby_bps), BPS)?;
    let required_floor_reserve = floor.saturating_sub(holder_claim);
    let reserve_draw = required_floor_reserve.min(current.reserve);
    let nav = holder_claim
        .checked_add(reserve_draw)
        .ok_or(Error::ArithmeticOverflow)?;
    let uncovered_deficit = floor.saturating_sub(nav);
    let mode = if uncovered_deficit > 0 {
        VaultMode::Insolvent
    } else if holder_claim <= floor {
        VaultMode::Standby
    } else {
        VaultMode::Active
    };
    let exposure = if mode == VaultMode::Active {
        mul_div_floor(nav, u64::from(current.leverage_bps), BPS)?
    } else {
        0
    };
    let effective_pnl = i128::from(holder_claim)
        .checked_sub(i128::from(current.nav))
        .ok_or(Error::ArithmeticOverflow)?;
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
        pnl: effective_pnl,
        reserve_draw,
        uncovered_deficit,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn config() -> RiskVaultConfig {
        RiskVaultConfig {
            collateral_mint: address(1),
            clearing_vault: address(2),
            long_market: address(3),
            short_market: address(4),
            long_reserve_vault: address(5),
            short_reserve_vault: address(6),
            long_maker_vault: address(7),
            short_maker_vault: address(8),
            maker_a: address(9),
            maker_b: address(10),
            leverage_bps: PILOT_LEVERAGE_BPS,
            floor_bps: 100,
            aggregate_capital_cap: 1_000_000_000,
            side_capital_cap: 1_000_000_000,
            maximum_up_move_bps: 5_000,
            maximum_down_move_bps: 10_000,
            unwind_bps: 100,
            minimum_reserve_per_side: 2_000_000,
            minimum_maker_commitment: 100_000_000,
            minimum_commitment_slots: 100,
            commitment_expiry_slot: 1_000,
        }
    }

    fn locked() -> RiskVaultState {
        RiskVaultState {
            mode: RiskVenueMode::Locked,
            long_capital: 0,
            short_capital: 0,
            long_reserve: 20_000_000,
            short_reserve: 20_000_000,
            long_maker_funding: 500_000_000,
            short_maker_loss_collateral: 500_000_000,
            long_unwind_capacity: 2_000_000_000,
            short_unwind_capacity: 2_000_000_000,
            queued_claim_liability: 0,
            epoch: 0,
        }
    }

    fn active() -> RiskVaultState {
        admit_risk_vault(&config(), locked(), 100).expect("funded admission")
    }

    fn position(side: Side, capital: u64) -> VaultState {
        let reserve = capital.checked_div(100).unwrap_or_default();
        VaultState {
            mode: crate::VaultMode::Active,
            side,
            leverage_bps: PILOT_LEVERAGE_BPS,
            nav: capital,
            reference_nav: capital,
            exposure: capital.saturating_mul(2),
            reserve,
            standby_bps: 100,
            epoch: 0,
        }
    }

    #[test]
    fn rejects_aliased_accounts_and_single_maker() {
        let mut candidate = config();
        candidate.maker_b = candidate.maker_a;
        assert_eq!(
            validate_risk_vault_config(&candidate),
            Err(Error::InvalidConfiguration)
        );
    }

    #[test]
    fn admission_requires_funded_reserves_makers_and_horizon() {
        assert_eq!(
            admit_risk_vault(&config(), locked(), 100).map(|value| value.mode),
            Ok(RiskVenueMode::Active)
        );
        let mut unfunded = locked();
        unfunded.short_maker_loss_collateral = 0;
        assert_eq!(
            admit_risk_vault(&config(), unfunded, 100),
            Err(Error::CapExceeded)
        );
        assert_eq!(
            admit_risk_vault(&config(), locked(), 901),
            Err(Error::CapExceeded)
        );
    }

    #[test]
    fn equal_pair_has_no_active_residual_but_retains_exit_escrow() {
        let quote = quote_pair_open(&config(), &active(), 100_000_000, 100_000_000, 200)
            .expect("paired quote");
        assert_eq!(quote.matched_exposure, 200_000_000);
        assert_eq!(quote.unmatched_long_exposure, 0);
        assert_eq!(quote.unmatched_short_exposure, 0);
        assert_eq!(quote.required_long_maker_funding, 100_000_000);
        assert_eq!(quote.required_short_loss_collateral, 200_000_000);
    }

    #[test]
    fn unmatched_long_needs_prepaid_extra_funding() {
        let quote =
            quote_open(&config(), &active(), Side::Long, 100_000_000, 200).expect("long quote");
        assert_eq!(quote.unmatched_long_exposure, 200_000_000);
        assert_eq!(quote.required_long_maker_funding, 100_000_000);
    }

    #[test]
    fn unmatched_short_needs_bounded_loss_collateral() {
        let quote =
            quote_open(&config(), &active(), Side::Short, 100_000_000, 200).expect("short quote");
        assert_eq!(quote.unmatched_short_exposure, 200_000_000);
        assert_eq!(quote.required_short_loss_collateral, 200_000_000);
    }

    #[test]
    fn mint_fails_before_using_unfunded_capacity() {
        let mut state = active();
        state.short_maker_loss_collateral = 99_999_999;
        assert_eq!(
            apply_open(&config(), state, Side::Short, 100_000_000, 200),
            Err(Error::CapExceeded)
        );
    }

    #[test]
    fn expired_commitment_stops_new_mints() {
        assert_eq!(
            quote_open(&config(), &active(), Side::Long, 1, 1_001),
            Err(Error::QuoteExpired)
        );
    }

    #[test]
    fn aggregate_cap_is_enforced() {
        let mut state = active();
        state.long_capital = 600_000_000;
        state.short_capital = 400_000_000;
        assert_eq!(
            apply_open(&config(), state, Side::Long, 1, 200),
            Err(Error::CapExceeded)
        );
    }

    #[test]
    fn settlement_reconciles_balanced_pair_without_external_pnl() {
        let settled = reconcile_pair_settlement(
            &config(),
            position(Side::Long, 100_000_000),
            position(Side::Short, 100_000_000),
            1_000,
            0,
            0,
        )
        .expect("balanced pair");
        assert_eq!(settled.long.pnl, 20_000_000);
        assert_eq!(settled.short.pnl, -20_000_000);
        assert_eq!(settled.expected_external_pnl, 0);
    }

    #[test]
    fn settlement_rejects_unreconciled_external_delta() {
        assert_eq!(
            reconcile_pair_settlement(
                &config(),
                position(Side::Long, 100_000_000),
                position(Side::Short, 50_000_000),
                1_000,
                0,
                1
            ),
            Err(Error::SlippageExceeded)
        );
    }

    #[test]
    fn adverse_boundary_enters_funded_standby() {
        let settled = reconcile_pair_settlement(
            &config(),
            position(Side::Long, 100_000_000),
            position(Side::Short, 100_000_000),
            -5_000,
            0,
            0,
        )
        .expect("funded floor");
        assert_eq!(settled.long.state.mode, crate::VaultMode::Standby);
        assert_eq!(settled.long.state.exposure, 0);
    }

    #[test]
    fn price_jump_clips_short_loss_without_trapping_settlement() {
        let settled = reconcile_pair_settlement(
            &config(),
            position(Side::Long, 100_000_000),
            position(Side::Short, 100_000_000),
            15_000,
            200_000_000,
            0,
        )
        .expect("non-recourse gap settlement");
        assert_eq!(settled.short.pnl, -100_000_000);
        assert_eq!(settled.short.state.nav, 1_000_000);
        assert_eq!(settled.short.state.mode, crate::VaultMode::Standby);
        assert_eq!(settled.expected_external_pnl, 200_000_000);
    }

    #[test]
    fn impossible_negative_stock_price_is_rejected() {
        assert_eq!(
            reconcile_pair_settlement(
                &config(),
                position(Side::Long, 100_000_000),
                position(Side::Short, 100_000_000),
                -10_001,
                0,
                0
            ),
            Err(Error::InvalidOracle)
        );
    }

    #[test]
    fn exits_remain_available_after_commitment_expiry_and_pause() {
        let mut state = active();
        state.long_capital = 100_000_000;
        state.short_capital = 100_000_000;
        state.mode = RiskVenueMode::Paused;
        let after = apply_close(&config(), state, Side::Long, 25_000_000)
            .expect("pause must not block exits");
        assert_eq!(after.long_capital, 75_000_000);
        assert_eq!(after.short_capital, 100_000_000);
        assert_eq!(after.epoch, 1);
    }

    #[test]
    fn close_rejects_over_redemption_without_mutating_state() {
        let mut state = active();
        state.long_capital = 10;
        assert_eq!(
            apply_close(&config(), state, Side::Long, 11),
            Err(Error::InvalidState)
        );
    }

    #[test]
    fn asymmetric_exit_preserves_remaining_side_obligations() {
        let mut state = active();
        state.long_capital = 100_000_000;
        state.short_capital = 100_000_000;
        let quote = quote_pair_close(&config(), &state, 100_000_000, 0)
            .expect("long side can exit independently");
        assert_eq!(quote.matched_exposure, 0);
        assert_eq!(quote.unmatched_short_exposure, 200_000_000);
        assert_eq!(quote.remaining_short_loss_collateral, 200_000_000);
    }

    #[test]
    fn maker_escrow_stays_locked_until_orderly_wind_down_is_empty() {
        let mut state = active();
        state.long_capital = 1;
        assert!(!maker_escrow_releasable(&state));
        let winding = begin_wind_down(state).expect("wind-down transition");
        assert!(!maker_escrow_releasable(&winding));
        let empty = apply_close(&config(), winding, Side::Long, 1).expect("final exit");
        assert!(maker_escrow_releasable(&empty));
    }

    #[test]
    fn queued_exit_liability_blocks_maker_escrow_release_until_paid() {
        let mut state = active();
        state.long_capital = 100;
        let winding = begin_wind_down(state).expect("wind-down transition");
        let queue = ClaimQueueState {
            next_sequence: 0,
            next_payable_sequence: 0,
        };
        let (queued, queue, claim) =
            apply_pair_queued_close(&config(), winding, queue, address(11), 100, 0, 90)
                .expect("illiquid exit becomes a funded claim");
        assert_eq!(queued.long_capital, 0);
        assert_eq!(queued.queued_claim_liability, 90);
        assert_eq!(claim.sequence, 0);
        assert!(!maker_escrow_releasable(&queued));
        let (partially_paid, queue, claim) =
            settle_fifo_claim(queued, queue, claim, 50).expect("partial claim payment");
        assert_eq!(queue.next_payable_sequence, 0);
        assert!(!maker_escrow_releasable(&partially_paid));
        let (paid, queue, claim) =
            settle_fifo_claim(partially_paid, queue, claim, 40).expect("final claim payment");
        assert_eq!(claim.remaining_amount, 0);
        assert_eq!(queue.next_payable_sequence, 1);
        assert!(maker_escrow_releasable(&paid));
    }

    #[test]
    fn fifo_claims_cannot_be_skipped_or_overpaid() {
        let mut state = active();
        state.long_capital = 200;
        let winding = begin_wind_down(state).expect("wind-down transition");
        let queue = ClaimQueueState {
            next_sequence: 0,
            next_payable_sequence: 0,
        };
        let (state, queue, first) =
            apply_pair_queued_close(&config(), winding, queue, address(11), 100, 0, 90)
                .expect("first claim");
        let (state, queue, second) =
            apply_pair_queued_close(&config(), state, queue, address(12), 100, 0, 80)
                .expect("second claim");
        assert_eq!(
            settle_fifo_claim(state, queue, second, 80),
            Err(Error::InvalidState)
        );
        assert_eq!(
            settle_fifo_claim(state, queue, first, 91),
            Err(Error::InvalidState)
        );
        let (state, queue, first) =
            settle_fifo_claim(state, queue, first, 90).expect("first claim settles");
        assert_eq!(first.remaining_amount, 0);
        let (state, queue, second) =
            settle_fifo_claim(state, queue, second, 80).expect("second claim settles");
        assert_eq!(second.remaining_amount, 0);
        assert_eq!(queue.next_payable_sequence, 2);
        assert_eq!(state.queued_claim_liability, 0);
        assert!(maker_escrow_releasable(&state));
    }

    #[test]
    fn randomized_open_close_sequence_conserves_capital_counters() {
        for seed in 1_u64..=128 {
            let mut state = active();
            let long = seed.saturating_mul(10_000);
            let short = seed.saturating_mul(7_000);
            state =
                apply_pair_open(&config(), state, long, short, 200).expect("funded bounded open");
            state = apply_close(&config(), state, Side::Long, long).expect("independent long exit");
            state =
                apply_close(&config(), state, Side::Short, short).expect("independent short exit");
            assert_eq!(state.long_capital, 0);
            assert_eq!(state.short_capital, 0);
        }
    }
}
