/**
 * Client-Safe Solana Transaction & Instruction Builders for Reward Battles.
 *
 * SECURITY (Rule 3):
 * - This module never imports, touches, or exposes the backend settlement authority private key.
 * - Used by player wallets to deposit (`create_battle`, `join_battle`), cancel (`cancel_battle`),
 *   or reclaim timed-out stakes (`refund_expired_battle`).
 */

import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  INSTRUCTION_DISCRIMINATORS,
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
} from "./idl";
import {
  deriveBattleEscrowPda,
  deriveBattleVaultPda,
  normalizeBattleIdToSeed,
} from "./pda";

export interface BuildCreateBattleParams {
  battleId: string;
  creator: PublicKey | string;
  authority: PublicKey | string;
  stakeAmountLamports: number;
  expiryTs: number;
  programId?: PublicKey | string;
}

export interface BuildJoinBattleParams {
  battleId: string;
  opponent: PublicKey | string;
  programId?: PublicKey | string;
}

export interface BuildCancelBattleParams {
  battleId: string;
  creator: PublicKey | string;
  programId?: PublicKey | string;
}

export interface BuildRefundExpiredBattleParams {
  battleId: string;
  caller: PublicKey | string;
  creatorDestination: PublicKey | string;
  opponentDestination: PublicKey | string;
  programId?: PublicKey | string;
}

function toPubkey(key: PublicKey | string): PublicKey {
  return typeof key === "string" ? new PublicKey(key) : key;
}

/**
 * Serializes arguments for `create_battle(battle_seed: String, stake_amount: u64, expiry_ts: i64)`.
 */
export function serializeCreateBattleArgs(
  battleId: string,
  stakeAmountLamports: number,
  expiryTs: number
): Buffer {
  if (stakeAmountLamports <= 0 || !Number.isInteger(stakeAmountLamports)) {
    throw new Error("stakeAmountLamports must be a positive integer.");
  }
  const battleSeed = normalizeBattleIdToSeed(battleId);
  const seedBytes = Buffer.from(battleSeed, "utf8");

  // 8 (discriminator) + 4 (u32 string length) + seedBytes.length + 8 (u64 stake) + 8 (i64 expiry)
  const buf = Buffer.alloc(8 + 4 + seedBytes.length + 8 + 8);
  let offset = 0;

  INSTRUCTION_DISCRIMINATORS.createBattle.copy(buf, offset);
  offset += 8;

  buf.writeUInt32LE(seedBytes.length, offset);
  offset += 4;

  seedBytes.copy(buf, offset);
  offset += seedBytes.length;

  buf.writeBigUInt64LE(BigInt(stakeAmountLamports), offset);
  offset += 8;

  buf.writeBigInt64LE(BigInt(expiryTs), offset);

  return buf;
}

/**
 * Builds the `create_battle` Anchor `TransactionInstruction`.
 */
export function buildCreateBattleInstruction(
  params: BuildCreateBattleParams
): TransactionInstruction {
  const programPubkey = toPubkey(
    params.programId ?? QUIZ_ARENA_ESCROW_PROGRAM_ID
  );
  const creatorPubkey = toPubkey(params.creator);
  const authorityPubkey = toPubkey(params.authority);

  const { pda: battleEscrowPda } = deriveBattleEscrowPda(
    params.battleId,
    programPubkey
  );
  const { pda: battleVaultPda } = deriveBattleVaultPda(
    params.battleId,
    programPubkey
  );

  const data = serializeCreateBattleArgs(
    params.battleId,
    params.stakeAmountLamports,
    params.expiryTs
  );

  return new TransactionInstruction({
    programId: programPubkey,
    keys: [
      { pubkey: creatorPubkey, isSigner: true, isWritable: true },
      { pubkey: authorityPubkey, isSigner: false, isWritable: false },
      { pubkey: battleEscrowPda, isSigner: false, isWritable: true },
      { pubkey: battleVaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Builds the `join_battle` Anchor `TransactionInstruction`.
 */
export function buildJoinBattleInstruction(
  params: BuildJoinBattleParams
): TransactionInstruction {
  const programPubkey = toPubkey(
    params.programId ?? QUIZ_ARENA_ESCROW_PROGRAM_ID
  );
  const opponentPubkey = toPubkey(params.opponent);

  const { pda: battleEscrowPda } = deriveBattleEscrowPda(
    params.battleId,
    programPubkey
  );
  const { pda: battleVaultPda } = deriveBattleVaultPda(
    params.battleId,
    programPubkey
  );

  return new TransactionInstruction({
    programId: programPubkey,
    keys: [
      { pubkey: opponentPubkey, isSigner: true, isWritable: true },
      { pubkey: battleEscrowPda, isSigner: false, isWritable: true },
      { pubkey: battleVaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(INSTRUCTION_DISCRIMINATORS.joinBattle),
  });
}

/**
 * Builds the `cancel_battle` Anchor `TransactionInstruction`.
 */
export function buildCancelBattleInstruction(
  params: BuildCancelBattleParams
): TransactionInstruction {
  const programPubkey = toPubkey(
    params.programId ?? QUIZ_ARENA_ESCROW_PROGRAM_ID
  );
  const creatorPubkey = toPubkey(params.creator);

  const { pda: battleEscrowPda } = deriveBattleEscrowPda(
    params.battleId,
    programPubkey
  );
  const { pda: battleVaultPda } = deriveBattleVaultPda(
    params.battleId,
    programPubkey
  );

  return new TransactionInstruction({
    programId: programPubkey,
    keys: [
      { pubkey: creatorPubkey, isSigner: true, isWritable: true },
      { pubkey: battleEscrowPda, isSigner: false, isWritable: true },
      { pubkey: battleVaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(INSTRUCTION_DISCRIMINATORS.cancelBattle),
  });
}

/**
 * Builds the `refund_expired_battle` Anchor `TransactionInstruction`.
 */
export function buildRefundExpiredBattleInstruction(
  params: BuildRefundExpiredBattleParams
): TransactionInstruction {
  const programPubkey = toPubkey(
    params.programId ?? QUIZ_ARENA_ESCROW_PROGRAM_ID
  );
  const callerPubkey = toPubkey(params.caller);
  const creatorDestination = toPubkey(params.creatorDestination);
  const opponentDestination = toPubkey(params.opponentDestination);

  const { pda: battleEscrowPda } = deriveBattleEscrowPda(
    params.battleId,
    programPubkey
  );
  const { pda: battleVaultPda } = deriveBattleVaultPda(
    params.battleId,
    programPubkey
  );

  return new TransactionInstruction({
    programId: programPubkey,
    keys: [
      { pubkey: callerPubkey, isSigner: true, isWritable: true },
      { pubkey: battleEscrowPda, isSigner: false, isWritable: true },
      { pubkey: battleVaultPda, isSigner: false, isWritable: true },
      { pubkey: creatorDestination, isSigner: false, isWritable: true },
      { pubkey: opponentDestination, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(INSTRUCTION_DISCRIMINATORS.refundExpiredBattle),
  });
}

/**
 * Wraps an instruction into a ready-to-sign Solana `Transaction` with feePayer and recentBlockhash.
 */
export function wrapInstructionInTransaction(params: {
  instruction: TransactionInstruction;
  feePayer: PublicKey | string;
  recentBlockhash: string;
}): Transaction {
  const tx = new Transaction();
  tx.recentBlockhash = params.recentBlockhash;
  tx.feePayer = toPubkey(params.feePayer);
  tx.add(params.instruction);
  return tx;
}
