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
