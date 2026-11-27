import { getServerEnv } from "@/lib/env";
import { buildSolanaExplorerUrl } from "@/lib/solana/reward-settlement";
import { fetchWalletBalanceLamports } from "@/lib/solana/wallet-balance";
import {
  createSignedEd25519DemoWallet,
  generateWalletNonce,
  verifyEd25519WalletSignature,
} from "@/lib/solana/wallet-auth";
import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import {
  battles,
  courses,
  db,
  desc,
  eq,
  rewardTransactions,
  walletLinks,
  walletNonces,
} from "@repo/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const env = getServerEnv();

    const [linkedWallet] = await db
      .select({
        id: walletLinks.id,
        walletAddress: walletLinks.walletAddress,
        verifiedAt: walletLinks.verifiedAt,
        createdAt: walletLinks.createdAt,
      })
      .from(walletLinks)
      .where(eq(walletLinks.userId, auth.user.id))
      .limit(1);

    // `null` means the RPC lookup failed; never report that as a 0 balance.
    const balanceLamports = linkedWallet
      ? await fetchWalletBalanceLamports(
          env.NEXT_PUBLIC_SOLANA_RPC_URL,
          linkedWallet.walletAddress
        )
      : null;

    const txRows = await db
      .select({
        id: rewardTransactions.id,
        battleId: rewardTransactions.battleId,
        walletAddress: rewardTransactions.walletAddress,
        txType: rewardTransactions.txType,
        txSignature: rewardTransactions.txSignature,
        amountLamports: rewardTransactions.amountLamports,
        status: rewardTransactions.status,
        createdAt: rewardTransactions.createdAt,
        courseCode: courses.code,
        inviteCode: battles.inviteCode,
      })
      .from(rewardTransactions)
      .leftJoin(battles, eq(rewardTransactions.battleId, battles.id))
      .leftJoin(courses, eq(battles.courseId, courses.id))
      .where(eq(rewardTransactions.userId, auth.user.id))
      .orderBy(desc(rewardTransactions.createdAt))
      .limit(25);

    const transactions = txRows.map((row) => ({
      ...row,
      explorerUrl: buildSolanaExplorerUrl("tx", row.txSignature, "devnet"),
    }));

    return NextResponse.json({
      linkedWallet: linkedWallet
        ? {
            ...linkedWallet,
            balanceLamports,
            balanceSol:
              balanceLamports === null ? null : balanceLamports / 1_000_000_000,
            balanceUnavailable: balanceLamports === null,
            explorerUrl: buildSolanaExplorerUrl(
              "address",
              linkedWallet.walletAddress,
              "devnet"
            ),
          }
        : null,
      transactions,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load wallet status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/wallet
 * Performs a 1-Click Devnet Demo Wallet Link for judges and students
 * who do not have a browser wallet extension installed.
 */
export async function POST() {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json(
        { error: "Please sign in to link a Solana wallet." },
        { status: 401 }
      );
    }

    await ensureBaseProfileForUser(auth.user);

    const nonce = generateWalletNonce();
    const demoSigned = createSignedEd25519DemoWallet({
      userId: auth.user.id,
      nonce,
    });

    const isVerified = verifyEd25519WalletSignature({
      walletAddress: demoSigned.walletAddress,
      message: demoSigned.message,
      signatureBase64: demoSigned.signatureBase64,
    });

    if (!isVerified) {
      return NextResponse.json(
        { error: "Signature verification failed." },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.insert(walletNonces).values({
        userId: auth.user.id,
        walletAddress: demoSigned.walletAddress,
        nonce,
        expiresAt,
        consumedAt: now,
      });

      await tx
        .delete(walletLinks)
        .where(eq(walletLinks.userId, auth.user.id));

      await tx.insert(walletLinks).values({
        userId: auth.user.id,
        walletAddress: demoSigned.walletAddress,
        verifiedAt: now,
      });
    });

    return NextResponse.json({
      linked: true,
      walletAddress: demoSigned.walletAddress,
      balanceLamports: 0,
      balanceSol: 0,
      verifiedAt: now.toISOString(),
      explorerUrl: buildSolanaExplorerUrl(
        "address",
        demoSigned.walletAddress,
        "devnet"
      ),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to link Devnet wallet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.delete(walletLinks).where(eq(walletLinks.userId, auth.user.id));

    return NextResponse.json({
      unlinked: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to unlink wallet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
