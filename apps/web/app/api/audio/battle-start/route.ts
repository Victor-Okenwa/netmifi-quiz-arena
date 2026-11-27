import { getOrCreateCachedAudioAsset } from "@/lib/audio/tts-cache";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { BATTLE_START_ANNOUNCEMENT_SCRIPT } from "@repo/elevenlabs";
import { NextResponse } from "next/server";

/**
 * GET / POST `/api/audio/battle-start`
 * Returns the globally cached "Battle Started" voice announcement URL.
 * Because `BATTLE_START_ANNOUNCEMENT_SCRIPT` is identical across all battles,
 * `getOrCreateCachedAudioAsset` hashes it once, stores it in `audio_assets` / Supabase Storage,
 * and reuses the cached MP3 across every battle in the platform.
 */
export async function GET() {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Please sign in to load battle audio." },
        { status: 401 }
      );
    }

    const resolved = await getOrCreateCachedAudioAsset({
      assetType: "winner_announcement",
      text: BATTLE_START_ANNOUNCEMENT_SCRIPT,
    });

    return NextResponse.json({
      audioUrl: resolved.audioUrl,
      cached: resolved.cached,
      speechText: resolved.speechText,
      fallbackReason: resolved.fallbackReason,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load battle start audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
