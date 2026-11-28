import { buildSolanaExplorerUrl } from "@/lib/solana/reward-settlement";
import {
  buildWalletChallengeMessage,
  verifyEd25519WalletSignature,
} from "@/lib/solana/wallet-auth";
import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import { and, db, eq, walletLinks, walletNonces } from "@repo/db";
import { isValidSolanaAddress } from "@repo/solana";
import { walletLinkVerifySchema } from "@repo/validators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json(
        { error: "Please sign in to verify your Solana wallet." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = walletLinkVerifySchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid wallet verification input.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { walletAddress, nonce, signatureBase64 } = parsed.data;
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Base58 Solana public key." },
        { status: 400 },
      );
    }

    await ensureBaseProfileForUser(auth.user);

    // 1. Lookup challenge nonce
    const [nonceRow] = await db
      .select({
        id: walletNonces.id,
        userId: walletNonces.userId,
        walletAddress: walletNonces.walletAddress,
        nonce: walletNonces.nonce,
        expiresAt: walletNonces.expiresAt,
        consumedAt: walletNonces.consumedAt,
      })
      .from(walletNonces)
      .where(
        and(
          eq(walletNonces.nonce, nonce),
          eq(walletNonces.userId, auth.user.id),
        ),
      )
      .limit(1);

    if (!nonceRow) {
      return NextResponse.json(
        {
          error:
            "Challenge nonce not found or does not belong to your account.",
        },
        { status: 400 },
      );
    }

    if (nonceRow.consumedAt) {
      return NextResponse.json(
        { error: "This challenge nonce has already been used." },
        { status: 400 },
      );
    }

    if (Date.now() > nonceRow.expiresAt.getTime()) {
      return NextResponse.json(
        { error: "Challenge nonce has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (nonceRow.walletAddress !== walletAddress) {
      return NextResponse.json(
        { error: "Wallet address does not match the issued challenge nonce." },
        { status: 400 },
      );
    }

    // 2. Reconstruct canonical challenge message & verify Ed25519 signature
    const expectedMessage = buildWalletChallengeMessage({
      walletAddress,
      userId: auth.user.id,
      nonce,
    });

    const isSignatureValid = verifyEd25519WalletSignature({
      walletAddress,
      message: expectedMessage,
      signatureBase64,
    });

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          error:
            "Cryptographic Ed25519 signature verification failed for the provided wallet address.",
        },
        { status: 400 },
      );
    }

    // 3. Ensure wallet is not linked to another student
    const [otherLink] = await db
      .select({ userId: walletLinks.userId })
      .from(walletLinks)
      .where(eq(walletLinks.walletAddress, walletAddress))
      .limit(1);

    if (otherLink && otherLink.userId !== auth.user.id) {
      return NextResponse.json(
        {
          error:
            "This Solana wallet is already linked to another student account.",
        },
        { status: 409 },
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(walletNonces)
        .set({ consumedAt: now })
        .where(eq(walletNonces.id, nonceRow.id));

      await tx.delete(walletLinks).where(eq(walletLinks.userId, auth.user.id));

      await tx.insert(walletLinks).values({
        userId: auth.user.id,
        walletAddress,
        verifiedAt: now,
      });
    });

    return NextResponse.json({
      verified: true,
      walletAddress,
      verifiedAt: now.toISOString(),
      explorerUrl: buildSolanaExplorerUrl("address", walletAddress, "devnet"),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Wallet verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
