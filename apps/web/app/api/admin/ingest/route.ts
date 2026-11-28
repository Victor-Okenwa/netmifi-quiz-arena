import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { createAndRunIngestionJob } from "@/lib/question-factory/service";
import { ingestSourceUrlSchema } from "@repo/validators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ingestSourceUrlSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: issue
            ? `${issue.path.join(".")}: ${issue.message}`
            : "Invalid ingestion parameters.",
        },
        { status: 400 },
      );
    }

    const result = await createAndRunIngestionJob({
      courseCode: parsed.data.courseCode,
      courseTitle: parsed.data.courseTitle,
      topicName: parsed.data.topicName,
      academicLevel: parsed.data.academicLevel,
      sourceUrl: parsed.data.sourceUrl,
      sourceTitle: parsed.data.sourceTitle,
      submittedByUserId: auth.user.id,
      maxPages: parsed.data.maxPages,
    });

    return NextResponse.json(
      {
        success: true,
        jobId: result.jobId,
        sourceId: result.sourceId,
        courseId: result.courseId,
        topicId: result.topicId,
        message: "Ingestion job successfully queued and started.",
      },
      { status: 201 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    console.error("[POST /api/admin/ingest] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
