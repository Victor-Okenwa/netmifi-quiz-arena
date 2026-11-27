import { submitParticipantAnswer } from "@/lib/battle-engine/engine";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { optionKeySchema } from "@repo/validators";
import { NextResponse } from "next/server";
import { z } from "zod";

interface RouteContext {
  params: Promise<{
    battleId: string;
  }>;
}

const submitAnswerPayloadSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  selectedOptionKey: optionKeySchema.nullable().default(null),
  clientElapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(120_000)
    .default(15_000),
  timedOut: z.boolean().default(false),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to submit an answer." },
        { status: 401 }
      );
    }

    const { battleId } = await context.params;
    const body: unknown = await request.json();
    const parsed = submitAnswerPayloadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid answer submission.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { questionId, selectedOptionKey, clientElapsedMs, timedOut } =
      parsed.data;

    const result = await submitParticipantAnswer({
      battleId,
      userId: authContext.user.id,
      questionId,
      selectedOptionKey,
      clientElapsedMs,
      timedOut,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
