import { getCurrentAuthContext } from "@/lib/supabase/auth";
import {
  and,
  contentSources,
  courses,
  db,
  desc,
  eq,
  questionOptions,
  questions,
  topics,
} from "@repo/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const topicId = searchParams.get("topicId");
    const status = searchParams.get("status") as "draft" | "approved" | "rejected" | null;
    const sourceId = searchParams.get("sourceId");

    const conditions = [];

    if (courseId) {
      conditions.push(eq(questions.courseId, courseId));
    }
    if (topicId) {
      conditions.push(eq(questions.topicId, topicId));
    }
    if (status) {
      conditions.push(eq(questions.approvalStatus, status));
    }
    if (sourceId) {
      conditions.push(eq(questions.sourceId, sourceId));
    }

    const query = db
      .select({
        id: questions.id,
        courseId: questions.courseId,
        courseCode: courses.code,
        courseTitle: courses.title,
        topicId: questions.topicId,
        topicName: topics.name,
        sourceId: questions.sourceId,
        sourceTitle: contentSources.title,
        sourceUrl: contentSources.sourceUrl,
        questionText: questions.questionText,
        difficulty: questions.difficulty,
        correctOptionKey: questions.correctOptionKey,
        explanation: questions.explanation,
        approvalStatus: questions.approvalStatus,
        reviewedAt: questions.reviewedAt,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .innerJoin(courses, eq(questions.courseId, courses.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(contentSources, eq(questions.sourceId, contentSources.id))
      .orderBy(desc(questions.createdAt))
      .limit(100);

    const questionRows =
      conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

    if (questionRows.length === 0) {
      return NextResponse.json({ success: true, questions: [] });
    }

    // Fetch associated options for all returned questions
    const questionIds = questionRows.map((q) => q.id);
    const optionsRows = await db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        optionKey: questionOptions.optionKey,
        optionText: questionOptions.optionText,
      })
      .from(questionOptions)
      .where(
        eq(
          questionOptions.questionId,
          questionIds[0] ?? ""
        ) // fallback or loop
      );

    // Group options by question ID across all found questions
    const allOptions = await db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        optionKey: questionOptions.optionKey,
        optionText: questionOptions.optionText,
      })
      .from(questionOptions);

    const optionsByQuestion = new Map<string, Record<string, string>>();
    for (const opt of allOptions) {
      if (!optionsByQuestion.has(opt.questionId)) {
        optionsByQuestion.set(opt.questionId, {});
      }
      const map = optionsByQuestion.get(opt.questionId);
      if (map) {
        map[opt.optionKey] = opt.optionText;
      }
    }

    const enriched = questionRows.map((q) => ({
      ...q,
      options: optionsByQuestion.get(q.id) ?? {
        A: "Option A",
        B: "Option B",
        C: "Option C",
        D: "Option D",
      },
    }));

    return NextResponse.json({
      success: true,
      questions: enriched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[GET /api/admin/questions] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
