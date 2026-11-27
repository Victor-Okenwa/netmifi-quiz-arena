import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { audioAssets, battles, db, eq, questions } from "@repo/db";
import {
  DEFAULT_ELEVENLABS_MODEL_ID,
  DEFAULT_ELEVENLABS_VOICE_ID,
  QUIZ_AUDIO_STORAGE_BUCKET,
  computeAudioContentHash,
  normalizeSpeechText,
  synthesizeSpeechMp3,
} from "@repo/elevenlabs";

export interface AudioResolutionResult {
  audioAssetId: string | null;
  audioUrl: string | null;
  cached: boolean;
  speechText: string;
  fallbackReason?: string;
}

function uint8ArrayToBase64DataUrl(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

async function linkAudioAssetToEntity(params: {
  audioAssetId: string;
  questionId?: string;
  battleId?: string;
}) {
  try {
    if (params.questionId) {
      await db
        .update(questions)
        .set({ audioAssetId: params.audioAssetId })
        .where(eq(questions.id, params.questionId));
    }
    if (params.battleId) {
      await db
        .update(battles)
        .set({ winnerAnnouncementAudioId: params.audioAssetId })
        .where(eq(battles.id, params.battleId));
    }
  } catch {
    // Non-blocking link update
  }
}

/**
 * Uploads the synthesized MP3 buffer to Supabase Storage (`quiz-audio` bucket)
 * if `SUPABASE_SERVICE_ROLE_KEY` is configured; otherwise returns a cached
 * base64 data URL stored in `audio_assets.publicUrl` so duplicate ElevenLabs calls never occur.
 */
async function uploadAudioToSupabaseOrDataUrl(params: {
  storagePath: string;
  audioBuffer: Uint8Array;
}): Promise<string> {
  const adminSupabase = createAdminSupabaseClient();
  if (!adminSupabase) {
    return uint8ArrayToBase64DataUrl(params.audioBuffer);
  }

  try {
    // Ensure the public `quiz-audio` bucket exists
    await adminSupabase.storage
      .createBucket(QUIZ_AUDIO_STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ["audio/mpeg", "audio/mp3"],
      })
      .catch(() => {
        // Ignore error if bucket already exists
      });

    const { error: uploadError } = await adminSupabase.storage
      .from(QUIZ_AUDIO_STORAGE_BUCKET)
      .upload(params.storagePath, params.audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      return uint8ArrayToBase64DataUrl(params.audioBuffer);
    }

    const { data } = adminSupabase.storage
      .from(QUIZ_AUDIO_STORAGE_BUCKET)
      .getPublicUrl(params.storagePath);

    return data.publicUrl || uint8ArrayToBase64DataUrl(params.audioBuffer);
  } catch {
    return uint8ArrayToBase64DataUrl(params.audioBuffer);
  }
}

/**
 * Deterministic TTS caching pipeline:
 * 1. Computes `sha256(normalizedText | voiceId | modelId)`.
 * 2. Checks `audio_assets` in PostgreSQL for an existing ready asset.
 * 3. On hit: links & returns `existing.publicUrl` with zero ElevenLabs API calls.
 * 4. On miss: calls ElevenLabs, uploads MP3 to Supabase Storage (`quiz-audio`),
 *    persists in `audio_assets`, links to `questions` or `battles`, and returns the URL.
 * 5. Never throws or blocks if `ELEVENLABS_API_KEY` is missing or offline — returns `audioUrl: null`
 *    with `speechText` so the client gracefully degrades to Web Speech / text display.
 */
export async function getOrCreateCachedAudioAsset(params: {
  assetType: "question" | "winner_announcement";
  text: string;
  questionId?: string;
  battleId?: string;
}): Promise<AudioResolutionResult> {
  const env = getServerEnv();
  const normalizedText = normalizeSpeechText(params.text);
  const voiceId = env.ELEVENLABS_DEFAULT_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
  const modelId = DEFAULT_ELEVENLABS_MODEL_ID;

  if (!normalizedText) {
    return {
      audioAssetId: null,
      audioUrl: null,
      cached: false,
      speechText: "",
      fallbackReason: "empty_text",
    };
  }

  const contentHash = await computeAudioContentHash({
    text: normalizedText,
    voiceId,
    modelId,
  });

  // 1. Check PostgreSQL cache by contentHash
  try {
    const [existingAsset] = await db
      .select({
        id: audioAssets.id,
        publicUrl: audioAssets.publicUrl,
        status: audioAssets.status,
      })
      .from(audioAssets)
      .where(eq(audioAssets.contentHash, contentHash))
      .limit(1);

    if (existingAsset && existingAsset.status === "ready" && existingAsset.publicUrl) {
      await linkAudioAssetToEntity({
        audioAssetId: existingAsset.id,
        questionId: params.questionId,
        battleId: params.battleId,
      });

      return {
        audioAssetId: existingAsset.id,
        audioUrl: existingAsset.publicUrl,
        cached: true,
        speechText: normalizedText,
      };
    }
  } catch {
    // Continue to generation or graceful fallback if DB read failed
  }

  // 2. If ELEVENLABS_API_KEY is not configured, gracefully return fallback text
  if (!env.ELEVENLABS_API_KEY) {
    return {
      audioAssetId: null,
      audioUrl: null,
      cached: false,
      speechText: normalizedText,
      fallbackReason: "elevenlabs_api_key_not_configured",
    };
  }

  // 3. Cache miss -> Synthesize with ElevenLabs, upload to Supabase Storage, and store in audio_assets
  try {
    const synthesized = await synthesizeSpeechMp3({
      apiKey: env.ELEVENLABS_API_KEY,
      text: normalizedText,
      voiceId,
      modelId,
    });

    const storagePath = `${params.assetType}/${contentHash}.mp3`;
    const publicUrl = await uploadAudioToSupabaseOrDataUrl({
      storagePath,
      audioBuffer: synthesized.audioBuffer,
    });

    let savedAssetId: string | null = null;

    try {
      const [inserted] = await db
        .insert(audioAssets)
        .values({
          assetType: params.assetType,
          contentHash,
          voiceId,
          modelId,
          storagePath,
          publicUrl,
          status: "ready",
        })
        .onConflictDoUpdate({
          target: audioAssets.contentHash,
          set: {
            publicUrl,
            status: "ready",
          },
        })
        .returning({ id: audioAssets.id });

      if (inserted) {
        savedAssetId = inserted.id;
        await linkAudioAssetToEntity({
          audioAssetId: inserted.id,
          questionId: params.questionId,
          battleId: params.battleId,
        });
      }
    } catch {
      // Non-blocking DB cache write failure
    }

    return {
      audioAssetId: savedAssetId,
      audioUrl: publicUrl,
      cached: false,
      speechText: normalizedText,
    };
  } catch (err) {
    return {
      audioAssetId: null,
      audioUrl: null,
      cached: false,
      speechText: normalizedText,
      fallbackReason:
        err instanceof Error ? err.message : "elevenlabs_synthesis_failed",
    };
  }
}
