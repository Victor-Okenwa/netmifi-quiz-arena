import { checkStakeAffordability } from "@/lib/solana/wallet-balance";
import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import {
  and,
  battleParticipants,
  battleQuestions,
  battles,
  courses,
  db,
  desc,
  eq,
  profiles,
  questions,
  sql,
  topics,
  universities,
} from "@repo/db";
import { deriveBattleEscrowPda } from "@repo/solana";
import { createBattleSchema } from "@repo/validators";
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

export async function GET() {
  try {
    const openBattles = await db
      .select({
        id: battles.id,
        inviteCode: battles.inviteCode,
        status: battles.status,
        mode: battles.mode,
        questionCount: battles.questionCount,
        timePerQuestionSeconds: battles.timePerQuestionSeconds,
        stakeAmountLamports: battles.stakeAmountLamports,
        createdAt: battles.createdAt,
        courseCode: courses.code,
        courseTitle: courses.title,
        topicName: topics.name,
        creatorDisplayName: profiles.displayName,
        creatorUsername: profiles.username,
        creatorAvatarUrl: profiles.avatarUrl,
        creatorAvatarNumber: profiles.avatarNumber,
        creatorUniversityShortCode: universities.shortCode,
      })
      .from(battles)
      .innerJoin(courses, eq(battles.courseId, courses.id))
      .leftJoin(topics, eq(battles.topicId, topics.id))
      .innerJoin(profiles, eq(battles.creatorUserId, profiles.id))
      .leftJoin(universities, eq(profiles.universityId, universities.id))
      .where(and(eq(battles.status, "WAITING"), eq(battles.isPrivate, false)))
      .orderBy(desc(battles.createdAt))
      .limit(20);

    return NextResponse.json({ battles: openBattles });
  } catch {
    return NextResponse.json({ battles: [] });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to create a battle." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createBattleSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid battle configuration.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      courseId,
      topicId,
      mode,
      questionCount,
      timePerQuestionSeconds,
      isPrivate,
      stakeAmountLamports,
    } = parsed.data;

    // Ensure creator profile exists in PostgreSQL
    await ensureBaseProfileForUser(authContext.user);

    // Reward Battles are winner-takes-all with equal stakes: the creator must
    // be able to cover the stake before the room is even opened.
    if (mode === "reward") {
      const affordability = await checkStakeAffordability(
        authContext.user.id,
        stakeAmountLamports,
      );
      if (!affordability.ok) {
        return NextResponse.json(
          { error: affordability.error },
          { status: affordability.status },
        );
      }
    }

    // Verify course exists
    const [course] = await db
      .select({ id: courses.id, code: courses.code })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { error: "Selected course was not found." },
        { status: 400 },
      );
    }

    // Fetch approved questions for the course (and optional topic)
    const conditions = [
      eq(questions.courseId, courseId),
      eq(questions.approvalStatus, "approved"),
    ];
    if (topicId) {
      conditions.push(eq(questions.topicId, topicId));
    }

    let candidateQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(questionCount);

    // If a specific topic had fewer questions than requested, top up from the same course
    if (candidateQuestions.length === 0 && topicId) {
      candidateQuestions = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.courseId, courseId),
            eq(questions.approvalStatus, "approved"),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(questionCount);
    }

    if (candidateQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No approved questions are available for this course yet. Seed or approve questions first.",
        },
        { status: 400 },
      );
    }

    const inviteCode = generateInviteCode();
    const actualQuestionCount = candidateQuestions.length;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const createdBattle = await db.transaction(async (tx) => {
      const [insertedBattle] = await tx
        .insert(battles)
        .values({
          inviteCode,
          courseId,
          topicId: topicId ?? null,
          creatorUserId: authContext.user.id,
          status: "WAITING",
          mode,
          isPrivate,
          questionCount: actualQuestionCount,
          timePerQuestionSeconds,
          stakeAmountLamports,
          expiresAt,
        })
        .returning();

      if (!insertedBattle) {
        throw new Error("Failed to create battle record.");
      }

      if (mode === "reward") {
        const { pda } = deriveBattleEscrowPda(insertedBattle.id);
        await tx
          .update(battles)
          .set({ onChainBattlePda: pda.toBase58() })
          .where(eq(battles.id, insertedBattle.id));
        insertedBattle.onChainBattlePda = pda.toBase58();
      }

      await tx.insert(battleParticipants).values({
        battleId: insertedBattle.id,
        userId: authContext.user.id,
        slotIndex: 1,
        isReady: false,
        depositConfirmed: mode === "free",
      });

      const questionRows = candidateQuestions.map((q, index) => ({
        battleId: insertedBattle.id,
        questionId: q.id,
        orderIndex: index + 1,
        timeLimitSeconds: timePerQuestionSeconds,
      }));

      await tx.insert(battleQuestions).values(questionRows);

      return insertedBattle;
    });

    return NextResponse.json({
      battleId: createdBattle.id,
      inviteCode: createdBattle.inviteCode,
      redirectTo: `/arena/battle/${createdBattle.id}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create battle room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
