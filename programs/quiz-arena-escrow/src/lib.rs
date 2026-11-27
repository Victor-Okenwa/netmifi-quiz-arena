//! Netmifi Quiz Arena — Solana Devnet Reward Battle Escrow Program
//!
//! Enforces Rule 3 (Hybrid Trust Model, Canonical PDA Seeds, Checked Arithmetic,
//! Authorized Backend Settlement Authority, and Strict State Transitions).
//!
//! Program ID: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`
//!
//! PDA Seeds:
//! - BattleEscrowState: `[b"battle", battle_seed.as_bytes()]`
//! - BattleVault:       `[b"battle_vault", battle_seed.as_bytes()]`

/// Canonical Program ID on Solana Devnet
pub const PROGRAM_ID: &str = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

/// PDA seed prefix for the BattleEscrowState account
pub const BATTLE_ESCROW_SEED_PREFIX: &[u8] = b"battle";

/// PDA seed prefix for the program-controlled lamport escrow vault
pub const BATTLE_VAULT_SEED_PREFIX: &[u8] = b"battle_vault";

/// Solana's maximum byte length for a single PDA seed slice
pub const MAX_BATTLE_SEED_LEN: usize = 32;

/// 32-byte Solana Public Key representation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Pubkey(pub [u8; 32]);

impl Pubkey {
    pub const fn new_from_array(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    pub fn is_default(&self) -> bool {
        self.0 == [0u8; 32]
    }
}

/// Lifecycle states of an on-chain reward battle escrow
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum BattleEscrowStatus {
    /// Creator initialized the battle and deposited `stake_amount` lamports
    Created = 0,
    /// Opponent joined and deposited matching `stake_amount` lamports (total_pot = 2 * stake_amount)
    Funded = 1,
    /// Authorized backend settlement signer finalized outcome and distributed pot
    Settled = 2,
    /// Creator cancelled before an opponent joined and reclaimed deposit
    Cancelled = 3,
    /// Funded battle expired without settlement; both participants refunded
    Refunded = 4,
}

/// Verified off-chain quiz outcome submitted by the authorized backend settlement authority
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum BattleOutcome {
    CreatorWins = 0,
    OpponentWins = 1,
    Draw = 2,
}

/// Custom Anchor Error Codes (6000..6012)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum EscrowError {
    /// 6000: Battle seed must be between 1 and 32 ASCII bytes
    InvalidBattleSeedLength = 6000,
    /// 6001: Stake amount must be strictly greater than zero lamports
    ZeroStakeAmount = 6001,
    /// 6002: Expiry timestamp must be in the future relative to current cluster time
    InvalidExpiryTimestamp = 6002,
    /// 6003: Battle already has an opponent enrolled
    BattleAlreadyJoined = 6003,
    /// 6004: Creator cannot join their own battle as opponent
    SelfPlayNotAllowed = 6004,
    /// 6005: Battle has already passed its expiry timestamp
    BattleExpired = 6005,
    /// 6006: Battle has not yet expired; timeout refund is unavailable
    BattleNotExpired = 6006,
    /// 6007: Battle escrow status does not permit this instruction
    InvalidBattleStatus = 6007,
    /// 6008: Signer does not match the authorized backend settlement authority
    UnauthorizedSettlementAuthority = 6008,
    /// 6009: Signer does not match the battle creator
    UnauthorizedCreator = 6009,
    /// 6010: Provided destination account does not match recorded participant pubkey
    InvalidParticipantAccount = 6010,
    /// 6011: Checked integer arithmetic overflow or underflow
    ArithmeticOverflow = 6011,
    /// 6012: Escrow vault balance is insufficient for settlement transfer
    InsufficientEscrowBalance = 6012,
}

/// On-chain account state for a Reward Battle Escrow PDA (`[b"battle", battle_seed.as_bytes()]`)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleEscrowState {
    /// Normalized 1..=32 byte battle identifier (UUID without hyphens)
    pub battle_seed: String,
    /// Creator player wallet public key
    pub creator: Pubkey,
    /// Opponent player wallet public key (`Pubkey::default()` while `Created`)
    pub opponent: Pubkey,
    /// Authorized backend settlement authority public key
    pub authority: Pubkey,
    /// Per-participant stake amount in lamports
    pub stake_amount: u64,
    /// Current total lamports held in the escrow vault PDA
    pub total_pot: u64,
    /// Current state machine status
    pub status: BattleEscrowStatus,
    /// Winner wallet public key (`Pubkey::default()` if unsettled or draw)
    pub winner: Pubkey,
    /// True if finalized as a 50/50 draw
    pub is_draw: bool,
    /// Unix timestamp (seconds) when created
    pub created_at: i64,
    /// Unix timestamp (seconds) when opponent funded
    pub funded_at: i64,
    /// Unix timestamp (seconds) after which unclaimed/unsettled funds can be refunded
    pub expiry_ts: i64,
    /// Unix timestamp (seconds) when finalized
    pub settled_at: i64,
    /// Canonical PDA bump for `BattleEscrowState`
    pub bump: u8,
    /// Canonical PDA bump for `BattleVault`
    pub vault_bump: u8,
}

/// Emitted when a creator initializes and funds a new reward battle escrow
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleCreatedEvent {
    pub battle_seed: String,
    pub creator: Pubkey,
    pub authority: Pubkey,
    pub stake_amount: u64,
    pub expiry_ts: i64,
    pub created_at: i64,
}

/// Emitted when an opponent joins and deposits matching stake
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleFundedEvent {
    pub battle_seed: String,
    pub creator: Pubkey,
    pub opponent: Pubkey,
    pub total_pot: u64,
    pub funded_at: i64,
}

/// Emitted when the authorized backend authority settles the battle pot
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleSettledEvent {
    pub battle_seed: String,
    pub outcome: BattleOutcome,
    pub winner: Pubkey,
    pub is_draw: bool,
    pub creator_payout: u64,
    pub opponent_payout: u64,
    pub settled_at: i64,
}

/// Emitted when a creator cancels an unjoined battle
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleCancelledEvent {
    pub battle_seed: String,
    pub creator: Pubkey,
    pub refunded_amount: u64,
    pub cancelled_at: i64,
}

/// Emitted when an expired funded battle is refunded to both participants
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BattleRefundedEvent {
    pub battle_seed: String,
    pub creator: Pubkey,
    pub opponent: Pubkey,
    pub creator_refund: u64,
    pub opponent_refund: u64,
    pub refunded_at: i64,
}

/// Payout distribution result returned by settlement / refund instructions
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EscrowTransferPlan {
    pub creator_lamports: u64,
    pub opponent_lamports: u64,
}

/// Normalizes a battle UUID (with or without hyphens) into a valid <= 32-byte PDA seed.
pub fn normalize_battle_seed(raw_battle_id: &str) -> Result<String, EscrowError> {
    let trimmed = raw_battle_id.trim();
    let compact: String = trimmed.chars().filter(|c| *c != '-').collect();
    if compact.is_empty() || compact.len() > MAX_BATTLE_SEED_LEN {
        return Err(EscrowError::InvalidBattleSeedLength);
    }
    Ok(compact)
}

/// Instruction 1: `create_battle`
/// Initializes `BattleEscrowState` and records creator's deposit into the escrow vault.
pub fn process_create_battle(
    battle_seed: String,
    creator: Pubkey,
    authority: Pubkey,
    stake_amount: u64,
    expiry_ts: i64,
    current_ts: i64,
    bump: u8,
    vault_bump: u8,
) -> Result<(BattleEscrowState, BattleCreatedEvent), EscrowError> {
    if battle_seed.is_empty() || battle_seed.len() > MAX_BATTLE_SEED_LEN {
        return Err(EscrowError::InvalidBattleSeedLength);
    }
    if stake_amount == 0 {
        return Err(EscrowError::ZeroStakeAmount);
    }
    if expiry_ts <= current_ts {
        return Err(EscrowError::InvalidExpiryTimestamp);
    }
    if creator.is_default() {
        return Err(EscrowError::UnauthorizedCreator);
    }
    if authority.is_default() {
        return Err(EscrowError::UnauthorizedSettlementAuthority);
    }

    let state = BattleEscrowState {
        battle_seed: battle_seed.clone(),
        creator,
        opponent: Pubkey::default(),
        authority,
        stake_amount,
        total_pot: stake_amount,
        status: BattleEscrowStatus::Created,
        winner: Pubkey::default(),
        is_draw: false,
        created_at: current_ts,
        funded_at: 0,
        expiry_ts,
        settled_at: 0,
        bump,
        vault_bump,
    };

    let event = BattleCreatedEvent {
        battle_seed,
        creator,
        authority,
        stake_amount,
        expiry_ts,
        created_at: current_ts,
    };

    Ok((state, event))
}

/// Instruction 2: `join_battle`
/// Validates opponent, adds matching stake via checked arithmetic, and marks escrow `Funded`.
pub fn process_join_battle(
    state: &mut BattleEscrowState,
    opponent: Pubkey,
    current_ts: i64,
) -> Result<BattleFundedEvent, EscrowError> {
    if state.status != BattleEscrowStatus::Created {
        return Err(EscrowError::InvalidBattleStatus);
    }
    if !state.opponent.is_default() {
        return Err(EscrowError::BattleAlreadyJoined);
    }
    if opponent.is_default() || opponent == state.creator {
        return Err(EscrowError::SelfPlayNotAllowed);
    }
    if current_ts > state.expiry_ts {
        return Err(EscrowError::BattleExpired);
    }

    let new_pot = state
        .total_pot
        .checked_add(state.stake_amount)
        .ok_or(EscrowError::ArithmeticOverflow)?;

    state.opponent = opponent;
    state.total_pot = new_pot;
    state.status = BattleEscrowStatus::Funded;
    state.funded_at = current_ts;

    Ok(BattleFundedEvent {
        battle_seed: state.battle_seed.clone(),
        creator: state.creator,
        opponent,
        total_pot: new_pot,
        funded_at: current_ts,
    })
}

/// Instruction 3: `finalize_battle`
/// Requires the authorized backend settlement authority signer.
/// Transfers full pot to winner or splits 50/50 on a draw, marking state `Settled`.
pub fn process_finalize_battle(
    state: &mut BattleEscrowState,
    authority_signer: Pubkey,
    creator_destination: Pubkey,
    opponent_destination: Pubkey,
    outcome: BattleOutcome,
    current_ts: i64,
) -> Result<(EscrowTransferPlan, BattleSettledEvent), EscrowError> {
    if authority_signer != state.authority {
        return Err(EscrowError::UnauthorizedSettlementAuthority);
    }
    if state.status != BattleEscrowStatus::Funded {
        return Err(EscrowError::InvalidBattleStatus);
    }
    if creator_destination != state.creator || opponent_destination != state.opponent {
        return Err(EscrowError::InvalidParticipantAccount);
    }

    let expected_pot = state
        .stake_amount
        .checked_mul(2)
        .ok_or(EscrowError::ArithmeticOverflow)?;
    if state.total_pot < expected_pot {
        return Err(EscrowError::InsufficientEscrowBalance);
    }

    let pot = state.total_pot;
    let (creator_payout, opponent_payout, winner, is_draw) = match outcome {
        BattleOutcome::CreatorWins => (pot, 0u64, state.creator, false),
        BattleOutcome::OpponentWins => (0u64, pot, state.opponent, false),
        BattleOutcome::Draw => {
            let half = pot.checked_div(2).ok_or(EscrowError::ArithmeticOverflow)?;
            let remainder = pot
                .checked_sub(half)
                .ok_or(EscrowError::ArithmeticOverflow)?;
            (half, remainder, Pubkey::default(), true)
        }
    };

    state.status = BattleEscrowStatus::Settled;
    state.winner = winner;
    state.is_draw = is_draw;
    state.total_pot = 0;
    state.settled_at = current_ts;

    let plan = EscrowTransferPlan {
        creator_lamports: creator_payout,
        opponent_lamports: opponent_payout,
    };

    let event = BattleSettledEvent {
        battle_seed: state.battle_seed.clone(),
        outcome,
        winner,
        is_draw,
        creator_payout,
        opponent_payout,
        settled_at: current_ts,
    };

    Ok((plan, event))
}

/// Instruction 4: `cancel_battle`
/// Allows the creator to cancel an unjoined battle and reclaim their full stake.
pub fn process_cancel_battle(
    state: &mut BattleEscrowState,
    creator_signer: Pubkey,
    current_ts: i64,
) -> Result<(EscrowTransferPlan, BattleCancelledEvent), EscrowError> {
    if creator_signer != state.creator {
        return Err(EscrowError::UnauthorizedCreator);
    }
    if state.status != BattleEscrowStatus::Created {
        return Err(EscrowError::InvalidBattleStatus);
    }
    if !state.opponent.is_default() {
        return Err(EscrowError::BattleAlreadyJoined);
    }

    let refund = state.total_pot;
    if refund == 0 {
        return Err(EscrowError::InsufficientEscrowBalance);
    }

    state.status = BattleEscrowStatus::Cancelled;
    state.total_pot = 0;

    let plan = EscrowTransferPlan {
        creator_lamports: refund,
        opponent_lamports: 0,
    };

    let event = BattleCancelledEvent {
        battle_seed: state.battle_seed.clone(),
        creator: state.creator,
        refunded_amount: refund,
        cancelled_at: current_ts,
    };

    Ok((plan, event))
}

/// Instruction 5: `refund_expired_battle`
/// Refunds both participants if a funded battle passes `expiry_ts` without settlement.
pub fn process_refund_expired_battle(
    state: &mut BattleEscrowState,
    creator_destination: Pubkey,
    opponent_destination: Pubkey,
    current_ts: i64,
) -> Result<(EscrowTransferPlan, BattleRefundedEvent), EscrowError> {
    if state.status != BattleEscrowStatus::Funded {
        return Err(EscrowError::InvalidBattleStatus);
    }
    if current_ts <= state.expiry_ts {
        return Err(EscrowError::BattleNotExpired);
    }
    if creator_destination != state.creator || opponent_destination != state.opponent {
        return Err(EscrowError::InvalidParticipantAccount);
    }

    let creator_refund = state
        .total_pot
        .checked_div(2)
        .ok_or(EscrowError::ArithmeticOverflow)?;
    let opponent_refund = state
        .total_pot
        .checked_sub(creator_refund)
        .ok_or(EscrowError::ArithmeticOverflow)?;

    state.status = BattleEscrowStatus::Refunded;
    state.total_pot = 0;

    let plan = EscrowTransferPlan {
        creator_lamports: creator_refund,
        opponent_lamports: opponent_refund,
    };

    let event = BattleRefundedEvent {
        battle_seed: state.battle_seed.clone(),
        creator: state.creator,
        opponent: state.opponent,
        creator_refund,
        opponent_refund,
        refunded_at: current_ts,
    };

    Ok((plan, event))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_pubkey(byte: u8) -> Pubkey {
        Pubkey([byte; 32])
    }

    #[test]
    fn normalizes_uuid_to_32_byte_seed_and_rejects_invalid_lengths() {
        let uuid = "550e8400-e29b-41d4-a716-446655440000";
        let seed = normalize_battle_seed(uuid).expect("valid UUID should normalize");
        assert_eq!(seed, "550e8400e29b41d4a716446655440000");
        assert_eq!(seed.len(), 32);

        assert_eq!(
            normalize_battle_seed(""),
            Err(EscrowError::InvalidBattleSeedLength)
        );
        assert_eq!(
            normalize_battle_seed("a".repeat(33).as_str()),
            Err(EscrowError::InvalidBattleSeedLength)
        );
    }

    #[test]
    fn happy_path_create_join_and_finalize_creator_wins() {
        let creator = sample_pubkey(1);
        let opponent = sample_pubkey(2);
        let authority = sample_pubkey(9);
        let stake = 100_000_000; // 0.1 SOL

        let (mut state, created_ev) = process_create_battle(
            "550e8400e29b41d4a716446655440000".to_string(),
            creator,
            authority,
            stake,
            2000,
            1000,
            254,
            253,
        )
        .expect("create_battle should succeed");

        assert_eq!(state.status, BattleEscrowStatus::Created);
        assert_eq!(state.total_pot, stake);
        assert_eq!(created_ev.stake_amount, stake);

        let funded_ev =
            process_join_battle(&mut state, opponent, 1200).expect("join_battle should succeed");
        assert_eq!(state.status, BattleEscrowStatus::Funded);
        assert_eq!(state.total_pot, 200_000_000);
        assert_eq!(funded_ev.total_pot, 200_000_000);

        let (plan, settled_ev) = process_finalize_battle(
            &mut state,
            authority,
            creator,
            opponent,
            BattleOutcome::CreatorWins,
            1500,
        )
        .expect("finalize_battle should succeed");

        assert_eq!(state.status, BattleEscrowStatus::Settled);
        assert_eq!(state.winner, creator);
        assert!(!state.is_draw);
        assert_eq!(state.total_pot, 0);
        assert_eq!(plan.creator_lamports, 200_000_000);
        assert_eq!(plan.opponent_lamports, 0);
        assert_eq!(settled_ev.creator_payout, 200_000_000);
    }

    #[test]
    fn finalize_battle_draw_splits_pot_50_50() {
        let creator = sample_pubkey(1);
        let opponent = sample_pubkey(2);
        let authority = sample_pubkey(9);
        let stake = 50_000_000;

        let (mut state, _) = process_create_battle(
            "battle_draw_001".to_string(),
            creator,
            authority,
            stake,
            2000,
            1000,
            255,
            254,
        )
        .unwrap();

        process_join_battle(&mut state, opponent, 1100).unwrap();

        let (plan, settled_ev) = process_finalize_battle(
            &mut state,
            authority,
            creator,
            opponent,
            BattleOutcome::Draw,
            1400,
        )
        .expect("draw settlement should succeed");

        assert_eq!(state.status, BattleEscrowStatus::Settled);
        assert!(state.is_draw);
        assert_eq!(state.winner, Pubkey::default());
        assert_eq!(plan.creator_lamports, 50_000_000);
        assert_eq!(plan.opponent_lamports, 50_000_000);
        assert_eq!(settled_ev.creator_payout, 50_000_000);
        assert_eq!(settled_ev.opponent_payout, 50_000_000);
    }

    #[test]
    fn creator_can_cancel_before_opponent_joins_and_cannot_cancel_after_funded() {
        let creator = sample_pubkey(1);
        let opponent = sample_pubkey(2);
        let authority = sample_pubkey(9);
        let stake = 75_000_000;

        let (mut state, _) = process_create_battle(
            "battle_cancel_01".to_string(),
            creator,
            authority,
            stake,
            2000,
            1000,
            255,
            254,
        )
        .unwrap();

        // Unauthorized non-creator cannot cancel
        assert_eq!(
            process_cancel_battle(&mut state, opponent, 1050),
            Err(EscrowError::UnauthorizedCreator)
        );

        // Authorized creator cancels and receives full refund
        let (plan, cancel_ev) =
            process_cancel_battle(&mut state, creator, 1050).expect("creator cancel should pass");
        assert_eq!(state.status, BattleEscrowStatus::Cancelled);
        assert_eq!(state.total_pot, 0);
        assert_eq!(plan.creator_lamports, stake);
        assert_eq!(cancel_ev.refunded_amount, stake);

        // Cannot cancel twice
        assert_eq!(
            process_cancel_battle(&mut state, creator, 1060),
            Err(EscrowError::InvalidBattleStatus)
        );
    }

    #[test]
    fn expired_funded_battle_can_be_refunded_only_after_expiry() {
        let creator = sample_pubkey(1);
        let opponent = sample_pubkey(2);
        let authority = sample_pubkey(9);
        let stake = 120_000_000;

        let (mut state, _) = process_create_battle(
            "battle_expire_01".to_string(),
            creator,
            authority,
            stake,
            2000,
            1000,
            255,
            254,
        )
        .unwrap();

        process_join_battle(&mut state, opponent, 1200).unwrap();

        // Premature refund before expiry_ts (2000) is rejected
        assert_eq!(
            process_refund_expired_battle(&mut state, creator, opponent, 1999),
            Err(EscrowError::BattleNotExpired)
        );

        // Refund after expiry_ts (2001) refunds both players
        let (plan, refund_ev) =
            process_refund_expired_battle(&mut state, creator, opponent, 2001).unwrap();
        assert_eq!(state.status, BattleEscrowStatus::Refunded);
        assert_eq!(state.total_pot, 0);
        assert_eq!(plan.creator_lamports, stake);
        assert_eq!(plan.opponent_lamports, stake);
        assert_eq!(refund_ev.creator_refund, stake);
        assert_eq!(refund_ev.opponent_refund, stake);
    }

    #[test]
    fn rejects_self_play_unauthorized_authority_and_double_settlement() {
        let creator = sample_pubkey(1);
        let opponent = sample_pubkey(2);
        let attacker = sample_pubkey(8);
        let authority = sample_pubkey(9);
        let stake = 100_000_000;

        let (mut state, _) = process_create_battle(
            "battle_sec_01".to_string(),
            creator,
            authority,
            stake,
            2000,
            1000,
            255,
            254,
        )
        .unwrap();

        // Self-play rejected
        assert_eq!(
            process_join_battle(&mut state, creator, 1100),
            Err(EscrowError::SelfPlayNotAllowed)
        );

        process_join_battle(&mut state, opponent, 1100).unwrap();

        // Unauthorized authority rejected
        assert_eq!(
            process_finalize_battle(
                &mut state,
                attacker,
                creator,
                opponent,
                BattleOutcome::OpponentWins,
                1300
            ),
            Err(EscrowError::UnauthorizedSettlementAuthority)
        );

        // Wrong participant destination account rejected
        assert_eq!(
            process_finalize_battle(
                &mut state,
                authority,
                attacker,
                opponent,
                BattleOutcome::OpponentWins,
                1300
            ),
            Err(EscrowError::InvalidParticipantAccount)
        );

        // Authorized settlement succeeds once
        process_finalize_battle(
            &mut state,
            authority,
            creator,
            opponent,
            BattleOutcome::OpponentWins,
            1300,
        )
        .unwrap();

        // Double settlement rejected
        assert_eq!(
            process_finalize_battle(
                &mut state,
                authority,
                creator,
                opponent,
                BattleOutcome::OpponentWins,
                1305
            ),
            Err(EscrowError::InvalidBattleStatus)
        );
    }
}
