/**
 * Anchor IDL, Program Constants, Discriminators, and Error Definitions
 * for the Netmifi Quiz Arena Reward Escrow Program (`quiz_arena_escrow`).
 */

import { createHash } from "node:crypto";

export const QUIZ_ARENA_ESCROW_PROGRAM_ID =
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS" as const;

export const BATTLE_ESCROW_SEED_PREFIX = "battle" as const;
export const BATTLE_VAULT_SEED_PREFIX = "battle_vault" as const;
export const MAX_BATTLE_SEED_LEN = 32 as const;

export type OnChainBattleEscrowStatus =
  "Created" | "Funded" | "Settled" | "Cancelled" | "Refunded";

export const BATTLE_ESCROW_STATUS_FROM_CODE: Record<
  number,
  OnChainBattleEscrowStatus
> = {
  0: "Created",
  1: "Funded",
  2: "Settled",
  3: "Cancelled",
  4: "Refunded",
};

export const BATTLE_ESCROW_STATUS_TO_CODE: Record<
  OnChainBattleEscrowStatus,
  number
> = {
  Created: 0,
  Funded: 1,
  Settled: 2,
  Cancelled: 3,
  Refunded: 4,
};

export type OnChainBattleOutcome = "CreatorWins" | "OpponentWins" | "Draw";

export const BATTLE_OUTCOME_TO_CODE: Record<OnChainBattleOutcome, number> = {
  CreatorWins: 0,
  OpponentWins: 1,
  Draw: 2,
};

export const BATTLE_OUTCOME_FROM_CODE: Record<number, OnChainBattleOutcome> = {
  0: "CreatorWins",
  1: "OpponentWins",
  2: "Draw",
};

export interface EscrowProgramConfig {
  network: "devnet" | "localnet" | "testnet" | "mainnet-beta";
  rpcUrl: string;
  programId: string;
}

/**
 * Computes an 8-byte Anchor discriminator: `sha256("${namespace}:${name}")[0..8]`.
 */
export function computeAnchorDiscriminator(
  namespace: "global" | "account" | "event",
  name: string,
): Buffer {
  const hash = createHash("sha256").update(`${namespace}:${name}`).digest();
  return Buffer.from(hash.subarray(0, 8));
}

export const INSTRUCTION_DISCRIMINATORS = {
  createBattle: computeAnchorDiscriminator("global", "create_battle"),
  joinBattle: computeAnchorDiscriminator("global", "join_battle"),
  finalizeBattle: computeAnchorDiscriminator("global", "finalize_battle"),
  cancelBattle: computeAnchorDiscriminator("global", "cancel_battle"),
  refundExpiredBattle: computeAnchorDiscriminator(
    "global",
    "refund_expired_battle",
  ),
} as const;

export const BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR = computeAnchorDiscriminator(
  "account",
  "BattleEscrowState",
);

export const QUIZ_ARENA_ESCROW_IDL = {
  address: QUIZ_ARENA_ESCROW_PROGRAM_ID,
  metadata: {
    name: "quiz_arena_escrow",
    version: "0.1.0",
    spec: "0.1.0",
    description:
      "Netmifi Quiz Arena — Solana Devnet Reward Battle Escrow & Settlement Program",
  },
  instructions: [
    {
      name: "create_battle",
      discriminator: Array.from(INSTRUCTION_DISCRIMINATORS.createBattle),
      accounts: [
        { name: "creator", writable: true, signer: true },
        { name: "authority", writable: false, signer: false },
        { name: "battle_escrow", writable: true, signer: false },
        { name: "battle_vault", writable: true, signer: false },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [
        { name: "battle_seed", type: "string" },
        { name: "stake_amount", type: "u64" },
        { name: "expiry_ts", type: "i64" },
      ],
    },
    {
      name: "join_battle",
      discriminator: Array.from(INSTRUCTION_DISCRIMINATORS.joinBattle),
      accounts: [
        { name: "opponent", writable: true, signer: true },
        { name: "battle_escrow", writable: true, signer: false },
        { name: "battle_vault", writable: true, signer: false },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [],
    },
    {
      name: "finalize_battle",
      discriminator: Array.from(INSTRUCTION_DISCRIMINATORS.finalizeBattle),
      accounts: [
        { name: "authority", writable: false, signer: true },
        { name: "battle_escrow", writable: true, signer: false },
        { name: "battle_vault", writable: true, signer: false },
        { name: "creator_destination", writable: true, signer: false },
        { name: "opponent_destination", writable: true, signer: false },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [{ name: "outcome", type: { defined: "BattleOutcome" } }],
    },
    {
      name: "cancel_battle",
      discriminator: Array.from(INSTRUCTION_DISCRIMINATORS.cancelBattle),
      accounts: [
        { name: "creator", writable: true, signer: true },
        { name: "battle_escrow", writable: true, signer: false },
        { name: "battle_vault", writable: true, signer: false },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [],
    },
    {
      name: "refund_expired_battle",
      discriminator: Array.from(INSTRUCTION_DISCRIMINATORS.refundExpiredBattle),
      accounts: [
        { name: "caller", writable: true, signer: true },
        { name: "battle_escrow", writable: true, signer: false },
        { name: "battle_vault", writable: true, signer: false },
        { name: "creator_destination", writable: true, signer: false },
        { name: "opponent_destination", writable: true, signer: false },
        { name: "system_program", writable: false, signer: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "BattleEscrowState",
      discriminator: Array.from(BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR),
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidBattleSeedLength",
      msg: "Battle seed must be between 1 and 32 ASCII bytes.",
    },
    {
      code: 6001,
      name: "ZeroStakeAmount",
      msg: "Stake amount must be strictly greater than zero lamports.",
    },
    {
      code: 6002,
      name: "InvalidExpiryTimestamp",
      msg: "Expiry timestamp must be in the future relative to cluster time.",
    },
    {
      code: 6003,
      name: "BattleAlreadyJoined",
      msg: "Battle already has an opponent enrolled.",
    },
    {
      code: 6004,
      name: "SelfPlayNotAllowed",
      msg: "Creator cannot join their own battle as opponent.",
    },
    {
      code: 6005,
      name: "BattleExpired",
      msg: "Battle has already passed its expiry timestamp.",
    },
    {
      code: 6006,
      name: "BattleNotExpired",
      msg: "Battle has not yet expired; timeout refund is unavailable.",
    },
    {
      code: 6007,
      name: "InvalidBattleStatus",
      msg: "Battle escrow status does not permit this instruction.",
    },
    {
      code: 6008,
      name: "UnauthorizedSettlementAuthority",
      msg: "Signer does not match the authorized backend settlement authority.",
    },
    {
      code: 6009,
      name: "UnauthorizedCreator",
      msg: "Signer does not match the battle creator.",
    },
    {
      code: 6010,
      name: "InvalidParticipantAccount",
      msg: "Provided destination account does not match recorded participant pubkey.",
    },
    {
      code: 6011,
      name: "ArithmeticOverflow",
      msg: "Checked integer arithmetic overflow or underflow.",
    },
    {
      code: 6012,
      name: "InsufficientEscrowBalance",
      msg: "Escrow vault balance is insufficient for settlement transfer.",
    },
  ],
} as const;

export type QuizArenaEscrowIDL = typeof QUIZ_ARENA_ESCROW_IDL;
