import { joinBattleAsOpponent } from "@/lib/battle-join";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { battles, db, eq, sql } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const lookupInviteInputSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(4, "Please enter a valid invite code or room link")
    .max(300, "Input is too long"),
  asSpectator: z.boolean().optional().default(false),
});

function parseInviteInput(raw: string): {
  battleId?: string;
  inviteCode?: string;
} {
  const trimmed = raw.trim();

  const uuidMatch = trimmed.match(UUID_REGEX);
  if (uuidMatch?.[0]) {
    return { battleId: uuidMatch[0].toLowerCase() };
  }

  const parenMatch = trimmed.match(/\(([A-Za-z0-9]{4,12})\)/);
  if (parenMatch?.[1]) {
    return { inviteCode: parenMatch[1].toUpperCase() };
  }

  const cleanedCode = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return { inviteCode: cleanedCode };
}

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to join or spectate a battle." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = lookupInviteInputSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid invite code.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { inviteCode: rawInvite, asSpectator } = parsed.data;
    const { battleId: parsedBattleId, inviteCode: parsedCode } =
      parseInviteInput(rawInvite);

    const [battle] = parsedBattleId
      ? await db
          .select({
            id: battles.id,
            inviteCode: battles.inviteCode,
            status: battles.status,
          })
          .from(battles)
          .where(eq(battles.id, parsedBattleId))
          .limit(1)
      : await db
          .select({
            id: battles.id,
            inviteCode: battles.inviteCode,
            status: battles.status,
          })
          .from(battles)
          .where(sql`UPPER(${battles.inviteCode}) = ${parsedCode ?? ""}`)
          .limit(1);

    if (!battle) {
      return NextResponse.json(
        {
          error: `No battle room found matching "${parsedCode ?? parsedBattleId}". Check the code and try again.`,
        },
        { status: 404 }
      );
    }

    if (battle.status === "CANCELLED" || battle.status === "EXPIRED") {
      return NextResponse.json(
        { error: "This battle invitation has expired or was cancelled." },
        { status: 410 }
      );
    }

    // If explicitly joining as spectator, go directly to spectator mode without occupying Slot 2
    if (asSpectator) {
      return NextResponse.json({
        battleId: battle.id,
        inviteCode: battle.inviteCode,
        isSpectator: true,
        redirectTo: `/arena/battle/${battle.id}?spectate=true`,
      });
    }

    // Attempt to enroll as Player 2; if room already has 2 players or is already underway,
    // enter automatically as a Spectator!
    const joinOutcome = await joinBattleAsOpponent(battle.id, authContext.user);

    if (!joinOutcome.joined) {
      return NextResponse.json({
        battleId: battle.id,
        inviteCode: battle.inviteCode,
        isSpectator: true,
        redirectTo: `/arena/battle/${battle.id}?spectate=true`,
      });
    }

    return NextResponse.json({
      battleId: battle.id,
      inviteCode: battle.inviteCode,
      slotIndex: joinOutcome.slotIndex,
      alreadyParticipant: joinOutcome.alreadyParticipant,
      isSpectator: false,
      redirectTo: `/arena/battle/${battle.id}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to join battle room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
