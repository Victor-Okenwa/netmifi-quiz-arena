import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { and, db, eq, questionOptions, questions } from "@repo/db";
import { questionDraftReviewSchema } from "@repo/validators";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    if (!questionId) {
      return NextResponse.json({ error: "Missing question ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = questionDraftReviewSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid review parameters." },
        { status: 400 }
      );
    }

    const targetStatus = parsed.data.action === "approve" ? "approved" : "rejected";

    // Build update object
    const updateValues: Record<string, unknown> = {
      approvalStatus: targetStatus,
      reviewedByUserId: auth.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (parsed.data.questionText) {
      updateValues.questionText = parsed.data.questionText;
    }
    if (parsed.data.explanation) {
      updateValues.explanation = parsed.data.explanation;
    }
    if (parsed.data.difficulty) {
      updateValues.difficulty = parsed.data.difficulty;
    }
    if (parsed.data.correctOptionKey) {
      updateValues.correctOptionKey = parsed.data.correctOptionKey;
    }

    const [updatedQuestion] = await db
      .update(questions)
      .set(updateValues)
      .where(eq(questions.id, questionId))
      .returning({
        id: questions.id,
        approvalStatus: questions.approvalStatus,
      });

    if (!updatedQuestion) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    // Update options if modified during review
    if (parsed.data.options) {
      const optionKeys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
      for (const key of optionKeys) {
        const textVal = parsed.data.options[key];
        if (textVal) {
          await db
            .update(questionOptions)
            .set({ optionText: textVal })
            .where(
              and(
                eq(questionOptions.questionId, questionId),
                eq(questionOptions.optionKey, key)
              )
            );
        }
      }
    }

    return NextResponse.json({
      success: true,
      questionId: updatedQuestion.id,
      status: updatedQuestion.approvalStatus,
      message: `Question marked as ${updatedQuestion.approvalStatus}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[PATCH /api/admin/questions/[questionId]] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
