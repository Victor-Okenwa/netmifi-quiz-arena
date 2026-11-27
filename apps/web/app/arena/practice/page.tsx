import { ArenaNavbar } from "@/components/arena/arena-navbar";
import {
  type PracticeCourseOption,
  type PracticeDrillQuestion,
  type PracticeTopicOption,
  TargetedPracticeDrill,
} from "@/components/arena/targeted-practice-drill";
import {
  FALLBACK_COURSES,
  FALLBACK_TOPICS,
} from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import {
  and,
  asc,
  courses,
  db,
  eq,
  inArray,
  questionOptions,
  questions,
  topics,
} from "@repo/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PracticePageProps {
  searchParams: Promise<{
    courseId?: string;
    topicId?: string;
    battleId?: string;
  }>;
}

export default async function PracticePage({
  searchParams,
}: PracticePageProps) {
  const { profile } = await requireOnboardedStudent();
  const resolvedParams = await searchParams;

  const requestedTopicIds = resolvedParams.topicId
    ? resolvedParams.topicId
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  let allCourses: PracticeCourseOption[] = FALLBACK_COURSES.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
  }));
  let allTopics: PracticeTopicOption[] = FALLBACK_TOPICS.map((t) => ({
    id: t.id,
    courseId: t.courseId,
    name: t.name,
  }));
  let drillQuestions: PracticeDrillQuestion[] = [];

  try {
    const [dbCourses, dbTopics] = await Promise.all([
      db
        .select({
          id: courses.id,
          code: courses.code,
          title: courses.title,
        })
        .from(courses)
        .orderBy(asc(courses.code)),
      db
        .select({
          id: topics.id,
          courseId: topics.courseId,
          name: topics.name,
        })
        .from(topics)
        .orderBy(asc(topics.orderIndex)),
    ]);

    if (dbCourses.length > 0) {
      allCourses = dbCourses;
      allTopics = dbTopics;
    }
  } catch {
    // Use fallback courses & topics
  }

  const activeCourseId =
    allCourses.find((c) => c.id === resolvedParams.courseId)?.id ??
    (requestedTopicIds.length > 0
      ? allTopics.find((t) => t.id === requestedTopicIds[0])?.courseId
      : undefined) ??
    allCourses[0]?.id ??
    "";

  try {
    const conditions = [eq(questions.approvalStatus, "approved")];
    if (requestedTopicIds.length > 0) {
      conditions.push(inArray(questions.topicId, requestedTopicIds));
    } else if (activeCourseId) {
      conditions.push(eq(questions.courseId, activeCourseId));
    }

    let rawQuestions = await db
      .select({
        id: questions.id,
        courseId: questions.courseId,
        courseCode: courses.code,
        courseTitle: courses.title,
        topicId: questions.topicId,
        topicName: topics.name,
        questionText: questions.questionText,
        difficulty: questions.difficulty,
        correctOptionKey: questions.correctOptionKey,
        explanation: questions.explanation,
      })
      .from(questions)
      .innerJoin(courses, eq(questions.courseId, courses.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(and(...conditions))
      .limit(10);

    // If topic filter yielded 0 questions, fall back to course questions
    if (rawQuestions.length === 0 && activeCourseId) {
      rawQuestions = await db
        .select({
          id: questions.id,
          courseId: questions.courseId,
          courseCode: courses.code,
          courseTitle: courses.title,
          topicId: questions.topicId,
          topicName: topics.name,
          questionText: questions.questionText,
          difficulty: questions.difficulty,
          correctOptionKey: questions.correctOptionKey,
          explanation: questions.explanation,
        })
        .from(questions)
        .innerJoin(courses, eq(questions.courseId, courses.id))
        .innerJoin(topics, eq(questions.topicId, topics.id))
        .where(
          and(
            eq(questions.courseId, activeCourseId),
            eq(questions.approvalStatus, "approved")
          )
        )
        .limit(10);
    }

    const qIds = rawQuestions.map((q) => q.id);
    const rawOptions =
      qIds.length > 0
        ? await db
            .select({
              id: questionOptions.id,
              questionId: questionOptions.questionId,
              key: questionOptions.optionKey,
              text: questionOptions.optionText,
            })
            .from(questionOptions)
            .where(inArray(questionOptions.questionId, qIds))
            .orderBy(asc(questionOptions.optionKey))
        : [];

    drillQuestions = rawQuestions.map((q) => ({
      ...q,
      options: rawOptions
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          key: o.key,
          text: o.text,
        })),
    }));
  } catch {
    // Database unreachable fallback
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background text-foreground">
      <ArenaNavbar profile={profile} activeTab="practice" />

      <main className="mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div>
          <Link
            href={
              resolvedParams.battleId
                ? `/arena/battle/${resolvedParams.battleId}`
                : "/arena"
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {resolvedParams.battleId
              ? "Back to Battle Diagnosis"
              : "Back to Arena Lobby"}
          </Link>
        </div>

        <TargetedPracticeDrill
          questions={drillQuestions}
          courses={allCourses}
          topics={allTopics}
          selectedCourseId={activeCourseId}
          selectedTopicIds={requestedTopicIds}
          sourceBattleId={resolvedParams.battleId}
        />
      </main>
    </div>
  );
}
