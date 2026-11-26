/**
 * Server-only ElevenLabs TTS integration for reading quiz questions aloud
 * and generating spoken battle winner announcements.
 * Full TTS and Supabase Storage caching pipeline is implemented in Milestone 7.
 */

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
