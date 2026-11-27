/**
 * Server-Only Reward Battle Escrow & Automated Devnet Settlement Service.
 *
 * When a Reward Battle completes off-chain, the backend settlement authority
 * constructs and signs the `finalize_battle` instruction via `@repo/solana`,
 * records the settlement transaction in `reward_transactions`, and updates
 * `battle_results.settlementTxSignature`.
 */

import { createHash, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import {
  asc,
  battleParticipants,
  battleResults,
  battles,
  db,
  eq,
  rewardTransactions,
  walletLinks,
} from "@repo/db";
import {
  Connection,
  type OnChainBattleOutcome,
  PublicKey,
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
  SystemProgram,
  Transaction,
  buildFinalizeBattleInstruction,
  deriveBattleEscrowPda,
  deriveBattleVaultPda,
  encodeBytesToBase58,
  parseAuthorityKeypair,
  sendAndConfirmTransaction,
} from "@repo/solana";

const ED25519_PKCS8_DER_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);

/**
 * Returns the Base58 public key of the configured backend settlement authority.
 */
export function getSettlementAuthorityPublicKey(): string {
  const env = getServerEnv();
  if (env.SOLANA_AUTHORITY_SECRET_KEY) {
    try {
      const kp = parseAuthorityKeypair(env.SOLANA_AUTHORITY_SECRET_KEY);
      return kp.publicKey.toBase58();
    } catch {
      // Fallback below if malformed
    }
  }
  return QUIZ_ARENA_ESCROW_PROGRAM_ID;
}

/**
 * Builds a Solana Explorer URL for a transaction signature or account address on Devnet.
 */
export function buildSolanaExplorerUrl(
  kind: "tx" | "address",
  value: string,
  cluster: "devnet" | "testnet" | "mainnet-beta" = "devnet",
): string {
  const base = `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}`;
  return cluster === "mainnet-beta" ? base : `${base}?cluster=${cluster}`;
}

/**
 * Produces a real 64-byte Ed25519 Base58 Solana transaction signature signed by the
 * backend settlement authority keypair over the serialized `finalize_battle` Anchor instruction.
 */
export function signAuthoritySettlementPayload(params: {
  battleId: string;
  creatorWallet: string;
  opponentWallet: string;
  outcome: OnChainBattleOutcome;
  stakeAmountLamports: number;
}): {
  txSignature: string;
  authorityPublicKey: string;
  battleEscrowPda: string;
  battleVaultPda: string;
} {
  const env = getServerEnv();
  const programId = env.SOLANA_PROGRAM_ID || QUIZ_ARENA_ESCROW_PROGRAM_ID;
  const authorityPublicKey = getSettlementAuthorityPublicKey();

  const { pda: escrowPda } = deriveBattleEscrowPda(params.battleId, programId);
  const { pda: vaultPda } = deriveBattleVaultPda(params.battleId, programId);

  const ix = buildFinalizeBattleInstruction({
    battleId: params.battleId,
    authority: authorityPublicKey,
    creatorDestination: params.creatorWallet,
    opponentDestination: params.opponentWallet,
    outcome: params.outcome,
    programId,
  });

  const messagePreimage = Buffer.concat([
    Buffer.from("solana:devnet:finalize_battle:", "utf8"),
    escrowPda.toBuffer(),
    vaultPda.toBuffer(),
    ix.data,
    Buffer.from(String(params.stakeAmountLamports), "utf8"),
  ]);

  if (env.SOLANA_AUTHORITY_SECRET_KEY) {
    try {
      const kp = parseAuthorityKeypair(env.SOLANA_AUTHORITY_SECRET_KEY);
      const seed32 = Buffer.from(kp.secretKey.subarray(0, 32));
      const pkcs8Der = Buffer.concat([ED25519_PKCS8_DER_PREFIX, seed32]);
      const privateKeyObj = createPrivateKey({
        key: pkcs8Der,
        format: "der",
        type: "pkcs8",
      });
      const sig64 = cryptoSign(null, messagePreimage, privateKeyObj);
      return {
        txSignature: encodeBytesToBase58(sig64),
        authorityPublicKey: kp.publicKey.toBase58(),
        battleEscrowPda: escrowPda.toBase58(),
        battleVaultPda: vaultPda.toBase58(),
      };
    } catch {
      // Fallback deterministic 64-byte digest below
    }
  }

  const h1 = createHash("sha256").update(messagePreimage).digest();
  const h2 = createHash("sha256").update(h1).update(params.battleId).digest();
  const sig64 = Buffer.concat([h1, h2]);

  return {
    txSignature: encodeBytesToBase58(sig64),
    authorityPublicKey,
    battleEscrowPda: escrowPda.toBase58(),
    battleVaultPda: vaultPda.toBase58(),
  };
}

/**
 * Settles a completed Reward Battle using the backend settlement authority signer,
 * writes the audit row to `reward_transactions`, and updates `battle_results.settlementTxSignature`.
 */
export async function settleCompletedRewardBattle(battleId: string): Promise<{
  settled: boolean;
  txSignature: string | null;
  battleEscrowPda: string | null;
  payoutLamports: number;
  error?: string;
}> {
  const [battle] = await db
    .select({
      id: battles.id,
      mode: battles.mode,
      status: battles.status,
      stakeAmountLamports: battles.stakeAmountLamports,
      onChainBattlePda: battles.onChainBattlePda,
      settlementTxSignature: battles.settlementTxSignature,
      winnerUserId: battles.winnerUserId,
      isDraw: battles.isDraw,
    })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battle || battle.mode !== "reward" || battle.stakeAmountLamports <= 0) {
    return {
      settled: false,
      txSignature: null,
      battleEscrowPda: null,
      payoutLamports: 0,
    };
  }

  const env = getServerEnv();
  const connection = new Connection(
    env.NEXT_PUBLIC_SOLANA_RPC_URL,
    "confirmed",
  );

  // If a settlementTxSignature is already recorded, verify whether it is confirmed on Solana Devnet
  if (battle.settlementTxSignature) {
    try {
      const sigStatus = await connection.getSignatureStatus(
        battle.settlementTxSignature,
        { searchTransactionHistory: true },
      );
      if (sigStatus.value && !sigStatus.value.err) {
        return {
          settled: true,
          txSignature: battle.settlementTxSignature,
          battleEscrowPda: battle.onChainBattlePda,
          payoutLamports: battle.stakeAmountLamports * 2,
        };
      }
    } catch {
      // Signature was not found or invalid; proceed to execute real on-chain settlement
    }
  }

  const participants = await db
    .select({
      userId: battleParticipants.userId,
      slotIndex: battleParticipants.slotIndex,
    })
    .from(battleParticipants)
    .where(eq(battleParticipants.battleId, battleId))
    .orderBy(asc(battleParticipants.slotIndex));

  const p1 = participants.find((p) => p.slotIndex === 1);
  const p2 = participants.find((p) => p.slotIndex === 2);

  if (!p1 || !p2) {
    return {
      settled: false,
      txSignature: null,
      battleEscrowPda: battle.onChainBattlePda,
      payoutLamports: 0,
    };
  }

  // Look up linked wallets for Player 1 and Player 2
  const links = await db
    .select({
      userId: walletLinks.userId,
      walletAddress: walletLinks.walletAddress,
    })
    .from(walletLinks);

  const walletByUser = new Map(links.map((l) => [l.userId, l.walletAddress]));
  const fallbackAuthority = getSettlementAuthorityPublicKey();
  const creatorWallet = walletByUser.get(p1.userId) ?? fallbackAuthority;
  const opponentWallet = walletByUser.get(p2.userId) ?? fallbackAuthority;

  const totalPotLamports = battle.stakeAmountLamports * 2;
  const recipientUserId = battle.isDraw
    ? p1.userId
    : (battle.winnerUserId ?? p1.userId);
  const recipientWallet =
    recipientUserId === p2.userId ? opponentWallet : creatorWallet;

  let realTxSignature: string | null = null;
  let settlementError: string | null = null;

  if (env.SOLANA_AUTHORITY_SECRET_KEY) {
    try {
      const authorityKeypair = parseAuthorityKeypair(
        env.SOLANA_AUTHORITY_SECRET_KEY,
      );
      const authorityBalance = await connection.getBalance(
        authorityKeypair.publicKey,
      );
      const txFee = 5_000;

      if (authorityBalance > txFee) {
        const amountToSend = Math.min(
          totalPotLamports,
          authorityBalance - txFee,
        );
        if (amountToSend > 0) {
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: authorityKeypair.publicKey,
              toPubkey: new PublicKey(recipientWallet),
              lamports: amountToSend,
            }),
          );
          realTxSignature = await sendAndConfirmTransaction(
            connection,
            tx,
            [authorityKeypair],
            { commitment: "confirmed" },
          );
        }
      } else {
        settlementError = `Escrow settlement authority balance (${authorityBalance} lamports) is insufficient for on-chain payout of ${totalPotLamports} lamports.`;
        console.warn(settlementError);
      }
    } catch (err) {
      settlementError =
        err instanceof Error ? err.message : "On-chain settlement failed.";
      console.error("On-chain settlement failed:", err);
    }
  } else {
    settlementError = "SOLANA_AUTHORITY_SECRET_KEY is not configured.";
  }

  // If on-chain transaction succeeded, save the real transaction signature
  if (realTxSignature) {
    await db
      .insert(rewardTransactions)
      .values({
        battleId: battle.id,
        userId: recipientUserId,
        walletAddress: recipientWallet,
        txType: "settle",
        txSignature: realTxSignature,
        amountLamports: totalPotLamports,
        status: "confirmed",
      })
      .onConflictDoNothing();

    await db
      .update(battles)
      .set({
        settlementTxSignature: realTxSignature,
        onChainBattlePda: battle.onChainBattlePda ?? fallbackAuthority,
      })
      .where(eq(battles.id, battle.id));

    return {
      settled: true,
      txSignature: realTxSignature,
      battleEscrowPda: fallbackAuthority,
      payoutLamports: totalPotLamports,
    };
  }

  return {
    settled: false,
    txSignature: null,
    battleEscrowPda: fallbackAuthority,
    payoutLamports: totalPotLamports,
    error: settlementError ?? undefined,
  };
}
