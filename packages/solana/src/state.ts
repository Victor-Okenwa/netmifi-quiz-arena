/**
 * Binary Borsh Serialization & Deserialization for `BattleEscrowState`.
 * Matches the exact on-chain Anchor account layout in `programs/quiz-arena-escrow/src/lib.rs`.
 */

import { type Connection, PublicKey } from "@solana/web3.js";
import {
  BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR,
  BATTLE_ESCROW_STATUS_FROM_CODE,
  BATTLE_ESCROW_STATUS_TO_CODE,
  type OnChainBattleEscrowStatus,
} from "./idl";
import { deriveBattleEscrowPda, normalizeBattleIdToSeed } from "./pda";

export interface DecodedBattleEscrowState {
  battleSeed: string;
  creator: string;
  opponent: string;
  authority: string;
  stakeAmountLamports: number;
  totalPotLamports: number;
  status: OnChainBattleEscrowStatus;
  winner: string;
  isDraw: boolean;
  createdAt: number;
  fundedAt: number;
  expiryTs: number;
  settledAt: number;
  bump: number;
  vaultBump: number;
}

/**
 * Serializes a `DecodedBattleEscrowState` into an Anchor account buffer
 * (8-byte account discriminator + Borsh-encoded fields).
 */
export function encodeBattleEscrowState(
  state: DecodedBattleEscrowState,
): Buffer {
  const seedBytes = Buffer.from(
    normalizeBattleIdToSeed(state.battleSeed),
    "utf8",
  );
  // Layout size:
  // 8 (discriminator)
  // + 4 + seedBytes.length (Borsh String: u32 length prefix + UTF-8 bytes)
  // + 32 (creator) + 32 (opponent) + 32 (authority)
  // + 8 (stake_amount u64) + 8 (total_pot u64)
  // + 1 (status u8)
  // + 32 (winner)
  // + 1 (is_draw bool)
  // + 8 (created_at i64) + 8 (funded_at i64) + 8 (expiry_ts i64) + 8 (settled_at i64)
  // + 1 (bump u8) + 1 (vault_bump u8)
  const totalLen = 8 + 4 + seedBytes.length + 32 * 4 + 8 * 6 + 1 * 4;
  const buf = Buffer.alloc(totalLen);
  let offset = 0;

  // 1. 8-byte Anchor Account Discriminator
  BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR.copy(buf, offset);
  offset += 8;

  // 2. battle_seed (u32 LE length + UTF-8 bytes)
  buf.writeUInt32LE(seedBytes.length, offset);
  offset += 4;
  seedBytes.copy(buf, offset);
  offset += seedBytes.length;

  // 3. creator, opponent, authority pubkeys (32 bytes each)
  new PublicKey(state.creator).toBuffer().copy(buf, offset);
  offset += 32;
  new PublicKey(state.opponent).toBuffer().copy(buf, offset);
  offset += 32;
  new PublicKey(state.authority).toBuffer().copy(buf, offset);
  offset += 32;

  // 4. stake_amount & total_pot (u64 LE)
  buf.writeBigUInt64LE(BigInt(state.stakeAmountLamports), offset);
  offset += 8;
  buf.writeBigUInt64LE(BigInt(state.totalPotLamports), offset);
  offset += 8;

  // 5. status enum (u8)
  buf.writeUInt8(BATTLE_ESCROW_STATUS_TO_CODE[state.status], offset);
  offset += 1;

  // 6. winner pubkey (32 bytes)
  new PublicKey(state.winner).toBuffer().copy(buf, offset);
  offset += 32;

  // 7. is_draw (u8 bool)
  buf.writeUInt8(state.isDraw ? 1 : 0, offset);
  offset += 1;

  // 8. timestamps: created_at, funded_at, expiry_ts, settled_at (i64 LE)
  buf.writeBigInt64LE(BigInt(state.createdAt), offset);
  offset += 8;
  buf.writeBigInt64LE(BigInt(state.fundedAt), offset);
  offset += 8;
  buf.writeBigInt64LE(BigInt(state.expiryTs), offset);
  offset += 8;
  buf.writeBigInt64LE(BigInt(state.settledAt), offset);
  offset += 8;

  // 9. bump & vault_bump (u8)
  buf.writeUInt8(state.bump & 0xff, offset);
  offset += 1;
  buf.writeUInt8(state.vaultBump & 0xff, offset);

  return buf;
}

/**
 * Deserializes an on-chain `BattleEscrowState` account buffer and verifies its Anchor discriminator.
 */
export function decodeBattleEscrowState(
  rawData: Uint8Array | Buffer,
): DecodedBattleEscrowState {
  const buf = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);

  if (buf.length < 12) {
    throw new Error(
      `Invalid BattleEscrowState account data: buffer too short (${buf.length} bytes).`,
    );
  }

  const actualDisc = buf.subarray(0, 8);
  if (!actualDisc.equals(BATTLE_ESCROW_ACCOUNT_DISCRIMINATOR)) {
    throw new Error(
      "Invalid BattleEscrowState account discriminator: data does not belong to BattleEscrowState.",
    );
  }

  let offset = 8;
  const seedLen = buf.readUInt32LE(offset);
  offset += 4;

  if (seedLen === 0 || seedLen > 32 || buf.length < offset + seedLen + 180) {
    throw new Error(
      `Corrupted BattleEscrowState account layout (seedLen=${seedLen}, totalLen=${buf.length}).`,
    );
  }

  const battleSeed = buf.subarray(offset, offset + seedLen).toString("utf8");
  offset += seedLen;

  const creator = new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const opponent = new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const authority = new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const stakeAmountLamports = Number(buf.readBigUInt64LE(offset));
  offset += 8;

  const totalPotLamports = Number(buf.readBigUInt64LE(offset));
  offset += 8;

  const statusCode = buf.readUInt8(offset);
  offset += 1;
  const status = BATTLE_ESCROW_STATUS_FROM_CODE[statusCode];
  if (!status) {
    throw new Error(`Invalid BattleEscrowStatus enum code: ${statusCode}`);
  }

  const winner = new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const isDraw = buf.readUInt8(offset) !== 0;
  offset += 1;

  const createdAt = Number(buf.readBigInt64LE(offset));
  offset += 8;

  const fundedAt = Number(buf.readBigInt64LE(offset));
  offset += 8;

  const expiryTs = Number(buf.readBigInt64LE(offset));
  offset += 8;

  const settledAt = Number(buf.readBigInt64LE(offset));
  offset += 8;

  const bump = buf.readUInt8(offset);
  offset += 1;

  const vaultBump = buf.readUInt8(offset);

  return {
    battleSeed,
    creator,
    opponent,
    authority,
    stakeAmountLamports,
    totalPotLamports,
    status,
    winner,
    isDraw,
    createdAt,
    fundedAt,
    expiryTs,
    settledAt,
    bump,
    vaultBump,
  };
}

/**
 * Fetches and decodes the `BattleEscrowState` account for a given battle ID from a Solana RPC connection.
 * Returns `null` if the PDA account has not yet been initialized on-chain.
 */
export async function fetchOnChainBattleEscrow(
  connection: Connection,
  battleId: string,
  programId?: PublicKey | string,
): Promise<DecodedBattleEscrowState | null> {
  const { pda } = deriveBattleEscrowPda(battleId, programId);
  const accountInfo = await connection.getAccountInfo(pda, "confirmed");
  if (!accountInfo || !accountInfo.data) {
    return null;
  }
  return decodeBattleEscrowState(accountInfo.data);
}
