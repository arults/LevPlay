//! Strict validation for normalized settlement observations.
//!
//! Production markets must pin two distinct observation accounts and their
//! verifier programs in program-owned market state. Verifier programs may
//! source provider-specific payloads, but LevPlay accepts only this exact,
//! versioned, integer-only envelope at the value-moving boundary.

use levplay_core::{mul_div_ceil, oracle_agrees, OracleObservation, BPS};
use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, pubkey::Pubkey,
};

pub const OBSERVATION_DISCRIMINATOR: [u8; 8] = *b"LVPOBS01";
pub const OBSERVATION_VERSION: u8 = 1;
pub const OBSERVATION_LEN: usize = 64;
pub const NORMALIZED_DECIMALS: i32 = 8;
pub const MAX_ABS_EXPONENT: i32 = 18;
pub const MAX_FUTURE_SKEW_SECONDS: i64 = 2;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OraclePolicy {
    pub max_age_seconds: u32,
    pub max_confidence_bps: u16,
    pub max_deviation_bps: u16,
    pub minimum_publishers: u8,
}

fn invalid() -> ProgramError {
    ProgramError::InvalidAccountData
}

fn read_i32(data: &[u8], offset: usize) -> Result<i32, ProgramError> {
    let bytes: [u8; 4] = data
        .get(offset..offset.checked_add(4).ok_or_else(invalid)?)
        .ok_or_else(invalid)?
        .try_into()
        .map_err(|_| invalid())?;
    Ok(i32::from_le_bytes(bytes))
}

fn read_i64(data: &[u8], offset: usize) -> Result<i64, ProgramError> {
    let bytes: [u8; 8] = data
        .get(offset..offset.checked_add(8).ok_or_else(invalid)?)
        .ok_or_else(invalid)?
        .try_into()
        .map_err(|_| invalid())?;
    Ok(i64::from_le_bytes(bytes))
}

fn read_u64(data: &[u8], offset: usize) -> Result<u64, ProgramError> {
    let bytes: [u8; 8] = data
        .get(offset..offset.checked_add(8).ok_or_else(invalid)?)
        .ok_or_else(invalid)?
        .try_into()
        .map_err(|_| invalid())?;
    Ok(u64::from_le_bytes(bytes))
}

fn pow10(exponent: u32) -> Result<u128, ProgramError> {
    let mut value = 1_u128;
    let mut index = 0_u32;
    while index < exponent {
        value = value.checked_mul(10).ok_or_else(invalid)?;
        index = index.checked_add(1).ok_or_else(invalid)?;
    }
    Ok(value)
}

fn normalize(raw: u64, exponent: i32) -> Result<u64, ProgramError> {
    if raw == 0 || !(-MAX_ABS_EXPONENT..=MAX_ABS_EXPONENT).contains(&exponent) {
        return Err(invalid());
    }
    let shift = exponent
        .checked_add(NORMALIZED_DECIMALS)
        .ok_or_else(invalid)?;
    let normalized = if shift >= 0 {
        u128::from(raw)
            .checked_mul(pow10(shift.unsigned_abs())?)
            .ok_or_else(invalid)?
    } else {
        u128::from(raw)
            .checked_div(pow10(shift.unsigned_abs())?)
            .ok_or_else(invalid)?
    };
    if normalized == 0 {
        return Err(invalid());
    }
    u64::try_from(normalized).map_err(|_| invalid())
}

pub fn validate_observation_account(
    account: &AccountInfo<'_>,
    expected_key: &Pubkey,
    expected_owner: &Pubkey,
    current_unix_timestamp: i64,
) -> Result<OracleObservation, ProgramError> {
    if account.key != expected_key
        || account.owner != expected_owner
        || account.is_writable
        || account.executable
        || current_unix_timestamp < 0
    {
        return Err(invalid());
    }

    let data = account.try_borrow_data()?;
    if data.len() != OBSERVATION_LEN
        || data[0..8] != OBSERVATION_DISCRIMINATOR
        || data[8] != OBSERVATION_VERSION
        || data[9] == 0
        || data[11..16].iter().any(|byte| *byte != 0)
        || data[28..32].iter().any(|byte| *byte != 0)
        || data[48..64].iter().any(|byte| *byte != 0)
    {
        return Err(invalid());
    }

    let publishers = data[10];
    let raw_price = read_i64(&data, 16)?;
    let exponent = read_i32(&data, 24)?;
    let raw_confidence = read_u64(&data, 32)?;
    let publish_time = read_i64(&data, 40)?;
    if raw_price <= 0
        || raw_confidence == 0
        || publish_time < 0
        || publish_time
            > current_unix_timestamp
                .checked_add(MAX_FUTURE_SKEW_SECONDS)
                .ok_or_else(invalid)?
    {
        return Err(invalid());
    }

    let price = normalize(u64::try_from(raw_price).map_err(|_| invalid())?, exponent)?;
    let confidence = normalize(raw_confidence, exponent)?;
    let confidence_bps = mul_div_ceil(confidence, BPS, price)
        .map_err(|_| invalid())
        .and_then(|value| u16::try_from(value).map_err(|_| invalid()))?;
    let age = current_unix_timestamp.saturating_sub(publish_time);
    let age_seconds = u32::try_from(age).map_err(|_| invalid())?;

    Ok(OracleObservation {
        price,
        age_seconds,
        confidence_bps,
        publishers,
    })
}

#[allow(clippy::too_many_arguments)]
pub fn validate_dual_oracle_accounts(
    primary: &AccountInfo<'_>,
    primary_key: &Pubkey,
    primary_owner: &Pubkey,
    secondary: &AccountInfo<'_>,
    secondary_key: &Pubkey,
    secondary_owner: &Pubkey,
    current_unix_timestamp: i64,
    policy: OraclePolicy,
) -> Result<(OracleObservation, OracleObservation), ProgramError> {
    if primary_key == secondary_key || primary_owner == secondary_owner {
        return Err(invalid());
    }
    let first =
        validate_observation_account(primary, primary_key, primary_owner, current_unix_timestamp)?;
    let second = validate_observation_account(
        secondary,
        secondary_key,
        secondary_owner,
        current_unix_timestamp,
    )?;
    oracle_agrees(
        first,
        second,
        policy.max_age_seconds,
        policy.max_confidence_bps,
        policy.max_deviation_bps,
        policy.minimum_publishers,
    )
    .map_err(|_| invalid())?;
    Ok((first, second))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn observation(
        price: i64,
        exponent: i32,
        confidence: u64,
        publish_time: i64,
        publishers: u8,
    ) -> [u8; OBSERVATION_LEN] {
        let mut data = [0_u8; OBSERVATION_LEN];
        data[0..8].copy_from_slice(&OBSERVATION_DISCRIMINATOR);
        data[8] = OBSERVATION_VERSION;
        data[9] = 1;
        data[10] = publishers;
        data[16..24].copy_from_slice(&price.to_le_bytes());
        data[24..28].copy_from_slice(&exponent.to_le_bytes());
        data[32..40].copy_from_slice(&confidence.to_le_bytes());
        data[40..48].copy_from_slice(&publish_time.to_le_bytes());
        data
    }

    fn policy() -> OraclePolicy {
        OraclePolicy {
            max_age_seconds: 30,
            max_confidence_bps: 100,
            max_deviation_bps: 100,
            minimum_publishers: 3,
        }
    }

    #[test]
    fn exact_accounts_normalize_and_agree() {
        let first_key = Pubkey::new_unique();
        let second_key = Pubkey::new_unique();
        let first_owner = Pubkey::new_unique();
        let second_owner = Pubkey::new_unique();
        let mut first_data = observation(150_000_000, -6, 10_000, 995, 5);
        let mut second_data = observation(150_500_000, -6, 12_000, 994, 4);
        let mut first_lamports = 1;
        let mut second_lamports = 1;
        let first = AccountInfo::new(
            &first_key,
            false,
            false,
            &mut first_lamports,
            &mut first_data,
            &first_owner,
            false,
            0,
        );
        let second = AccountInfo::new(
            &second_key,
            false,
            false,
            &mut second_lamports,
            &mut second_data,
            &second_owner,
            false,
            0,
        );

        let (left, right) = validate_dual_oracle_accounts(
            &first,
            &first_key,
            &first_owner,
            &second,
            &second_key,
            &second_owner,
            1_000,
            policy(),
        )
        .expect("valid dual observations");
        assert_eq!(left.price, 15_000_000_000);
        assert_eq!(right.price, 15_050_000_000);
        assert_eq!(left.age_seconds, 5);
    }

    #[test]
    fn rejects_owner_substitution_reserved_data_and_future_time() {
        let key = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let wrong_owner = Pubkey::new_unique();
        let mut lamports = 1;
        let mut data = observation(100_000_000, -6, 10_000, 1_003, 5);
        data[48] = 1;
        let account =
            AccountInfo::new(&key, false, false, &mut lamports, &mut data, &owner, false, 0);
        assert_eq!(
            validate_observation_account(&account, &key, &wrong_owner, 1_000),
            Err(ProgramError::InvalidAccountData)
        );
        assert_eq!(
            validate_observation_account(&account, &key, &owner, 1_000),
            Err(ProgramError::InvalidAccountData)
        );
    }

    #[test]
    fn rejects_stale_wide_confidence_and_deviation() {
        let first_key = Pubkey::new_unique();
        let second_key = Pubkey::new_unique();
        let first_owner = Pubkey::new_unique();
        let second_owner = Pubkey::new_unique();
        let mut first_data = observation(100_000_000, -6, 10_000, 900, 5);
        let mut second_data = observation(110_000_000, -6, 2_000_000, 999, 5);
        let mut first_lamports = 1;
        let mut second_lamports = 1;
        let first = AccountInfo::new(
            &first_key,
            false,
            false,
            &mut first_lamports,
            &mut first_data,
            &first_owner,
            false,
            0,
        );
        let second = AccountInfo::new(
            &second_key,
            false,
            false,
            &mut second_lamports,
            &mut second_data,
            &second_owner,
            false,
            0,
        );
        assert_eq!(
            validate_dual_oracle_accounts(
                &first,
                &first_key,
                &first_owner,
                &second,
                &second_key,
                &second_owner,
                1_000,
                policy(),
            ),
            Err(ProgramError::InvalidAccountData)
        );
    }

    #[test]
    fn rejects_exponent_overflow_and_dust() {
        let key = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let mut lamports = 1;
        let mut data = observation(i64::MAX, MAX_ABS_EXPONENT, 1, 1_000, 5);
        let account =
            AccountInfo::new(&key, false, false, &mut lamports, &mut data, &owner, false, 0);
        assert_eq!(
            validate_observation_account(&account, &key, &owner, 1_000),
            Err(ProgramError::InvalidAccountData)
        );

        let mut dust_lamports = 1;
        let mut dust = observation(1, -MAX_ABS_EXPONENT, 1, 1_000, 5);
        let dust_account =
            AccountInfo::new(&key, false, false, &mut dust_lamports, &mut dust, &owner, false, 0);
        assert_eq!(
            validate_observation_account(&dust_account, &key, &owner, 1_000),
            Err(ProgramError::InvalidAccountData)
        );
    }
}
