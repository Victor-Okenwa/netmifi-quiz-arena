import { joinBattleAsOpponent } from "@/lib/battle-join";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import {
  and,
  asc,
  battleParticipants,
  battles,
  db,
  eq,
  profiles,
  universities,
} from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const COUNTDOWN_DURATION_SECONDS = 20;
const LOCK_THRESHOLD_SECONDS = 10;

interface RouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

const lobbyActionSchema = z.object({
  action: z.enum(["join", "toggle_ready", "leave_room"]).default("join"),
});

async function getBattleLobbySnapshot(battleId: string) {
  const [battle] = await db
    .select({
      id: battles.id,
      status: battles.status,
      mode: battles.mode,
      stakeAmountLamports: battles.stakeAmountLamports,
      onChainBattlePda: battles.onChainBattlePda,
      inviteCode: battles.inviteCode,
      creatorUserId: battles.creatorUserId,
      startedAt: battles.startedAt,
    })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battle) {
    return null;
  }

  const participants = await db
    .select({
      id: battleParticipants.id,
      userId: battleParticipants.userId,
      slotIndex: battleParticipants.slotIndex,
      isReady: battleParticipants.isReady,
      depositConfirmed: battleParticipants.depositConfirmed,
      depositTxSignature: battleParticipants.depositTxSignature,
      score: battleParticipants.score,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      avatarNumber: profiles.avatarNumber,
      academicLevel: profiles.academicLevel,
      universityShortCode: universities.shortCode,
    })
    .from(battleParticipants)
    .innerJoin(profiles, eq(battleParticipants.userId, profiles.id))
    .leftJoin(universities, eq(profiles.universityId, universities.id))
    .where(eq(battleParticipants.battleId, battleId))
    .orderBy(asc(battleParticipants.slotIndex));

  const nowMs = Date.now();
  const bothReady =
    participants.length === 2 && participants.every((p) => p.isReady);

  let currentStatus = battle.status;
  let countdownTargetIso = battle.startedAt
    ? battle.startedAt.toISOString()
    : null;

  // If both are ready and the 20s countdown target has been reached, mark battle ACTIVE
  if (
    bothReady &&
    battle.startedAt &&
    nowMs >= battle.startedAt.getTime() &&
    (battle.status === "READY" || battle.status === "WAITING")
  ) {
    await db
      .update(battles)
      .set({ status: "ACTIVE" })
      .where(eq(battles.id, battleId));
    currentStatus = "ACTIVE";
  }

  return {
    battle: {
      id: battle.id,
      status: currentStatus,
      mode: battle.mode,
      stakeAmountLamports: battle.stakeAmountLamports,
      onChainBattlePda: battle.onChainBattlePda,
      inviteCode: battle.inviteCode,
      creatorUserId: battle.creatorUserId,
      countdownEndsAt: countdownTargetIso,
    },
    serverNow: new Date(nowMs).toISOString(),
    participantCount: participants.length,
    participants,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { battleId } = await context.params;
    const snapshot = await getBattleLobbySnapshot(battleId);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Battle room not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(
      { error: "Failed to load battle status." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to interact with this battle room." },
        { status: 401 }
      );
    }

    const { battleId } = await context.params;
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = lobbyActionSchema.safeParse(rawBody);
    const action = parsed.success ? parsed.data.action : "join";

    if (action === "join") {
      const outcome = await joinBattleAsOpponent(battleId, authContext.user);
      if (!outcome.joined) {
        return NextResponse.json(
          { error: outcome.error ?? "Unable to join battle room." },
          { status: 409 }
        );
      }
      const snapshot = await getBattleLobbySnapshot(battleId);
      return NextResponse.json({
        joined: true,
        slotIndex: outcome.slotIndex,
        ...snapshot,
      });
    }

    // Load current battle & participants for toggle_ready and leave_room
    const [battle] = await db
      .select({
        id: battles.id,
        status: battles.status,
        mode: battles.mode,
        startedAt: battles.startedAt,
        creatorUserId: battles.creatorUserId,
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

    if (
      battle.status === "ACTIVE" ||
      battle.status === "COMPLETED" ||
      battle.status === "CANCELLED"
    ) {
      return NextResponse.json(
        { error: "The battle has already started or ended." },
        { status: 409 }
      );
    }

    const participants = await db
      .select({
        id: battleParticipants.id,
        userId: battleParticipants.userId,
        slotIndex: battleParticipants.slotIndex,
        isReady: battleParticipants.isReady,
        depositConfirmed: battleParticipants.depositConfirmed,
      })
      .from(battleParticipants)
      .where(eq(battleParticipants.battleId, battleId))
      .orderBy(asc(battleParticipants.slotIndex));

    const callerParticipant = participants.find(
      (p) => p.userId === authContext.user.id
    );

    if (!callerParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this battle room." },
        { status: 403 }
      );
    }

    // Check if the 20s countdown is currently active and at or below the 10-second lock threshold
    const bothCurrentlyReady =
      participants.length === 2 && participants.every((p) => p.isReady);

    if (bothCurrentlyReady && battle.startedAt) {
      const remainingSeconds = Math.ceil(
        (battle.startedAt.getTime() - Date.now()) / 1000
      );
      if (remainingSeconds <= LOCK_THRESHOLD_SECONDS) {
        return NextResponse.json(
          {
            error:
              "Countdown is under 10 seconds! Ready state and leaving are now locked.",
          },
          { status: 409 }
        );
      }
    }

    if (action === "toggle_ready") {
      const nextReadyState = !callerParticipant.isReady;

      if (
        battle.mode === "reward" &&
        nextReadyState &&
        !callerParticipant.depositConfirmed
      ) {
        return NextResponse.json(
          {
            error:
              "Please deposit your SOL stake into the Solana Devnet Escrow Vault before locking in Ready.",
          },
          { status: 409 }
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .update(battleParticipants)
          .set({ isReady: nextReadyState })
          .where(eq(battleParticipants.id, callerParticipant.id));

        const updatedParticipants = participants.map((p) =>
          p.id === callerParticipant.id ? { ...p, isReady: nextReadyState } : p
        );

        const nowBothReady =
          updatedParticipants.length === 2 &&
          updatedParticipants.every((p) => p.isReady);

        if (nowBothReady) {
          const countdownEndsAt = new Date(
            Date.now() + COUNTDOWN_DURATION_SECONDS * 1000
          );
          await tx
            .update(battles)
            .set({
              status: "READY",
              startedAt: countdownEndsAt,
            })
            .where(eq(battles.id, battleId));
        } else {
          await tx
            .update(battles)
            .set({
              status: updatedParticipants.length === 2 ? "READY" : "WAITING",
              startedAt: null,
            })
            .where(eq(battles.id, battleId));
        }
      });

      const snapshot = await getBattleLobbySnapshot(battleId);
      return NextResponse.json({
        isReady: nextReadyState,
        ...snapshot,
      });
    }

    if (action === "leave_room") {
      if (callerParticipant.slotIndex !== 2) {
        return NextResponse.json(
          { error: "Only the opponent in Slot 2 can leave this room." },
          { status: 403 }
        );
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(battleParticipants)
          .where(
            and(
              eq(battleParticipants.battleId, battleId),
              eq(battleParticipants.userId, authContext.user.id),
              eq(battleParticipants.slotIndex, 2)
            )
          );

        await tx
          .update(battles)
          .set({
            status: "WAITING",
            startedAt: null,
          })
          .where(eq(battles.id, battleId));
      });

      return NextResponse.json({
        leftRoom: true,
        redirectTo: "/arena",
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update battle room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
