import { getOrCreateCachedAudioAsset } from "@/lib/audio/tts-cache";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import {
  asc,
  audioAssets,
  battleParticipants,
  battles,
  courses,
  db,
  eq,
  profiles,
} from "@repo/db";
import { buildWinnerAnnouncementScript } from "@repo/elevenlabs";
import { NextResponse } from "next/server";
import { z } from "zod";

const winnerAudioRequestSchema = z.object({
  battleId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to play winner announcement." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = winnerAudioRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid battleId." },
        { status: 400 }
      );
    }

    const { battleId } = parsed.data;

    const [battleRow] = await db
      .select({
        id: battles.id,
        status: battles.status,
        winnerUserId: battles.winnerUserId,
        isDraw: battles.isDraw,
        courseCode: courses.code,
        courseTitle: courses.title,
        existingPublicUrl: audioAssets.publicUrl,
      })
      .from(battles)
      .innerJoin(courses, eq(battles.courseId, courses.id))
      .leftJoin(
        audioAssets,
        eq(battles.winnerAnnouncementAudioId, audioAssets.id)
      )
      .where(eq(battles.id, battleId))
      .limit(1);

    if (!battleRow) {
      return NextResponse.json(
        { error: "Battle not found." },
        { status: 404 }
      );
    }

    if (battleRow.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Winner announcement is only available for completed battles." },
        { status: 400 }
      );
    }

    const participantRows = await db
      .select({
        userId: battleParticipants.userId,
        slotIndex: battleParticipants.slotIndex,
        score: battleParticipants.score,
        displayName: profiles.displayName,
      })
      .from(battleParticipants)
      .innerJoin(profiles, eq(battleParticipants.userId, profiles.id))
      .where(eq(battleParticipants.battleId, battleId))
      .orderBy(asc(battleParticipants.slotIndex));

    const playerOne = participantRows.find((p) => p.slotIndex === 1) ?? null;
    const playerTwo = participantRows.find((p) => p.slotIndex === 2) ?? null;

    const winnerParticipant =
      participantRows.find((p) => p.userId === battleRow.winnerUserId) ??
      playerOne;
    const loserParticipant =
      participantRows.find((p) => p.userId !== winnerParticipant?.userId) ??
      playerTwo;

    const script = buildWinnerAnnouncementScript({
      courseCode: battleRow.courseCode,
      courseTitle: battleRow.courseTitle,
      isDraw: battleRow.isDraw,
      winnerName: winnerParticipant?.displayName ?? "Player 1",
      winnerScore: winnerParticipant?.score ?? 0,
      loserName: loserParticipant?.displayName ?? "Player 2",
      loserScore: loserParticipant?.score ?? 0,
    });

    if (battleRow.existingPublicUrl) {
      return NextResponse.json({
        audioUrl: battleRow.existingPublicUrl,
        cached: true,
        speechText: script,
      });
    }

    const resolved = await getOrCreateCachedAudioAsset({
      assetType: "winner_announcement",
      text: script,
      battleId: battleRow.id,
    });

    return NextResponse.json({
      audioUrl: resolved.audioUrl,
      cached: resolved.cached,
      speechText: resolved.speechText,
      fallbackReason: resolved.fallbackReason,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load winner announcement audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
