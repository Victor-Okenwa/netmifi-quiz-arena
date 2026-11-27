import {
  buildWalletChallengeMessage,
  generateWalletNonce,
} from "@/lib/solana/wallet-auth";
import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import { db, eq, walletLinks, walletNonces } from "@repo/db";
import { isValidSolanaAddress } from "@repo/solana";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestNonceSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .min(32, "Invalid Solana wallet address")
    .max(44, "Invalid Solana wallet address")
    .refine(isValidSolanaAddress, {
      message: "Must be a valid Base58 Solana public key.",
    }),
});

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json(
        { error: "Please sign in to request a wallet verification nonce." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = requestNonceSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid Solana wallet address.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { walletAddress } = parsed.data;
    await ensureBaseProfileForUser(auth.user);

    // Ensure this wallet address is not already linked to a different student account
    const [existingLink] = await db
      .select({
        userId: walletLinks.userId,
        walletAddress: walletLinks.walletAddress,
      })
      .from(walletLinks)
      .where(eq(walletLinks.walletAddress, walletAddress))
      .limit(1);

    if (existingLink && existingLink.userId !== auth.user.id) {
      return NextResponse.json(
        {
          error:
            "This Solana wallet is already linked to another student profile.",
        },
        { status: 409 }
      );
    }

    const nonce = generateWalletNonce();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const message = buildWalletChallengeMessage({
      walletAddress,
      userId: auth.user.id,
      nonce,
    });

    await db.insert(walletNonces).values({
      userId: auth.user.id,
      walletAddress,
      nonce,
      expiresAt,
    });

    return NextResponse.json({
      walletAddress,
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate wallet nonce.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
