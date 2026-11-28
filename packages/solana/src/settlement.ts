/**
 * SERVER-ONLY Backend Settlement Authority Builders & Devnet Settlement Executor.
 *
 * SECURITY (Rule 3):
 * - Only the authorized backend authority signer can invoke `finalize_battle`.
 * - Never expose `SOLANA_AUTHORITY_SECRET_KEY` to client components.
 */

import {
  type Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  BATTLE_OUTCOME_TO_CODE,
  INSTRUCTION_DISCRIMINATORS,
  type OnChainBattleOutcome,
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
} from "./idl";
import { deriveBattleEscrowPda, deriveBattleVaultPda } from "./pda";

export interface BuildFinalizeBattleParams {
  battleId: string;
  authority: PublicKey | string;
  creatorDestination: PublicKey | string;
  opponentDestination: PublicKey | string;
  outcome: OnChainBattleOutcome;
  programId?: PublicKey | string;
}

export interface ExecuteFinalizeBattleParams {
  connection: Connection;
  authorityKeypair: Keypair;
  battleId: string;
  creatorDestination: PublicKey | string;
  opponentDestination: PublicKey | string;
  outcome: OnChainBattleOutcome;
  programId?: PublicKey | string;
}

function toPubkey(key: PublicKey | string): PublicKey {
  return typeof key === "string" ? new PublicKey(key) : key;
}

/**
 * Serializes `finalize_battle(outcome: BattleOutcome)` instruction data
 * (8-byte discriminator + 1-byte Borsh enum variant index).
 */
export function serializeFinalizeBattleArgs(
  outcome: OnChainBattleOutcome,
): Buffer {
  const code = BATTLE_OUTCOME_TO_CODE[outcome];
  if (code === undefined) {
    throw new Error(`Invalid BattleOutcome variant: ${String(outcome)}`);
  }

  const buf = Buffer.alloc(9);
  INSTRUCTION_DISCRIMINATORS.finalizeBattle.copy(buf, 0);
  buf.writeUInt8(code, 8);
  return buf;
}

/**
 * Builds the `finalize_battle` Anchor `TransactionInstruction` requiring the backend authority `Signer`.
 */
export function buildFinalizeBattleInstruction(
  params: BuildFinalizeBattleParams,
): TransactionInstruction {
  const programPubkey = toPubkey(
    params.programId ?? QUIZ_ARENA_ESCROW_PROGRAM_ID,
  );
  const authorityPubkey = toPubkey(params.authority);
  const creatorDestination = toPubkey(params.creatorDestination);
  const opponentDestination = toPubkey(params.opponentDestination);

  const { pda: battleEscrowPda } = deriveBattleEscrowPda(
    params.battleId,
    programPubkey,
  );
  const { pda: battleVaultPda } = deriveBattleVaultPda(
    params.battleId,
    programPubkey,
  );

  return new TransactionInstruction({
    programId: programPubkey,
    keys: [
      { pubkey: authorityPubkey, isSigner: true, isWritable: false },
      { pubkey: battleEscrowPda, isSigner: false, isWritable: true },
      { pubkey: battleVaultPda, isSigner: false, isWritable: true },
      { pubkey: creatorDestination, isSigner: false, isWritable: true },
      { pubkey: opponentDestination, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: serializeFinalizeBattleArgs(params.outcome),
  });
}

/**
 * Parses a backend settlement authority `Keypair` from a JSON byte array string (`"[1,2,...]"`)
 * or comma-separated 64-byte secret key string.
 */
export function parseAuthorityKeypair(secretKeyInput: string): Keypair {
  if (typeof window !== "undefined") {
    throw new Error(
      "parseAuthorityKeypair must only be invoked on the server, never in browser code.",
    );
  }

  const trimmed = secretKeyInput.trim();
  if (!trimmed) {
    throw new Error("SOLANA_AUTHORITY_SECRET_KEY is empty.");
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as number[];
    if (!Array.isArray(parsed) || parsed.length !== 64) {
      throw new Error(
        `Invalid SOLANA_AUTHORITY_SECRET_KEY JSON array length: expected 64 bytes, got ${Array.isArray(parsed) ? parsed.length : "non-array"}.`,
      );
    }
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }

  const bytes = Buffer.from(trimmed, "base64");
  if (bytes.length === 64) {
    return Keypair.fromSecretKey(new Uint8Array(bytes));
  }

  throw new Error(
    "Unsupported SOLANA_AUTHORITY_SECRET_KEY format: provide a 64-byte JSON array or base64-encoded secret key.",
  );
}

/**
 * Submits and confirms the `finalize_battle` settlement transaction on Solana Devnet.
 */
export async function executeFinalizeBattleOnChain(
  params: ExecuteFinalizeBattleParams,
): Promise<{ txSignature: string; battleEscrowPda: string }> {
  if (typeof window !== "undefined") {
    throw new Error(
      "executeFinalizeBattleOnChain must only be executed on the server.",
    );
  }

  const ix = buildFinalizeBattleInstruction({
    battleId: params.battleId,
    authority: params.authorityKeypair.publicKey,
    creatorDestination: params.creatorDestination,
    opponentDestination: params.opponentDestination,
    outcome: params.outcome,
    programId: params.programId,
  });

  const { pda } = deriveBattleEscrowPda(params.battleId, params.programId);

  const tx = new Transaction().add(ix);
  const txSignature = await sendAndConfirmTransaction(
    params.connection,
    tx,
    [params.authorityKeypair],
    { commitment: "confirmed" },
  );

  return {
    txSignature,
    battleEscrowPda: pda.toBase58(),
  };
}
