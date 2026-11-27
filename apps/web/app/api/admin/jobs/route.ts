import { getCurrentAuthContext } from "@/lib/supabase/auth";
import {
  contentSources,
  courses,
  db,
  desc,
  eq,
  ingestionJobs,
  topics,
} from "@repo/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db
      .select({
        id: ingestionJobs.id,
        sourceId: ingestionJobs.sourceId,
        status: ingestionJobs.status,
        questionsGeneratedCount: ingestionJobs.questionsGeneratedCount,
        errorMessage: ingestionJobs.errorMessage,
        startedAt: ingestionJobs.startedAt,
        completedAt: ingestionJobs.completedAt,
        createdAt: ingestionJobs.createdAt,
        sourceTitle: contentSources.title,
        sourceUrl: contentSources.sourceUrl,
        courseId: contentSources.courseId,
        courseCode: courses.code,
        courseTitle: courses.title,
        topicId: contentSources.topicId,
        topicName: topics.name,
      })
      .from(ingestionJobs)
      .innerJoin(contentSources, eq(ingestionJobs.sourceId, contentSources.id))
      .innerJoin(courses, eq(contentSources.courseId, courses.id))
      .innerJoin(topics, eq(contentSources.topicId, topics.id))
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[GET /api/admin/jobs] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
