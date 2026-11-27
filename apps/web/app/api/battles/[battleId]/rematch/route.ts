import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import {
  and,
  battleParticipants,
  battleQuestions,
  battles,
  db,
  eq,
  questions,
  sql,
} from "@repo/db";
import { NextResponse } from "next/server";

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

interface RematchRouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

export async function POST(
  _request: Request,
  context: RematchRouteContext
) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to launch a rematch." },
        { status: 401 }
      );
    }

    const { battleId } = await context.params;
    const profile = await ensureBaseProfileForUser(authContext.user);

    const [sourceBattle] = await db
      .select({
        id: battles.id,
        courseId: battles.courseId,
        topicId: battles.topicId,
        mode: battles.mode,
        isPrivate: battles.isPrivate,
        questionCount: battles.questionCount,
        timePerQuestionSeconds: battles.timePerQuestionSeconds,
        stakeAmountLamports: battles.stakeAmountLamports,
      })
      .from(battles)
      .where(eq(battles.id, battleId))
      .limit(1);

    if (!sourceBattle) {
      return NextResponse.json(
        { error: "Source battle not found." },
        { status: 404 }
      );
    }

    const conditions = [
      eq(questions.courseId, sourceBattle.courseId),
      eq(questions.approvalStatus, "approved"),
    ];
    if (sourceBattle.topicId) {
      conditions.push(eq(questions.topicId, sourceBattle.topicId));
    }

    let candidateQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(sourceBattle.questionCount);

    if (candidateQuestions.length === 0 && sourceBattle.topicId) {
      candidateQuestions = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.courseId, sourceBattle.courseId),
            eq(questions.approvalStatus, "approved")
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(sourceBattle.questionCount);
    }

    if (candidateQuestions.length === 0) {
      return NextResponse.json(
        { error: "No approved questions available for this rematch." },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode();
    const actualQuestionCount = candidateQuestions.length;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const rematchBattle = await db.transaction(async (tx) => {
      const [insertedBattle] = await tx
        .insert(battles)
        .values({
          inviteCode,
          courseId: sourceBattle.courseId,
          topicId: sourceBattle.topicId ?? null,
          creatorUserId: authContext.user.id,
          status: "WAITING",
          mode: sourceBattle.mode,
          isPrivate: sourceBattle.isPrivate,
          questionCount: actualQuestionCount,
          timePerQuestionSeconds: sourceBattle.timePerQuestionSeconds,
          stakeAmountLamports: sourceBattle.stakeAmountLamports,
          expiresAt,
        })
        .returning();

      if (!insertedBattle) {
        throw new Error("Failed to create rematch battle.");
      }

      await tx.insert(battleParticipants).values({
        battleId: insertedBattle.id,
        userId: authContext.user.id,
        slotIndex: 1,
        isReady: false,
        depositConfirmed: sourceBattle.mode === "free",
      });

      const questionRows = candidateQuestions.map((q, index) => ({
        battleId: insertedBattle.id,
        questionId: q.id,
        orderIndex: index + 1,
        timeLimitSeconds: sourceBattle.timePerQuestionSeconds,
      }));

      await tx.insert(battleQuestions).values(questionRows);

      return insertedBattle;
    });

    return NextResponse.json({
      rematchBattleId: rematchBattle.id,
      inviteCode: rematchBattle.inviteCode,
      challengerName: profile.displayName,
      redirectTo: `/arena/battle/${rematchBattle.id}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create rematch room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
