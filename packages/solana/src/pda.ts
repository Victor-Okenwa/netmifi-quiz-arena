/**
 * Deterministic Program-Derived Address (PDA) derivation helpers for
 * `BattleEscrowState` and `BattleVault`.
 *
 * Matches the exact Rust PDA seed specification in `programs/quiz-arena-escrow/src/lib.rs`:
 * - BattleEscrowState: `[b"battle", battle_seed.as_bytes()]`
 * - BattleVault:       `[b"battle_vault", battle_seed.as_bytes()]`
 */

import { PublicKey } from "@solana/web3.js";
import {
  BATTLE_ESCROW_SEED_PREFIX,
  BATTLE_VAULT_SEED_PREFIX,
  MAX_BATTLE_SEED_LEN,
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
} from "./idl";

export interface DerivedBattlePda {
  pda: PublicKey;
  bump: number;
  battleSeed: string;
}

/**
 * Normalizes a battle UUID or identifier into a canonical 1..=32 ASCII byte PDA seed.
 * Strips hyphens from standard 36-char UUIDs so they fit Solana's 32-byte single seed limit.
 */
export function normalizeBattleIdToSeed(rawBattleId: string): string {
  const compact = rawBattleId.trim().replace(/-/g, "");
  const byteLen = Buffer.byteLength(compact, "utf8");
  if (byteLen === 0 || byteLen > MAX_BATTLE_SEED_LEN) {
    throw new Error(
      `Invalid battle seed length (${byteLen} bytes): must be between 1 and ${MAX_BATTLE_SEED_LEN} bytes after stripping hyphens.`
    );
  }
  return compact;
}

function resolveProgramPublicKey(programId?: PublicKey | string): PublicKey {
  if (!programId) {
    return new PublicKey(QUIZ_ARENA_ESCROW_PROGRAM_ID);
  }
  return typeof programId === "string" ? new PublicKey(programId) : programId;
}

/**
 * Derives the deterministic `BattleEscrowState` PDA (`[b"battle", battle_seed]`).
 */
export function deriveBattleEscrowPda(
  battleId: string,
  programId?: PublicKey | string
): DerivedBattlePda {
  const battleSeed = normalizeBattleIdToSeed(battleId);
  const programPubkey = resolveProgramPublicKey(programId);

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(BATTLE_ESCROW_SEED_PREFIX, "utf8"),
      Buffer.from(battleSeed, "utf8"),
    ],
    programPubkey
  );

  return { pda, bump, battleSeed };
}

/**
 * Derives the deterministic `BattleVault` PDA (`[b"battle_vault", battle_seed]`)
 * that holds participant lamport stakes in escrow.
 */
export function deriveBattleVaultPda(
  battleId: string,
  programId?: PublicKey | string
): DerivedBattlePda {
  const battleSeed = normalizeBattleIdToSeed(battleId);
  const programPubkey = resolveProgramPublicKey(programId);

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(BATTLE_VAULT_SEED_PREFIX, "utf8"),
      Buffer.from(battleSeed, "utf8"),
    ],
    programPubkey
  );

  return { pda, bump, battleSeed };
}

/**
 * Validates whether a string is a syntactically valid 32-byte Base58 Solana PublicKey.
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    const pk = new PublicKey(address.trim());
    return pk.toBytes().length === 32;
  } catch {
    return false;
  }
}

/**
 * Converts a Base58 Solana address into its raw 32-byte Buffer.
 */
export function solanaAddressToBytes(address: string): Buffer {
  return Buffer.from(new PublicKey(address.trim()).toBytes());
}

/**
 * Encodes a raw 32-byte or 64-byte buffer into Base58 using Solana's PublicKey / bs58 alphabet.
 */
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBytesToBase58(bytes: Uint8Array | Buffer): string {
  if (bytes.length === 32) {
    return new PublicKey(bytes).toBase58();
  }
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; ++j) {
      carry += (digits[j] ?? 0) << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let leadingZeros = "";
  for (let k = 0; k < bytes.length && bytes[k] === 0; ++k) {
    leadingZeros += "1";
  }
  return (
    leadingZeros +
    digits
      .reverse()
      .map((d) => BASE58_ALPHABET[d] ?? "1")
      .join("")
  );
}
