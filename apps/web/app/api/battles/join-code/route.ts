import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { battles, db, eq } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const lookupInviteCodeSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, "Invite code must be at least 4 characters")
    .max(16, "Invite code is too long")
    .transform((val) => val.toUpperCase()),
});

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to join a battle." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = lookupInviteCodeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid invite code.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { inviteCode } = parsed.data;

    const [battle] = await db
      .select({
        id: battles.id,
        status: battles.status,
      })
      .from(battles)
      .where(eq(battles.inviteCode, inviteCode))
      .limit(1);

    if (!battle) {
      return NextResponse.json(
        { error: `No battle found with invite code "${inviteCode}".` },
        { status: 404 }
      );
    }

    if (battle.status === "CANCELLED" || battle.status === "EXPIRED") {
      return NextResponse.json(
        { error: "This battle invitation has expired or was cancelled." },
        { status: 410 }
      );
    }

    return NextResponse.json({
      battleId: battle.id,
      redirectTo: `/arena/battle/${battle.id}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to look up battle room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
