import { getOrCreateCachedAudioAsset } from "@/lib/audio/tts-cache";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { audioAssets, db, eq, questions } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const questionAudioRequestSchema = z.object({
  questionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to play question audio." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = questionAudioRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid questionId." },
        { status: 400 },
      );
    }

    const { questionId } = parsed.data;

    // Strictly select ONLY questionText and existing audioAsset — never select correctOptionKey or explanation
    const [questionRow] = await db
      .select({
        id: questions.id,
        questionText: questions.questionText,
        existingPublicUrl: audioAssets.publicUrl,
      })
      .from(questions)
      .leftJoin(audioAssets, eq(questions.audioAssetId, audioAssets.id))
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!questionRow) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 },
      );
    }

    if (questionRow.existingPublicUrl) {
      return NextResponse.json({
        audioUrl: questionRow.existingPublicUrl,
        cached: true,
        speechText: questionRow.questionText,
      });
    }

    const resolved = await getOrCreateCachedAudioAsset({
      assetType: "question",
      text: questionRow.questionText,
      questionId: questionRow.id,
    });

    return NextResponse.json({
      audioUrl: resolved.audioUrl,
      cached: resolved.cached,
      speechText: resolved.speechText,
      fallbackReason: resolved.fallbackReason,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load question audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
