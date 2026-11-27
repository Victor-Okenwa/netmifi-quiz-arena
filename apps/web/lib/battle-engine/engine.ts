import {
  and,
  answerSubmissions,
  asc,
  audioAssets,
  battleParticipants,
  battleQuestions,
  battleResults,
  battles,
  courses,
  db,
  eq,
  inArray,
  profiles,
  questionOptions,
  questions,
  sql,
  topics,
  universities,
  type StoredParticipantDiagnosis,
  type StoredTopicBreakdown,
} from "@repo/db";
import type {
  OptionKey,
  PublicBattleQuestion,
  QuestionDifficulty,
} from "@repo/types";

export interface ArenaParticipantState {
  userId: string;
  slotIndex: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarNumber: number;
  universityShortCode: string | null;
  academicLevel: string | null;
  score: number;
  correctAnswersCount: number;
  totalResponseTimeMs: number;
  answeredCount: number;
  isFinished: boolean;
}

/**
 * Represents a single question that a specific participant has ALREADY answered.
 * - During an ACTIVE battle, spectators can only see questions present in a participant's answered feed.
 * - `correctOptionKey` and `explanation` are ONLY populated once `battle.status === "COMPLETED"`.
 */
export interface SpectatorAnsweredQuestionItem {
  questionId: string;
  questionIndex: number;
  topicName: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: { id: string; key: OptionKey; text: string }[];
  selectedOptionKey: OptionKey;
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs: number;
  submittedAt: string;
  correctOptionKey?: OptionKey;
  explanation?: string;
}

export interface CompletedBattleSummary {
  winnerUserId: string | null;
  isDraw: boolean;
  creatorScore: number;
  opponentScore: number;
  myDiagnosis: StoredParticipantDiagnosis | null;
  allParticipantDiagnoses: Record<string, StoredParticipantDiagnosis>;
  xpAwarded: number;
}

export interface SanitizedBattleArenaState {
  viewerRole: "participant" | "spectator";
  battle: {
    id: string;
    inviteCode: string;
    status: string;
    mode: "free" | "reward";
    courseId: string;
    courseCode: string;
    courseTitle: string;
    topicName: string | null;
    questionCount: number;
    timePerQuestionSeconds: number;
    winnerUserId: string | null;
    isDraw: boolean;
  };
  questions: PublicBattleQuestion[];
  myAnsweredQuestionIds: string[];
  participants: ArenaParticipantState[];
  spectatorFeeds: Record<string, SpectatorAnsweredQuestionItem[]>;
  completedSummary: CompletedBattleSummary | null;
}

/**
 * Computes speed-adjusted points on the server for a submitted answer.
 */
export function calculateQuestionPoints(params: {
  isCorrect: boolean;
  difficulty: QuestionDifficulty;
  clientElapsedMs: number;
  timeLimitSeconds: number;
}): number {
  if (!params.isCorrect) {
    return 0;
  }

  const basePoints =
    params.difficulty === "hard"
      ? 150
      : params.difficulty === "medium"
        ? 120
        : 100;

  const timeLimitMs = Math.max(1000, params.timeLimitSeconds * 1000);
  const clampedElapsedMs = Math.max(
    0,
    Math.min(timeLimitMs, params.clientElapsedMs)
  );
  const speedRatio = 1 - clampedElapsedMs / timeLimitMs;
  const speedBonus = Math.round(50 * speedRatio);

  return basePoints + speedBonus;
}

/**
 * Loads the sanitized battle arena state for an authenticated participant OR spectator.
 * - For participants: returns `questions` with `correctOptionKey` and `explanation` stripped while active.
 * - For spectators: returns `questions: []` while active and populates `spectatorFeeds[participantUserId]`
 *   with ONLY the questions that specific participant has already answered (anti-cheat).
 */
export async function getSanitizedBattleArenaState(
  battleId: string,
  userId: string
): Promise<SanitizedBattleArenaState | null> {
  const [battleRow] = await db
    .select({
      id: battles.id,
      inviteCode: battles.inviteCode,
      status: battles.status,
      mode: battles.mode,
      courseId: battles.courseId,
      courseCode: courses.code,
      courseTitle: courses.title,
      topicName: topics.name,
      questionCount: battles.questionCount,
      timePerQuestionSeconds: battles.timePerQuestionSeconds,
      startedAt: battles.startedAt,
      winnerUserId: battles.winnerUserId,
      isDraw: battles.isDraw,
    })
    .from(battles)
    .innerJoin(courses, eq(battles.courseId, courses.id))
    .leftJoin(topics, eq(battles.topicId, topics.id))
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!battleRow) {
    return null;
  }

  const participantRows = await db
    .select({
      userId: battleParticipants.userId,
      slotIndex: battleParticipants.slotIndex,
      isReady: battleParticipants.isReady,
      score: battleParticipants.score,
      correctAnswersCount: battleParticipants.correctAnswersCount,
      totalResponseTimeMs: battleParticipants.totalResponseTimeMs,
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

  const isParticipant = participantRows.some((p) => p.userId === userId);
  const viewerRole: "participant" | "spectator" = isParticipant
    ? "participant"
    : "spectator";

  let currentStatus = battleRow.status;

  // Auto-transition READY -> ACTIVE if both players are ready and countdown has elapsed
  if (
    currentStatus === "READY" &&
    participantRows.length === 2 &&
    participantRows.every((p) => p.isReady) &&
    battleRow.startedAt &&
    Date.now() >= battleRow.startedAt.getTime()
  ) {
    await db
      .update(battles)
      .set({ status: "ACTIVE" })
      .where(eq(battles.id, battleId));
    currentStatus = "ACTIVE";
  }

  // Load ordered battle questions
  const rawQuestions = await db
    .select({
      questionId: questions.id,
      orderIndex: battleQuestions.orderIndex,
      timeLimitSeconds: battleQuestions.timeLimitSeconds,
      courseId: questions.courseId,
      topicId: questions.topicId,
      topicName: topics.name,
      questionText: questions.questionText,
      difficulty: questions.difficulty,
      correctOptionKey: questions.correctOptionKey,
      explanation: questions.explanation,
      audioUrl: audioAssets.publicUrl,
    })
    .from(battleQuestions)
    .innerJoin(questions, eq(battleQuestions.questionId, questions.id))
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(audioAssets, eq(questions.audioAssetId, audioAssets.id))
    .where(eq(battleQuestions.battleId, battleId))
    .orderBy(asc(battleQuestions.orderIndex));

  const questionIds = rawQuestions.map((q) => q.questionId);

  const rawOptions =
    questionIds.length > 0
      ? await db
          .select({
            id: questionOptions.id,
            questionId: questionOptions.questionId,
            optionKey: questionOptions.optionKey,
            optionText: questionOptions.optionText,
          })
          .from(questionOptions)
          .where(inArray(questionOptions.questionId, questionIds))
          .orderBy(asc(questionOptions.optionKey))
      : [];

  const optionsByQuestionId = new Map<
    string,
    { id: string; key: OptionKey; text: string }[]
  >();

  for (const opt of rawOptions) {
    const list = optionsByQuestionId.get(opt.questionId) ?? [];
    list.push({
      id: opt.id,
      key: opt.optionKey,
      text: opt.optionText,
    });
    optionsByQuestionId.set(opt.questionId, list);
  }

  const totalQuestions = rawQuestions.length || battleRow.questionCount;

  const sanitizedQuestions: PublicBattleQuestion[] = rawQuestions.map((q) => ({
    id: q.questionId,
    courseId: q.courseId,
    topicId: q.topicId,
    topicName: q.topicName,
    questionIndex: q.orderIndex,
    totalQuestions,
    questionText: q.questionText,
    difficulty: q.difficulty,
    options: optionsByQuestionId.get(q.questionId) ?? [],
    audioUrl: q.audioUrl ?? null,
    timeLimitSeconds: q.timeLimitSeconds,
  }));

  // Load submissions to compute answered progress & per-participant answered feeds
  const submissions = await db
    .select({
      userId: answerSubmissions.userId,
      questionId: answerSubmissions.questionId,
      selectedOptionKey: answerSubmissions.selectedOptionKey,
      isCorrect: answerSubmissions.isCorrect,
      pointsAwarded: answerSubmissions.pointsAwarded,
      responseTimeMs: answerSubmissions.responseTimeMs,
      submittedAt: answerSubmissions.submittedAt,
    })
    .from(answerSubmissions)
    .where(eq(answerSubmissions.battleId, battleId))
    .orderBy(asc(answerSubmissions.submittedAt));

  const myAnsweredQuestionIds = submissions
    .filter((s) => s.userId === userId)
    .map((s) => s.questionId);

  const countByUserId = new Map<string, number>();
  for (const sub of submissions) {
    countByUserId.set(sub.userId, (countByUserId.get(sub.userId) ?? 0) + 1);
  }

  const participants: ArenaParticipantState[] = participantRows.map((p) => {
    const answeredCount = countByUserId.get(p.userId) ?? 0;
    return {
      userId: p.userId,
      slotIndex: p.slotIndex,
      displayName: p.displayName,
      username: p.username,
      avatarUrl: p.avatarUrl,
      avatarNumber: p.avatarNumber,
      universityShortCode: p.universityShortCode,
      academicLevel: p.academicLevel,
      score: p.score,
      correctAnswersCount: p.correctAnswersCount,
      totalResponseTimeMs: p.totalResponseTimeMs,
      answeredCount,
      isFinished: totalQuestions > 0 && answeredCount >= totalQuestions,
    };
  });

  // Build per-participant answered question feeds (strictly only questions that participant has submitted)
  const questionById = new Map(rawQuestions.map((q) => [q.questionId, q]));
  const isCompleted = currentStatus === "COMPLETED";

  const spectatorFeeds: Record<string, SpectatorAnsweredQuestionItem[]> = {};
  for (const p of participantRows) {
    spectatorFeeds[p.userId] = [];
  }

  for (const sub of submissions) {
    const qMeta = questionById.get(sub.questionId);
    if (!qMeta) continue;

    const feedList = spectatorFeeds[sub.userId] ?? [];
    feedList.push({
      questionId: qMeta.questionId,
      questionIndex: qMeta.orderIndex,
      topicName: qMeta.topicName,
      difficulty: qMeta.difficulty,
      questionText: qMeta.questionText,
      options: optionsByQuestionId.get(qMeta.questionId) ?? [],
      selectedOptionKey: sub.selectedOptionKey,
      isCorrect: sub.isCorrect,
      pointsAwarded: sub.pointsAwarded,
      responseTimeMs: sub.responseTimeMs,
      submittedAt: sub.submittedAt.toISOString(),
      ...(isCompleted
        ? {
            correctOptionKey: qMeta.correctOptionKey,
            explanation: qMeta.explanation,
          }
        : {}),
    });
    spectatorFeeds[sub.userId] = feedList;
  }

  // Sort each participant's answered feed by question orderIndex
  for (const pUserId of Object.keys(spectatorFeeds)) {
    spectatorFeeds[pUserId]?.sort((a, b) => a.questionIndex - b.questionIndex);
  }

  let completedSummary: CompletedBattleSummary | null = null;

  if (isCompleted) {
    const [resultRow] = await db
      .select({
        winnerUserId: battleResults.winnerUserId,
        isDraw: battleResults.isDraw,
        creatorScore: battleResults.creatorScore,
        opponentScore: battleResults.opponentScore,
        participantDiagnoses: battleResults.participantDiagnoses,
      })
      .from(battleResults)
      .where(eq(battleResults.battleId, battleId))
      .limit(1);

    const isWinner = resultRow
      ? resultRow.winnerUserId === userId
      : battleRow.winnerUserId === userId;
    const isDraw = resultRow ? resultRow.isDraw : battleRow.isDraw;
    const xpAwarded =
      viewerRole === "spectator" ? 0 : isDraw ? 100 : isWinner ? 150 : 60;

    completedSummary = {
      winnerUserId: resultRow?.winnerUserId ?? battleRow.winnerUserId,
      isDraw,
      creatorScore:
        resultRow?.creatorScore ??
        participants.find((p) => p.slotIndex === 1)?.score ??
        0,
      opponentScore:
        resultRow?.opponentScore ??
        participants.find((p) => p.slotIndex === 2)?.score ??
        0,
      myDiagnosis: resultRow?.participantDiagnoses?.[userId] ?? null,
      allParticipantDiagnoses: resultRow?.participantDiagnoses ?? {},
      xpAwarded,
    };
  }

  return {
    viewerRole,
    battle: {
      id: battleRow.id,
      inviteCode: battleRow.inviteCode,
      status: currentStatus,
      mode: battleRow.mode,
      courseId: battleRow.courseId,
      courseCode: battleRow.courseCode,
      courseTitle: battleRow.courseTitle,
      topicName: battleRow.topicName,
      questionCount: totalQuestions,
      timePerQuestionSeconds: battleRow.timePerQuestionSeconds,
      winnerUserId:
        completedSummary?.winnerUserId ?? battleRow.winnerUserId ?? null,
      isDraw: completedSummary?.isDraw ?? battleRow.isDraw,
    },
    // Anti-cheat: spectators never receive unanswered questions while the match is active
    questions:
      viewerRole === "spectator" && !isCompleted ? [] : sanitizedQuestions,
    myAnsweredQuestionIds,
    participants,
    spectatorFeeds,
    completedSummary,
  };
}

export interface SubmitAnswerResult {
  submitted: boolean;
  alreadySubmitted: boolean;
  pointsAwarded: number;
  answeredCount: number;
  totalQuestions: number;
  myFinished: boolean;
  battleStatus: string;
}

/**
 * Validates and grades a student's answer submission on the server inside a Drizzle transaction.
 * Automatically finalizes the battle when both participants complete all questions.
 */
export async function submitParticipantAnswer(params: {
  battleId: string;
  userId: string;
  questionId: string;
  selectedOptionKey: OptionKey | null;
  clientElapsedMs: number;
  timedOut: boolean;
}): Promise<SubmitAnswerResult> {
  return db.transaction(async (tx) => {
    const [battle] = await tx
      .select({
        id: battles.id,
        status: battles.status,
        questionCount: battles.questionCount,
        timePerQuestionSeconds: battles.timePerQuestionSeconds,
      })
      .from(battles)
      .where(eq(battles.id, params.battleId))
      .limit(1);

    if (!battle) {
      throw new Error("Battle room not found.");
    }

    if (battle.status === "COMPLETED") {
      return {
        submitted: false,
        alreadySubmitted: true,
        pointsAwarded: 0,
        answeredCount: battle.questionCount,
        totalQuestions: battle.questionCount,
        myFinished: true,
        battleStatus: "COMPLETED",
      };
    }

    if (battle.status === "CANCELLED" || battle.status === "EXPIRED") {
      throw new Error("This battle is no longer active.");
    }

    if (battle.status === "READY") {
      await tx
        .update(battles)
        .set({ status: "ACTIVE" })
        .where(eq(battles.id, battle.id));
    }

    const [participant] = await tx
      .select({
        id: battleParticipants.id,
        userId: battleParticipants.userId,
        score: battleParticipants.score,
      })
      .from(battleParticipants)
      .where(
        and(
          eq(battleParticipants.battleId, params.battleId),
          eq(battleParticipants.userId, params.userId)
        )
      )
      .limit(1);

    if (!participant) {
      throw new Error("Spectators cannot submit answers in a battle.");
    }

    const [battleQuestion] = await tx
      .select({
        questionId: questions.id,
        correctOptionKey: questions.correctOptionKey,
        difficulty: questions.difficulty,
        timeLimitSeconds: battleQuestions.timeLimitSeconds,
      })
      .from(battleQuestions)
      .innerJoin(questions, eq(battleQuestions.questionId, questions.id))
      .where(
        and(
          eq(battleQuestions.battleId, params.battleId),
          eq(battleQuestions.questionId, params.questionId)
        )
      )
      .limit(1);

    if (!battleQuestion) {
      throw new Error("Question does not belong to this battle.");
    }

    const [existingSub] = await tx
      .select({
        id: answerSubmissions.id,
        pointsAwarded: answerSubmissions.pointsAwarded,
      })
      .from(answerSubmissions)
      .where(
        and(
          eq(answerSubmissions.battleId, params.battleId),
          eq(answerSubmissions.userId, params.userId),
          eq(answerSubmissions.questionId, params.questionId)
        )
      )
      .limit(1);

    const timeLimitMs = battleQuestion.timeLimitSeconds * 1000;
    const clampedResponseTimeMs = Math.max(
      200,
      Math.min(timeLimitMs, params.clientElapsedMs)
    );

    let pointsAwarded = existingSub?.pointsAwarded ?? 0;

    if (!existingSub) {
      const isCorrect =
        !params.timedOut &&
        params.selectedOptionKey !== null &&
        params.selectedOptionKey === battleQuestion.correctOptionKey;

      pointsAwarded = calculateQuestionPoints({
        isCorrect,
        difficulty: battleQuestion.difficulty,
        clientElapsedMs: clampedResponseTimeMs,
        timeLimitSeconds: battleQuestion.timeLimitSeconds,
      });

      const storedOptionKey: OptionKey =
        params.selectedOptionKey ??
        (battleQuestion.correctOptionKey === "A" ? "B" : "A");

      await tx.insert(answerSubmissions).values({
        battleId: params.battleId,
        userId: params.userId,
        questionId: params.questionId,
        selectedOptionKey: storedOptionKey,
        isCorrect,
        responseTimeMs: params.timedOut ? timeLimitMs : clampedResponseTimeMs,
        pointsAwarded,
      });

      await tx
        .update(battleParticipants)
        .set({
          score: sql`${battleParticipants.score} + ${pointsAwarded}`,
          correctAnswersCount: isCorrect
            ? sql`${battleParticipants.correctAnswersCount} + 1`
            : battleParticipants.correctAnswersCount,
          totalResponseTimeMs: sql`${battleParticipants.totalResponseTimeMs} + ${
            params.timedOut ? timeLimitMs : clampedResponseTimeMs
          }`,
        })
        .where(eq(battleParticipants.id, participant.id));
    }

    const allBattleQuestions = await tx
      .select({
        questionId: battleQuestions.questionId,
        topicId: questions.topicId,
        topicName: topics.name,
      })
      .from(battleQuestions)
      .innerJoin(questions, eq(battleQuestions.questionId, questions.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(eq(battleQuestions.battleId, params.battleId));

    const totalQuestions = allBattleQuestions.length || battle.questionCount;

    const allSubmissions = await tx
      .select({
        userId: answerSubmissions.userId,
        questionId: answerSubmissions.questionId,
        isCorrect: answerSubmissions.isCorrect,
        responseTimeMs: answerSubmissions.responseTimeMs,
        pointsAwarded: answerSubmissions.pointsAwarded,
      })
      .from(answerSubmissions)
      .where(eq(answerSubmissions.battleId, params.battleId));

    const mySubmissions = allSubmissions.filter(
      (s) => s.userId === params.userId
    );
    const myAnsweredCount = mySubmissions.length;
    const myFinished = myAnsweredCount >= totalQuestions;

    if (myFinished && !existingSub) {
      await tx
        .update(battleParticipants)
        .set({ completedAt: new Date() })
        .where(eq(battleParticipants.id, participant.id));
    }

    const allParticipants = await tx
      .select({
        id: battleParticipants.id,
        userId: battleParticipants.userId,
        slotIndex: battleParticipants.slotIndex,
        score: battleParticipants.score,
        correctAnswersCount: battleParticipants.correctAnswersCount,
        totalResponseTimeMs: battleParticipants.totalResponseTimeMs,
      })
      .from(battleParticipants)
      .where(eq(battleParticipants.battleId, params.battleId))
      .orderBy(asc(battleParticipants.slotIndex));

    const everyoneFinished =
      allParticipants.length === 2 &&
      allParticipants.every((p) => {
        const count = allSubmissions.filter(
          (s) => s.userId === p.userId
        ).length;
        return count >= totalQuestions;
      });

    let finalStatus = "ACTIVE";

    if (everyoneFinished) {
      const p1 = allParticipants.find((p) => p.slotIndex === 1)!;
      const p2 = allParticipants.find((p) => p.slotIndex === 2)!;

      let winnerUserId: string | null = null;
      let isDraw = false;

      if (p1.score > p2.score) {
        winnerUserId = p1.userId;
      } else if (p2.score > p1.score) {
        winnerUserId = p2.userId;
      } else if (
        p1.score > 0 &&
        p1.totalResponseTimeMs < p2.totalResponseTimeMs
      ) {
        winnerUserId = p1.userId;
      } else if (
        p2.score > 0 &&
        p2.totalResponseTimeMs < p1.totalResponseTimeMs
      ) {
        winnerUserId = p2.userId;
      } else {
        isDraw = true;
      }

      const questionTopicMap = new Map(
        allBattleQuestions.map((q) => [
          q.questionId,
          { topicId: q.topicId, topicName: q.topicName },
        ])
      );

      const participantDiagnoses: Record<string, StoredParticipantDiagnosis> =
        {};

      for (const p of allParticipants) {
        const userSubs = allSubmissions.filter((s) => s.userId === p.userId);
        const totalSubCount = userSubs.length || 1;
        const totalCorrect = userSubs.filter((s) => s.isCorrect).length;
        const totalTime = userSubs.reduce(
          (acc, s) => acc + s.responseTimeMs,
          0
        );

        const topicStats = new Map<
          string,
          {
            topicId: string;
            topicName: string;
            totalQuestions: number;
            correctCount: number;
            totalTimeMs: number;
          }
        >();

        for (const q of allBattleQuestions) {
          const current = topicStats.get(q.topicId) ?? {
            topicId: q.topicId,
            topicName: q.topicName,
            totalQuestions: 0,
            correctCount: 0,
            totalTimeMs: 0,
          };
          current.totalQuestions += 1;
          topicStats.set(q.topicId, current);
        }

        for (const sub of userSubs) {
          const topicMeta = questionTopicMap.get(sub.questionId);
          if (!topicMeta) continue;
          const entry = topicStats.get(topicMeta.topicId);
          if (!entry) continue;
          if (sub.isCorrect) {
            entry.correctCount += 1;
          }
          entry.totalTimeMs += sub.responseTimeMs;
        }

        const topicBreakdowns: StoredTopicBreakdown[] = Array.from(
          topicStats.values()
        ).map((t) => {
          const accuracyPercent =
            t.totalQuestions > 0
              ? Math.round((t.correctCount / t.totalQuestions) * 100)
              : 0;
          return {
            topicId: t.topicId,
            topicName: t.topicName,
            totalQuestions: t.totalQuestions,
            correctCount: t.correctCount,
            accuracyPercent,
            averageResponseTimeMs:
              t.totalQuestions > 0
                ? Math.round(t.totalTimeMs / t.totalQuestions)
                : 0,
            needsPractice: accuracyPercent < 75,
          };
        });

        const recommendedPracticeTopicIds = topicBreakdowns
          .filter((tb) => tb.needsPractice)
          .map((tb) => tb.topicId);

        participantDiagnoses[p.userId] = {
          userId: p.userId,
          accuracyPercent: Math.round((totalCorrect / totalSubCount) * 100),
          averageResponseTimeMs: Math.round(totalTime / totalSubCount),
          topicBreakdowns,
          recommendedPracticeTopicIds,
        };
      }

      await tx
        .insert(battleResults)
        .values({
          battleId: params.battleId,
          winnerUserId,
          isDraw,
          creatorScore: p1.score,
          opponentScore: p2.score,
          participantDiagnoses,
        })
        .onConflictDoNothing();

      await tx
        .update(battles)
        .set({
          status: "COMPLETED",
          winnerUserId,
          isDraw,
          completedAt: new Date(),
        })
        .where(eq(battles.id, params.battleId));

      for (const p of allParticipants) {
        const won = !isDraw && winnerUserId === p.userId;
        const xpDelta = isDraw ? 100 : won ? 150 : 60;

        await tx
          .update(profiles)
          .set({
            xp: sql`${profiles.xp} + ${xpDelta}`,
            battlesPlayed: sql`${profiles.battlesPlayed} + 1`,
            battlesWon: won
              ? sql`${profiles.battlesWon} + 1`
              : profiles.battlesWon,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, p.userId));
      }

      finalStatus = "COMPLETED";
    }

    return {
      submitted: true,
      alreadySubmitted: Boolean(existingSub),
      pointsAwarded,
      answeredCount: myAnsweredCount,
      totalQuestions,
      myFinished,
      battleStatus: finalStatus,
    };
  });
}
