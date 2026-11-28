"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceAudioButtonProps {
  mode: "question" | "winner";
  questionId?: string;
  battleId?: string;
  initialAudioUrl?: string | null;
  fallbackText: string;
  label?: string;
  autoPlay?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function VoiceAudioButton({
  mode,
  questionId,
  battleId,
  initialAudioUrl = null,
  fallbackText,
  label = "Read Aloud",
  autoPlay = false,
  variant = "outline",
  size = "sm",
  className,
}: VoiceAudioButtonProps) {
  const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(
    initialAudioUrl,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedEntityRef = useRef<string | null>(null);
  const activeEntityKey = mode === "question" ? questionId : battleId;

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  const playWithBrowserSpeechSynthesis = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsPlaying(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const playAudioUrlOrFallback = useCallback(
    async (url: string | null, textToSpeak: string) => {
      if (!url) {
        playWithBrowserSpeechSynthesis(textToSpeak);
        return;
      }

      try {
        // Reuse preloaded HTMLAudioElement if it matches the URL for instant zero-lag playback
        const audio =
          preloadedAudioRef.current && preloadedAudioRef.current.src === url
            ? preloadedAudioRef.current
            : new Audio(url);
        audio.currentTime = 0;
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          audioRef.current = null;
          playWithBrowserSpeechSynthesis(textToSpeak);
        };
        setIsPlaying(true);
        await audio.play();
      } catch {
        audioRef.current = null;
        playWithBrowserSpeechSynthesis(textToSpeak);
      }
    },
    [playWithBrowserSpeechSynthesis],
  );

  // Stop any playing audio and reset cached URL when the active question or battle changes
  useEffect(() => {
    stopPlayback();
    setCachedAudioUrl(initialAudioUrl);
    if (initialAudioUrl && typeof window !== "undefined") {
      const pre = new Audio(initialAudioUrl);
      pre.preload = "auto";
      pre.load();
      preloadedAudioRef.current = pre;
    }
    return () => {
      stopPlayback();
    };
  }, [activeEntityKey, initialAudioUrl, stopPlayback]);

  // Automatic preload + autoplay when `autoPlay` is enabled (e.g., Winner Announcement)
  useEffect(() => {
    if (!autoPlay || !activeEntityKey) return;
    if (autoPlayedEntityRef.current === activeEntityKey) return;
    autoPlayedEntityRef.current = activeEntityKey;

    let cancelled = false;

    async function preloadAndAutoPlay() {
      if (initialAudioUrl) {
        if (!cancelled) {
          await playAudioUrlOrFallback(initialAudioUrl, fallbackText);
        }
        return;
      }

      setIsLoading(true);
      try {
        const endpoint =
          mode === "question" ? "/api/audio/question" : "/api/audio/winner";
        const payload =
          mode === "question"
            ? { questionId: questionId ?? "" }
            : { battleId: battleId ?? "" };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (cancelled) return;

        if (!res.ok) {
          playWithBrowserSpeechSynthesis(fallbackText);
          return;
        }

        const data = (await res.json()) as {
          audioUrl?: string | null;
          speechText?: string;
        };

        if (cancelled) return;

        const nextUrl = data.audioUrl ?? null;
        const speechText = data.speechText || fallbackText;
        if (nextUrl) {
          setCachedAudioUrl(nextUrl);
          const pre = new Audio(nextUrl);
          pre.preload = "auto";
          pre.load();
          preloadedAudioRef.current = pre;
        }

        await playAudioUrlOrFallback(nextUrl, speechText);
      } catch {
        if (!cancelled) {
          playWithBrowserSpeechSynthesis(fallbackText);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void preloadAndAutoPlay();

    return () => {
      cancelled = true;
    };
  }, [
    autoPlay,
    activeEntityKey,
    battleId,
    fallbackText,
    initialAudioUrl,
    mode,
    playAudioUrlOrFallback,
    playWithBrowserSpeechSynthesis,
    questionId,
  ]);

  async function handleToggleAudio() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (cachedAudioUrl) {
      await playAudioUrlOrFallback(cachedAudioUrl, fallbackText);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint =
        mode === "question" ? "/api/audio/question" : "/api/audio/winner";
      const payload =
        mode === "question"
          ? { questionId: questionId ?? "" }
          : { battleId: battleId ?? "" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        playWithBrowserSpeechSynthesis(fallbackText);
        return;
      }

      const data = (await res.json()) as {
        audioUrl?: string | null;
        speechText?: string;
      };

      const nextUrl = data.audioUrl ?? null;
      const speechText = data.speechText || fallbackText;
      if (nextUrl) {
        setCachedAudioUrl(nextUrl);
      }

      await playAudioUrlOrFallback(nextUrl, speechText);
    } catch {
      playWithBrowserSpeechSynthesis(fallbackText);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={isPlaying ? "default" : variant}
      size={size}
      disabled={isLoading}
      onClick={() => void handleToggleAudio()}
      className={`gap-1.5 font-game text-xs font-bold ${className ?? ""}`}
      title={isPlaying ? "Stop audio" : label}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="size-3.5" />
      ) : (
        <Volume2 className="size-3.5 text-primary" />
      )}
      <span>
        {isLoading ? "Loading Voice..." : isPlaying ? "Stop Audio" : label}
      </span>
    </Button>
  );
}
