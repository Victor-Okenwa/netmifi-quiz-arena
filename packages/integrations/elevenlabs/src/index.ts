/**
 * Server-only ElevenLabs Text-to-Speech (TTS) integration for reading quiz
 * questions aloud and generating spoken battle winner announcements.
 *
 * Enforces deterministic SHA-256 content hashing (`sha256(normalizedText | voiceId | modelId)`)
 * so identical prompts reuse cached audio assets in Supabase Storage and PostgreSQL.
 */

export const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
export const QUIZ_AUDIO_STORAGE_BUCKET = "quiz-audio";

export interface VoiceSynthesisOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface CachedAudioMetadata {
  contentHash: string;
  storagePath: string;
  publicOrSignedUrl: string;
  voiceId: string;
  format: "mp3";
}

export interface SynthesizedSpeechResult {
  audioBuffer: Uint8Array;
  contentHash: string;
  normalizedText: string;
  voiceId: string;
  modelId: string;
  mimeType: "audio/mpeg";
}

export interface WinnerAnnouncementScriptParams {
  courseCode: string;
  courseTitle: string;
  isDraw: boolean;
  winnerName: string | null;
  winnerScore: number;
  loserName: string | null;
  loserScore: number;
}

/**
 * Normalizes whitespace and trims text so identical questions always produce
 * the exact same content hash.
 */
export function normalizeSpeechText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Computes a deterministic SHA-256 hex digest using the Web Crypto API / pure JS fallback
 * over `${normalizedText}|${voiceId}|${modelId}`.
 */
export async function computeAudioContentHash(
  options: VoiceSynthesisOptions
): Promise<string> {
  const normalizedText = normalizeSpeechText(options.text);
  const voiceId = (options.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID).trim();
  const modelId = (options.modelId ?? DEFAULT_ELEVENLABS_MODEL_ID).trim();
  const payload = `${normalizedText}|${voiceId}|${modelId}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Builds a concise, energetic spoken winner announcement script for a completed battle.
 */
export function buildWinnerAnnouncementScript(
  params: WinnerAnnouncementScriptParams
): string {
  const courseLabel = params.courseCode.trim() || params.courseTitle.trim();

  if (params.isDraw) {
    const p1 = params.winnerName ?? "Player 1";
    const p2 = params.loserName ?? "Player 2";
    return normalizeSpeechText(
      `Battle complete in ${courseLabel}! It is a draw between ${p1} and ${p2}, with both players finishing at ${params.winnerScore} points!`
    );
  }

  const winner = params.winnerName ?? "The champion";
  const opponent = params.loserName ?? "their opponent";

  return normalizeSpeechText(
    `Congratulations! ${winner} has won the ${courseLabel} quiz battle with ${params.winnerScore} points against ${opponent}'s ${params.loserScore} points!`
  );
}

/**
 * Calls the ElevenLabs v1 Text-to-Speech REST API on the server and returns
 * the MP3 audio buffer along with its deterministic content hash.
 */
export async function synthesizeSpeechMp3(params: {
  apiKey: string;
  text: string;
  voiceId?: string;
  modelId?: string;
}): Promise<SynthesizedSpeechResult> {
  if (typeof window !== "undefined") {
    throw new Error(
      "synthesizeSpeechMp3() is server-only and must never be called in the browser."
    );
  }

  const normalizedText = normalizeSpeechText(params.text);
  if (!normalizedText) {
    throw new Error("Cannot synthesize empty speech text.");
  }

  const voiceId = (params.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID).trim();
  const modelId = (params.modelId ?? DEFAULT_ELEVENLABS_MODEL_ID).trim();
  const contentHash = await computeAudioContentHash({
    text: normalizedText,
    voiceId,
    modelId,
  });

  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    voiceId
  )}?output_format=mp3_44100_128`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": params.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: normalizedText,
      model_id: modelId,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown API error");
    throw new Error(
      `ElevenLabs TTS request failed (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBuffer: new Uint8Array(arrayBuffer),
    contentHash,
    normalizedText,
    voiceId,
    modelId,
    mimeType: "audio/mpeg",
  };
}
