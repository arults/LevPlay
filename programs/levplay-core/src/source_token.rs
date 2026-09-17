//! Provider-controlled source-token admission.
//!
//! The SBF account parser must normalize the live mint extensions into this
//! snapshot. The core then rejects any authority, multiplier or halt state that
//! differs from the audited release policy.

use crate::{Address, Error, Result};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SourceTokenPolicy {
    pub mint: Address,
    pub token_program: Address,
    pub multiplier_authority: Address,
    pub pause_authority: Address,
    pub permanent_delegate: Address,
    pub transfer_hook_program: Address,
    pub minimum_multiplier: u64,
    pub maximum_multiplier: u64,
    pub corporate_action_guard_seconds: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SourceTokenSnapshot {
    pub mint: Address,
    pub token_program: Address,
    pub multiplier_authority: Address,
    pub pause_authority: Address,
    pub permanent_delegate: Address,
    pub transfer_hook_program: Address,
    pub multiplier: u64,
    pub multiplier_activation_unix: i64,
    pub observed_unix: i64,
    pub paused: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SourceAction {
    OpenOrIncrease,
    RebalanceIncrease,
    CloseOrReduce,
}

fn nonzero(value: Address) -> bool {
    value != [0_u8; 32]
}

pub fn validate_source_policy(policy: &SourceTokenPolicy) -> Result<()> {
    let identities = [
        policy.mint,
        policy.token_program,
        policy.multiplier_authority,
        policy.pause_authority,
        policy.permanent_delegate,
    ];
    if identities.iter().any(|value| !nonzero(*value))
        || policy.minimum_multiplier == 0
        || policy.minimum_multiplier > policy.maximum_multiplier
        || policy.corporate_action_guard_seconds == 0
    {
        return Err(Error::InvalidConfiguration);
    }
    Ok(())
}

pub fn validate_source_token(
    policy: &SourceTokenPolicy,
    snapshot: &SourceTokenSnapshot,
    action: SourceAction,
) -> Result<()> {
    validate_source_policy(policy)?;

    if snapshot.mint != policy.mint
        || snapshot.token_program != policy.token_program
        || snapshot.multiplier_authority != policy.multiplier_authority
        || snapshot.pause_authority != policy.pause_authority
        || snapshot.permanent_delegate != policy.permanent_delegate
        || snapshot.transfer_hook_program != policy.transfer_hook_program
    {
        return Err(Error::InvalidAccounts);
    }

    if snapshot.multiplier < policy.minimum_multiplier
        || snapshot.multiplier > policy.maximum_multiplier
        || snapshot.observed_unix < 0
    {
        return Err(Error::InvalidState);
    }

    let guard = i64::from(policy.corporate_action_guard_seconds);
    let distance = snapshot
        .multiplier_activation_unix
        .checked_sub(snapshot.observed_unix)
        .ok_or(Error::ArithmeticOverflow)?;

    let risk_increasing = matches!(
        action,
        SourceAction::OpenOrIncrease | SourceAction::RebalanceIncrease
    );
    if risk_increasing && (snapshot.paused || (-guard..=guard).contains(&distance)) {
        return Err(Error::InvalidState);
    }

    // A pause or corporate-action window must never trap a holder. The SBF
    // layer may use only the audited reserve/pro-rata close path in this state.
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn address(value: u8) -> Address {
        [value; 32]
    }

    fn policy() -> SourceTokenPolicy {
        SourceTokenPolicy {
            mint: address(1),
            token_program: address(2),
            multiplier_authority: address(3),
            pause_authority: address(4),
            permanent_delegate: address(5),
            transfer_hook_program: address(6),
            minimum_multiplier: 900_000,
            maximum_multiplier: 1_100_000,
            corporate_action_guard_seconds: 900,
        }
    }

    fn snapshot() -> SourceTokenSnapshot {
        SourceTokenSnapshot {
            mint: address(1),
            token_program: address(2),
            multiplier_authority: address(3),
            pause_authority: address(4),
            permanent_delegate: address(5),
            transfer_hook_program: address(6),
            multiplier: 1_000_000,
            multiplier_activation_unix: 2_000,
            observed_unix: 1_000,
            paused: false,
        }
    }

    #[test]
    fn admits_matching_source_outside_guard_window() {
        assert_eq!(
            validate_source_token(&policy(), &snapshot(), SourceAction::OpenOrIncrease),
            Ok(())
        );
    }

    #[test]
    fn rejects_every_substituted_identity() {
        for index in 0..6 {
            let mut value = snapshot();
            match index {
                0 => value.mint = address(9),
                1 => value.token_program = address(9),
                2 => value.multiplier_authority = address(9),
                3 => value.pause_authority = address(9),
                4 => value.permanent_delegate = address(9),
                _ => value.transfer_hook_program = address(9),
            }
            assert_eq!(
                validate_source_token(&policy(), &value, SourceAction::OpenOrIncrease),
                Err(Error::InvalidAccounts)
            );
        }
    }

    #[test]
    fn halt_blocks_risk_but_preserves_reduction_path() {
        let mut value = snapshot();
        value.paused = true;
        assert_eq!(
            validate_source_token(&policy(), &value, SourceAction::OpenOrIncrease),
            Err(Error::InvalidState)
        );
        assert_eq!(
            validate_source_token(&policy(), &value, SourceAction::CloseOrReduce),
            Ok(())
        );
    }

    #[test]
    fn corporate_action_guard_blocks_risk_but_not_close() {
        let mut value = snapshot();
        value.multiplier_activation_unix = 1_500;
        assert_eq!(
            validate_source_token(&policy(), &value, SourceAction::RebalanceIncrease),
            Err(Error::InvalidState)
        );
        assert_eq!(
            validate_source_token(&policy(), &value, SourceAction::CloseOrReduce),
            Ok(())
        );
    }

    #[test]
    fn rejects_multiplier_outside_audited_envelope() {
        for multiplier in [899_999, 1_100_001] {
            let mut value = snapshot();
            value.multiplier = multiplier;
            assert_eq!(
                validate_source_token(&policy(), &value, SourceAction::OpenOrIncrease),
                Err(Error::InvalidState)
            );
        }
    }
}
