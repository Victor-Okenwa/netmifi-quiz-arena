import { and, asc, battleParticipants, battles, db, eq } from "@repo/db";
import type { User } from "@supabase/supabase-js";
import { checkStakeAffordability } from "./solana/wallet-balance";
import { ensureBaseProfileForUser } from "./supabase/auth";

export interface JoinBattleOutcome {
  joined: boolean;
  alreadyParticipant: boolean;
  slotIndex: number | null;
  battleStatus: string;
  error?: string;
}

/**
 * Enrolls an authenticated student into Slot 2 of a battle if they are not already
 * a participant and Slot 2 is available.
 */
export async function joinBattleAsOpponent(
  battleId: string,
  user: User,
): Promise<JoinBattleOutcome> {
  // Ensure the joining user has a valid `profiles` row in PostgreSQL
  await ensureBaseProfileForUser(user);

  const [battle] = await db
    .select({
      id: battles.id,
      status: battles.status,
      mode: battles.mode,
      stakeAmountLamports: battles.stakeAmountLamports,
      creatorUserId: battles.creatorUserId,
    })
    .from(battles)
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battle) {
    return {
      joined: false,
      alreadyParticipant: false,
      slotIndex: null,
      battleStatus: "NOT_FOUND",
      error: "Battle room was not found.",
    };
  }

  const existingParticipants = await db
    .select({
      id: battleParticipants.id,
      userId: battleParticipants.userId,
      slotIndex: battleParticipants.slotIndex,
    })
    .from(battleParticipants)
    .where(eq(battleParticipants.battleId, battleId))
    .orderBy(asc(battleParticipants.slotIndex));

  const myParticipant = existingParticipants.find((p) => p.userId === user.id);
  if (myParticipant) {
    return {
      joined: true,
      alreadyParticipant: true,
      slotIndex: myParticipant.slotIndex,
      battleStatus: battle.status,
    };
  }

  if (battle.status === "CANCELLED" || battle.status === "EXPIRED") {
    return {
      joined: false,
      alreadyParticipant: false,
      slotIndex: null,
      battleStatus: battle.status,
      error: "This battle room has expired or was cancelled.",
    };
  }

  const slotTwoTaken = existingParticipants.some((p) => p.slotIndex === 2);
  if (slotTwoTaken || existingParticipants.length >= 2) {
    return {
      joined: false,
      alreadyParticipant: false,
      slotIndex: null,
      battleStatus: battle.status,
      error: "This battle room is already full (2/2 players).",
    };
  }

  // Winner-takes-all requires the opponent to match the creator's stake exactly,
  // so refuse to seat anyone whose wallet cannot cover it.
  if (battle.mode === "reward" && battle.stakeAmountLamports > 0) {
    const affordability = await checkStakeAffordability(
      user.id,
      battle.stakeAmountLamports,
    );
    if (!affordability.ok) {
      return {
        joined: false,
        alreadyParticipant: false,
        slotIndex: null,
        battleStatus: battle.status,
        error: affordability.error,
      };
    }
  }

  // Enroll user into Slot 2 and transition battle status from WAITING -> READY
  await db.transaction(async (tx) => {
    await tx
      .insert(battleParticipants)
      .values({
        battleId: battle.id,
        userId: user.id,
        slotIndex: 2,
        isReady: false,
        depositConfirmed: battle.mode === "free",
      })
      .onConflictDoNothing();

    if (battle.status === "WAITING") {
      await tx
        .update(battles)
        .set({ status: "READY" })
        .where(and(eq(battles.id, battle.id), eq(battles.status, "WAITING")));
    }
  });

  return {
    joined: true,
    alreadyParticipant: false,
    slotIndex: 2,
    battleStatus: "READY",
  };
}
