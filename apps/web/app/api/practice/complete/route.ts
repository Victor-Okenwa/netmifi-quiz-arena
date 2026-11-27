import {
  ensureBaseProfileForUser,
  getCurrentAuthContext,
} from "@/lib/supabase/auth";
import { db, eq, profiles, sql } from "@repo/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const completePracticeSchema = z.object({
  courseId: z.string().min(1),
  topicIds: z.array(z.string()).default([]),
  totalQuestions: z.number().int().min(1).max(50),
  correctCount: z.number().int().min(0).max(50),
  sourceBattleId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to record practice completion." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = completePracticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid practice completion payload." },
        { status: 400 }
      );
    }

    const { totalQuestions, correctCount } = parsed.data;
    const accuracyRatio =
      totalQuestions > 0
        ? Math.min(1, Math.max(0, correctCount / totalQuestions))
        : 0;

    // Base +25 XP for completing a targeted practice drill, up to +50 XP for >= 80% mastery
    const xpAwarded =
      accuracyRatio >= 0.8 ? 50 : accuracyRatio >= 0.5 ? 40 : 25;

    let newTotalXp = (authContext.profile?.xp ?? 0) + xpAwarded;

    try {
      await ensureBaseProfileForUser(authContext.user);
      const [updated] = await db
        .update(profiles)
        .set({
          xp: sql`${profiles.xp} + ${xpAwarded}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, authContext.user.id))
        .returning({ xp: profiles.xp });

      if (updated) {
        newTotalXp = updated.xp;
      }
    } catch {
      // Fallback if DB is unreachable
    }

    return NextResponse.json({
      xpAwarded,
      newTotalXp,
      accuracyPercent: Math.round(accuracyRatio * 100),
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to record practice completion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
