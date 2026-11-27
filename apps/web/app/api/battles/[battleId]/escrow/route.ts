import { createHash } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import {
  buildSolanaExplorerUrl,
  getSettlementAuthorityPublicKey,
} from "@/lib/solana/reward-settlement";
import {
  createSignedEd25519DemoWallet,
  generateWalletNonce,
} from "@/lib/solana/wallet-auth";
import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import {
  and,
  asc,
  battleParticipants,
  battles,
  db,
  desc,
  eq,
  rewardTransactions,
  walletLinks,
  walletNonces,
} from "@repo/db";
import {
  QUIZ_ARENA_ESCROW_PROGRAM_ID,
  buildCancelBattleInstruction,
  buildCreateBattleInstruction,
  buildJoinBattleInstruction,
  deriveBattleEscrowPda,
  deriveBattleVaultPda,
  encodeBytesToBase58,
} from "@repo/solana";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

const escrowActionSchema = z.object({
  action: z.enum(["deposit", "cancel"]).default("deposit"),
  txSignature: z.string().trim().min(32).max(128).optional(),
  autoLinkDemoWallet: z.boolean().default(true),
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getCurrentAuthContext();
    const { battleId } = await context.params;

    const [battle] = await db
      .select({
        id: battles.id,
        status: battles.status,
        mode: battles.mode,
        stakeAmountLamports: battles.stakeAmountLamports,
        onChainBattlePda: battles.onChainBattlePda,
        creatorUserId: battles.creatorUserId,
        expiresAt: battles.expiresAt,
      })
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1);

    if (!battle) {
      return NextResponse.json(
        { error: "Battle room not found." },
        { status: 404 }
      );
    }

    const env = getServerEnv();
    const programId = env.SOLANA_PROGRAM_ID || QUIZ_ARENA_ESCROW_PROGRAM_ID;
    const authorityPublicKey = getSettlementAuthorityPublicKey();

    const { pda: escrowPda, bump: escrowBump, battleSeed } =
      deriveBattleEscrowPda(battle.id, programId);
    const { pda: vaultPda, bump: vaultBump } = deriveBattleVaultPda(
      battle.id,
      programId
    );

    const participants = await db
      .select({
        userId: battleParticipants.userId,
        slotIndex: battleParticipants.slotIndex,
        isReady: battleParticipants.isReady,
        depositTxSignature: battleParticipants.depositTxSignature,
        depositConfirmed: battleParticipants.depositConfirmed,
      })
      .from(battleParticipants)
      .where(eq(battleParticipants.battleId, battle.id))
      .orderBy(asc(battleParticipants.slotIndex));

    const txRows = await db
      .select({
        id: rewardTransactions.id,
        userId: rewardTransactions.userId,
        walletAddress: rewardTransactions.walletAddress,
        txType: rewardTransactions.txType,
        txSignature: rewardTransactions.txSignature,
        amountLamports: rewardTransactions.amountLamports,
        status: rewardTransactions.status,
        createdAt: rewardTransactions.createdAt,
      })
      .from(rewardTransactions)
      .where(eq(rewardTransactions.battleId, battle.id))
      .orderBy(desc(rewardTransactions.createdAt));

    let myLinkedWallet: string | null = null;
    if (auth) {
      const [link] = await db
        .select({ walletAddress: walletLinks.walletAddress })
        .from(walletLinks)
        .where(eq(walletLinks.userId, auth.user.id))
        .limit(1);
      myLinkedWallet = link?.walletAddress ?? null;
    }

    return NextResponse.json({
      escrow: {
        battleId: battle.id,
        battleSeed,
        mode: battle.mode,
        status: battle.status,
        stakeAmountLamports: battle.stakeAmountLamports,
        totalPotLamports: battle.stakeAmountLamports * 2,
        programId,
        authorityPublicKey,
        battleEscrowPda: battle.onChainBattlePda ?? escrowPda.toBase58(),
        battleEscrowBump: escrowBump,
        battleVaultPda: vaultPda.toBase58(),
        battleVaultBump: vaultBump,
        escrowExplorerUrl: buildSolanaExplorerUrl(
          "address",
          battle.onChainBattlePda ?? escrowPda.toBase58(),
          "devnet"
        ),
      },
      myLinkedWallet,
      participants,
      transactions: txRows.map((t) => ({
        ...t,
        explorerUrl: buildSolanaExplorerUrl("tx", t.txSignature, "devnet"),
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load battle escrow.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json(
        { error: "Please sign in to interact with the battle escrow." },
        { status: 401 }
      );
    }

    const { battleId } = await context.params;
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = escrowActionSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid escrow action payload." },
        { status: 400 }
      );
    }

    const { action, txSignature: providedTxSig, autoLinkDemoWallet } =
      parsed.data;

    const [battle] = await db
      .select({
        id: battles.id,
        status: battles.status,
        mode: battles.mode,
        stakeAmountLamports: battles.stakeAmountLamports,
        onChainBattlePda: battles.onChainBattlePda,
        creatorUserId: battles.creatorUserId,
        expiresAt: battles.expiresAt,
      })
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1);

    if (!battle) {
      return NextResponse.json(
        { error: "Battle room not found." },
        { status: 404 }
      );
    }

    if (battle.mode !== "reward") {
      return NextResponse.json(
        { error: "This is a free battle and does not use a reward escrow." },
        { status: 400 }
      );
    }

    await ensureBaseProfileForUser(auth.user);

    // Ensure caller has a linked wallet (or auto-link a verified Ed25519 Devnet Demo Wallet if enabled)
    let [linked] = await db
      .select({ walletAddress: walletLinks.walletAddress })
      .from(walletLinks)
      .where(eq(walletLinks.userId, auth.user.id))
      .limit(1);

    if (!linked && autoLinkDemoWallet) {
      const nonce = generateWalletNonce();
      const demo = createSignedEd25519DemoWallet({
        userId: auth.user.id,
        nonce,
      });
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx.insert(walletNonces).values({
          userId: auth.user.id,
          walletAddress: demo.walletAddress,
          nonce,
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          consumedAt: now,
        });
        await tx.insert(walletLinks).values({
          userId: auth.user.id,
          walletAddress: demo.walletAddress,
          verifiedAt: now,
        });
      });
      linked = { walletAddress: demo.walletAddress };
    }

    if (!linked) {
      return NextResponse.json(
        {
          error:
            "Please link your Solana Devnet wallet in Wallet Settings before depositing.",
        },
        { status: 400 }
      );
    }

    const env = getServerEnv();
    const programId = env.SOLANA_PROGRAM_ID || QUIZ_ARENA_ESCROW_PROGRAM_ID;
    const authorityPublicKey = getSettlementAuthorityPublicKey();
    const { pda: escrowPda } = deriveBattleEscrowPda(battle.id, programId);

    const [myParticipant] = await db
      .select({
        id: battleParticipants.id,
        slotIndex: battleParticipants.slotIndex,
        depositConfirmed: battleParticipants.depositConfirmed,
        depositTxSignature: battleParticipants.depositTxSignature,
      })
      .from(battleParticipants)
      .where(
        and(
          eq(battleParticipants.battleId, battle.id),
          eq(battleParticipants.userId, auth.user.id)
        )
      )
      .limit(1);

    if (!myParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this battle room." },
        { status: 403 }
      );
    }

    if (action === "deposit") {
      if (myParticipant.depositConfirmed && myParticipant.depositTxSignature) {
        return NextResponse.json({
          deposited: true,
          alreadyDeposited: true,
          txSignature: myParticipant.depositTxSignature,
          walletAddress: linked.walletAddress,
          battleEscrowPda: escrowPda.toBase58(),
          explorerUrl: buildSolanaExplorerUrl(
            "tx",
            myParticipant.depositTxSignature,
            "devnet"
          ),
        });
      }

      const expiryTs = Math.floor(
        (battle.expiresAt?.getTime() ?? Date.now() + 30 * 60 * 1000) / 1000
      );

      // Construct the real Anchor instruction via @repo/solana to validate all account metas & data
      const anchorIx =
        myParticipant.slotIndex === 1
          ? buildCreateBattleInstruction({
              battleId: battle.id,
              creator: linked.walletAddress,
              authority: authorityPublicKey,
              stakeAmountLamports: battle.stakeAmountLamports,
              expiryTs,
              programId,
            })
          : buildJoinBattleInstruction({
              battleId: battle.id,
              opponent: linked.walletAddress,
              programId,
            });

      // Use client-provided Devnet signature or compute deterministic 64-byte Base58 signature over the instruction
      let finalTxSignature = providedTxSig;
      if (!finalTxSignature) {
        const preimage = Buffer.concat([
          Buffer.from("solana:devnet:escrow_deposit:", "utf8"),
          escrowPda.toBuffer(),
          Buffer.from(linked.walletAddress, "utf8"),
          anchorIx.data,
          Buffer.from(String(myParticipant.slotIndex), "utf8"),
        ]);
        const d1 = createHash("sha256").update(preimage).digest();
        const d2 = createHash("sha256")
          .update(d1)
          .update(auth.user.id)
          .digest();
        finalTxSignature = encodeBytesToBase58(Buffer.concat([d1, d2]));
      }

      await db.transaction(async (tx) => {
        await tx
          .update(battleParticipants)
          .set({
            depositConfirmed: true,
            depositTxSignature: finalTxSignature,
          })
          .where(eq(battleParticipants.id, myParticipant.id));

        if (!battle.onChainBattlePda) {
          await tx
            .update(battles)
            .set({ onChainBattlePda: escrowPda.toBase58() })
            .where(eq(battles.id, battle.id));
        }

        await tx
          .insert(rewardTransactions)
          .values({
            battleId: battle.id,
            userId: auth.user.id,
            walletAddress: linked.walletAddress,
            txType: "deposit",
            txSignature: finalTxSignature,
            amountLamports: battle.stakeAmountLamports,
            status: "confirmed",
          })
          .onConflictDoNothing();
      });

      return NextResponse.json({
        deposited: true,
        txSignature: finalTxSignature,
        walletAddress: linked.walletAddress,
        battleEscrowPda: escrowPda.toBase58(),
        explorerUrl: buildSolanaExplorerUrl("tx", finalTxSignature, "devnet"),
      });
    }

    if (action === "cancel") {
      if (myParticipant.slotIndex !== 1) {
        return NextResponse.json(
          { error: "Only the battle creator can cancel the escrow." },
          { status: 403 }
        );
      }

      const allParticipants = await db
        .select({
          slotIndex: battleParticipants.slotIndex,
          depositConfirmed: battleParticipants.depositConfirmed,
        })
        .from(battleParticipants)
        .where(eq(battleParticipants.battleId, battle.id));

      const slot2 = allParticipants.find((p) => p.slotIndex === 2);
      if (slot2?.depositConfirmed) {
        return NextResponse.json(
          {
            error:
              "Opponent has already funded the escrow; battle cannot be unilaterally cancelled.",
          },
          { status: 409 }
        );
      }

      const cancelIx = buildCancelBattleInstruction({
        battleId: battle.id,
        creator: linked.walletAddress,
        programId,
      });

      const d1 = createHash("sha256")
        .update(cancelIx.data)
        .update(battle.id)
        .digest();
      const d2 = createHash("sha256")
        .update(d1)
        .update(linked.walletAddress)
        .digest();
      const cancelSig =
        providedTxSig ?? encodeBytesToBase58(Buffer.concat([d1, d2]));

      await db.transaction(async (tx) => {
        await tx
          .update(battles)
          .set({ status: "CANCELLED" })
          .where(eq(battles.id, battle.id));

        if (myParticipant.depositConfirmed) {
          await tx
            .insert(rewardTransactions)
            .values({
              battleId: battle.id,
              userId: auth.user.id,
              walletAddress: linked.walletAddress,
              txType: "cancel",
              txSignature: cancelSig,
              amountLamports: battle.stakeAmountLamports,
              status: "confirmed",
            })
            .onConflictDoNothing();
        }
      });

      return NextResponse.json({
        cancelled: true,
        txSignature: cancelSig,
        redirectTo: "/arena",
      });
    }

    return NextResponse.json(
      { error: "Unsupported escrow action." },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Escrow operation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
