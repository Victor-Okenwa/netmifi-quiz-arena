import { joinBattleAsOpponent } from "@/lib/battle-join";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import {
  asc,
  battleParticipants,
  battles,
  db,
  eq,
  profiles,
  universities,
} from "@repo/db";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { battleId } = await context.params;

    const [battle] = await db
      .select({
        id: battles.id,
        status: battles.status,
        inviteCode: battles.inviteCode,
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

    const participants = await db
      .select({
        userId: battleParticipants.userId,
        slotIndex: battleParticipants.slotIndex,
        isReady: battleParticipants.isReady,
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        avatarNumber: profiles.avatarNumber,
        universityShortCode: universities.shortCode,
      })
      .from(battleParticipants)
      .innerJoin(profiles, eq(battleParticipants.userId, profiles.id))
      .leftJoin(universities, eq(profiles.universityId, universities.id))
      .where(eq(battleParticipants.battleId, battleId))
      .orderBy(asc(battleParticipants.slotIndex));

    return NextResponse.json({
      battle,
      participantCount: participants.length,
      participants,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load battle status." },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to join this battle." },
        { status: 401 }
      );
    }

    const { battleId } = await context.params;
    const outcome = await joinBattleAsOpponent(battleId, authContext.user);

    if (!outcome.joined) {
      return NextResponse.json(
        { error: outcome.error ?? "Unable to join battle room." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      joined: true,
      slotIndex: outcome.slotIndex,
      battleStatus: outcome.battleStatus,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to join battle.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
