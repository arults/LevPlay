//! Exact program-owned position and queued-claim state.
//!
//! Active positions are identity-bound to one wallet and one isolated market.
//! Claims are FIFO liabilities created only after shares are burned; paid
//! claims cannot be replayed or partially re-opened.

use crate::{Address, Error, Result, Side, ACCOUNT_VERSION};

pub const POSITION_DISCRIMINATOR: [u8; 8] = *b"LVPPOS01";
pub const CLAIM_DISCRIMINATOR: [u8; 8] = *b"LVPCLM01";
pub const POSITION_STATE_LEN: usize = 176;
pub const CLAIM_STATE_LEN: usize = 176;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct PositionState {
    pub bump: u8,
    pub side: Side,
    pub owner: Address,
    pub market: Address,
    pub product_mint: Address,
    pub shares: u64,
    pub cost_basis: u64,
    pub opened_slot: u64,
    pub next_nonce: u64,
    pub realized_pnl: i64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Pending,
    Paid,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ClaimState {
    pub bump: u8,
    pub status: ClaimStatus,
    pub owner: Address,
    pub market: Address,
    pub claim_id: u64,
    pub shares_burned: u64,
    pub usdc_due: u64,
    pub usdc_paid: u64,
    pub created_slot: u64,
    pub settled_slot: u64,
    pub next_claim: Address,
}

fn u64_at(bytes: &[u8], offset: usize) -> Result<u64> {
    let end = offset.checked_add(8).ok_or(Error::ArithmeticOverflow)?;
    let value: [u8; 8] = bytes
        .get(offset..end)
        .ok_or(Error::InvalidState)?
        .try_into()
        .map_err(|_| Error::InvalidState)?;
    Ok(u64::from_le_bytes(value))
}

fn i64_at(bytes: &[u8], offset: usize) -> Result<i64> {
    let end = offset.checked_add(8).ok_or(Error::ArithmeticOverflow)?;
    let value: [u8; 8] = bytes
        .get(offset..end)
        .ok_or(Error::InvalidState)?
        .try_into()
        .map_err(|_| Error::InvalidState)?;
    Ok(i64::from_le_bytes(value))
}

fn address_at(bytes: &[u8], offset: usize) -> Result<Address> {
    let end = offset.checked_add(32).ok_or(Error::ArithmeticOverflow)?;
    bytes
        .get(offset..end)
        .ok_or(Error::InvalidState)?
        .try_into()
        .map_err(|_| Error::InvalidState)
}

fn header(bytes: &[u8], discriminator: &[u8; 8]) -> Result<u8> {
    if bytes.get(0..8) != Some(discriminator)
        || bytes.get(8) != Some(&ACCOUNT_VERSION)
        || bytes.get(9) != Some(&1)
    {
        return Err(Error::InvalidState);
    }
    bytes.get(10).copied().ok_or(Error::InvalidState)
}

fn nonzero_distinct(left: Address, right: Address) -> Result<()> {
    if left == [0; 32] || right == [0; 32] || left == right {
        return Err(Error::InvalidConfiguration);
    }
    Ok(())
}

pub fn decode_position_state(bytes: &[u8]) -> Result<PositionState> {
    if bytes.len() != POSITION_STATE_LEN || bytes[12..16].iter().any(|byte| *byte != 0) {
        return Err(Error::InvalidState);
    }
    let bump = header(bytes, &POSITION_DISCRIMINATOR)?;
    let side = match bytes[11] {
        0 => Side::Long,
        1 => Side::Short,
        _ => return Err(Error::InvalidState),
    };
    let state = PositionState {
        bump,
        side,
        owner: address_at(bytes, 16)?,
        market: address_at(bytes, 48)?,
        product_mint: address_at(bytes, 80)?,
        shares: u64_at(bytes, 112)?,
        cost_basis: u64_at(bytes, 120)?,
        opened_slot: u64_at(bytes, 128)?,
        next_nonce: u64_at(bytes, 136)?,
        realized_pnl: i64_at(bytes, 144)?,
    };
    if bytes[152..176].iter().any(|byte| *byte != 0)
        || state.product_mint == [0; 32]
        || state.shares == 0
        || state.cost_basis == 0
        || state.opened_slot == 0
    {
        return Err(Error::InvalidState);
    }
    nonzero_distinct(state.owner, state.market)?;
    if state.product_mint == state.owner || state.product_mint == state.market {
        return Err(Error::InvalidConfiguration);
    }
    Ok(state)
}

pub fn decode_claim_state(bytes: &[u8]) -> Result<ClaimState> {
    if bytes.len() != CLAIM_STATE_LEN || bytes[12..16].iter().any(|byte| *byte != 0) {
        return Err(Error::InvalidState);
    }
    let bump = header(bytes, &CLAIM_DISCRIMINATOR)?;
    let status = match bytes[11] {
        0 => ClaimStatus::Pending,
        1 => ClaimStatus::Paid,
        _ => return Err(Error::InvalidState),
    };
    let state = ClaimState {
        bump,
        status,
        owner: address_at(bytes, 16)?,
        market: address_at(bytes, 48)?,
        claim_id: u64_at(bytes, 80)?,
        shares_burned: u64_at(bytes, 88)?,
        usdc_due: u64_at(bytes, 96)?,
        usdc_paid: u64_at(bytes, 104)?,
        created_slot: u64_at(bytes, 112)?,
        settled_slot: u64_at(bytes, 120)?,
        next_claim: address_at(bytes, 128)?,
    };
    if bytes[160..176].iter().any(|byte| *byte != 0)
        || state.shares_burned == 0
        || state.usdc_due == 0
        || state.usdc_paid > state.usdc_due
        || state.created_slot == 0
    {
        return Err(Error::InvalidState);
    }
    nonzero_distinct(state.owner, state.market)?;
    match state.status {
        ClaimStatus::Pending if state.settled_slot == 0 && state.usdc_paid < state.usdc_due => {}
        ClaimStatus::Paid
            if state.settled_slot >= state.created_slot && state.usdc_paid == state.usdc_due => {}
        _ => return Err(Error::InvalidState),
    }
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn write_address(bytes: &mut [u8], offset: usize, value: u8) {
        bytes[offset..offset + 32].copy_from_slice(&address(value));
    }

    fn position_bytes() -> [u8; POSITION_STATE_LEN] {
        let mut bytes = [0_u8; POSITION_STATE_LEN];
        bytes[0..8].copy_from_slice(&POSITION_DISCRIMINATOR);
        bytes[8] = ACCOUNT_VERSION;
        bytes[9] = 1;
        bytes[10] = 250;
        bytes[11] = Side::Long as u8;
        write_address(&mut bytes, 16, 1);
        write_address(&mut bytes, 48, 2);
        write_address(&mut bytes, 80, 3);
        bytes[112..120].copy_from_slice(&50_u64.to_le_bytes());
        bytes[120..128].copy_from_slice(&51_u64.to_le_bytes());
        bytes[128..136].copy_from_slice(&100_u64.to_le_bytes());
        bytes[136..144].copy_from_slice(&7_u64.to_le_bytes());
        bytes[144..152].copy_from_slice(&(-1_i64).to_le_bytes());
        bytes
    }

    fn claim_bytes() -> [u8; CLAIM_STATE_LEN] {
        let mut bytes = [0_u8; CLAIM_STATE_LEN];
        bytes[0..8].copy_from_slice(&CLAIM_DISCRIMINATOR);
        bytes[8] = ACCOUNT_VERSION;
        bytes[9] = 1;
        bytes[10] = 249;
        bytes[11] = 0;
        write_address(&mut bytes, 16, 1);
        write_address(&mut bytes, 48, 2);
        bytes[80..88].copy_from_slice(&9_u64.to_le_bytes());
        bytes[88..96].copy_from_slice(&50_u64.to_le_bytes());
        bytes[96..104].copy_from_slice(&45_u64.to_le_bytes());
        bytes[104..112].copy_from_slice(&10_u64.to_le_bytes());
        bytes[112..120].copy_from_slice(&100_u64.to_le_bytes());
        write_address(&mut bytes, 128, 4);
        bytes
    }

    #[test]
    fn position_layout_is_exact_and_identity_bound() {
        let state = decode_position_state(&position_bytes()).expect("valid position");
        assert_eq!(state.owner, address(1));
        assert_eq!(state.market, address(2));
        assert_eq!(state.shares, 50);
        assert_eq!(state.realized_pnl, -1);
    }

    #[test]
    fn position_rejects_alias_zero_balance_and_reserved_bytes() {
        let mut bytes = position_bytes();
        write_address(&mut bytes, 48, 1);
        assert_eq!(
            decode_position_state(&bytes),
            Err(Error::InvalidConfiguration)
        );
        let mut bytes = position_bytes();
        bytes[112..120].copy_from_slice(&0_u64.to_le_bytes());
        assert_eq!(decode_position_state(&bytes), Err(Error::InvalidState));
        let mut bytes = position_bytes();
        bytes[160] = 1;
        assert_eq!(decode_position_state(&bytes), Err(Error::InvalidState));
    }

    #[test]
    fn pending_claim_requires_burned_shares_and_unpaid_liability() {
        let state = decode_claim_state(&claim_bytes()).expect("valid pending claim");
        assert_eq!(state.status, ClaimStatus::Pending);
        assert_eq!(state.shares_burned, 50);
        assert_eq!(state.usdc_due, 45);

        let mut bytes = claim_bytes();
        bytes[104..112].copy_from_slice(&45_u64.to_le_bytes());
        assert_eq!(decode_claim_state(&bytes), Err(Error::InvalidState));
    }

    #[test]
    fn paid_claim_is_final_and_fully_reconciled() {
        let mut bytes = claim_bytes();
        bytes[11] = 1;
        bytes[104..112].copy_from_slice(&45_u64.to_le_bytes());
        bytes[120..128].copy_from_slice(&101_u64.to_le_bytes());
        let state = decode_claim_state(&bytes).expect("valid paid claim");
        assert_eq!(state.status, ClaimStatus::Paid);

        bytes[104..112].copy_from_slice(&44_u64.to_le_bytes());
        assert_eq!(decode_claim_state(&bytes), Err(Error::InvalidState));
    }

    #[test]
    fn layouts_reject_truncation_and_reinitialization_markers() {
        assert_eq!(
            decode_position_state(&position_bytes()[..POSITION_STATE_LEN - 1]),
            Err(Error::InvalidState)
        );
        let mut claim = claim_bytes();
        claim[9] = 0;
        assert_eq!(decode_claim_state(&claim), Err(Error::InvalidState));
    }
}
