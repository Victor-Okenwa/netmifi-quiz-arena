"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { VoiceAudioButton } from "@/components/arena/voice-audio-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ArenaParticipantState,
  CompletedBattleSummary,
  SanitizedBattleArenaState,
  SpectatorAnsweredQuestionItem,
} from "@/lib/battle-engine/engine";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { OptionKey, PublicBattleQuestion } from "@repo/types";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
  PlusCircle,
  RotateCcw,
  Swords,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface LiveBattleQuizProps {
  battleId: string;
  currentUserId: string;
}

function areParticipantProgressEqual(
  a: ArenaParticipantState[],
  b: ArenaParticipantState[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pA = a[i];
    const pB = b[i];
    if (!pA || !pB) return false;
    if (
      pA.userId !== pB.userId ||
      pA.score !== pB.score ||
      pA.answeredCount !== pB.answeredCount ||
      pA.isFinished !== pB.isFinished ||
      pA.correctAnswersCount !== pB.correctAnswersCount
    ) {
      return false;
    }
  }
  return true;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function areSpectatorFeedsEqual(
  a: Record<string, SpectatorAnsweredQuestionItem[]>,
  b: Record<string, SpectatorAnsweredQuestionItem[]>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const listA = a[key] ?? [];
    const listB = b[key] ?? [];
    if (listA.length !== listB.length) return false;
    for (let i = 0; i < listA.length; i++) {
      if (
        listA[i]?.questionId !== listB[i]?.questionId ||
        listA[i]?.correctOptionKey !== listB[i]?.correctOptionKey
      ) {
        return false;
      }
    }
  }
  return true;
}

export function LiveBattleQuiz({
  battleId,
  currentUserId,
}: LiveBattleQuizProps) {
  const router = useRouter();
  const [viewerRole, setViewerRole] = useState<"participant" | "spectator">(
    "participant"
  );
  const [questions, setQuestions] = useState<PublicBattleQuestion[]>([]);
  const [battleMeta, setBattleMeta] = useState<
    SanitizedBattleArenaState["battle"] | null
  >(null);
  const [myAnsweredQuestionIds, setMyAnsweredQuestionIds] = useState<string[]>(
    []
  );
  const [participants, setParticipants] = useState<ArenaParticipantState[]>([]);
  const [spectatorFeeds, setSpectatorFeeds] = useState<
    Record<string, SpectatorAnsweredQuestionItem[]>
  >({});
  const [completedSummary, setCompletedSummary] =
    useState<CompletedBattleSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingRematch, setIsCreatingRematch] = useState(false);
  const [rematchOffer, setRematchOffer] = useState<{
    rematchBattleId: string;
    inviteCode: string;
    challengerName: string;
  } | null>(null);

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(15);
  const questionStartedAtRef = useRef<number>(Date.now());
  const activeQuestionIdRef = useRef<string | null>(null);
  const autoSubmittedForQuestionRef = useRef<string | null>(null);
  const announcedCompletionRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  const channelRef = useRef<ReturnType<
    ReturnType<typeof createBrowserSupabaseClient>["channel"]
  > | null>(null);

  const fetchArenaState = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${battleId}/arena`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as SanitizedBattleArenaState;

      setViewerRole(data.viewerRole);

      if (data.questions.length > 0) {
        setQuestions((prev) => (prev.length === 0 ? data.questions : prev));
      }

      setBattleMeta((prev) => {
        if (
          prev &&
          prev.status === data.battle.status &&
          prev.winnerUserId === data.battle.winnerUserId &&
          prev.isDraw === data.battle.isDraw
        ) {
          return prev;
        }
        return data.battle;
      });

      setMyAnsweredQuestionIds((prev) =>
        areStringArraysEqual(prev, data.myAnsweredQuestionIds)
          ? prev
          : data.myAnsweredQuestionIds
      );

      setParticipants((prev) =>
        areParticipantProgressEqual(prev, data.participants)
          ? prev
          : data.participants
      );

      if (data.spectatorFeeds) {
        setSpectatorFeeds((prev) =>
          areSpectatorFeedsEqual(prev, data.spectatorFeeds)
            ? prev
            : data.spectatorFeeds
        );
      }

      if (data.completedSummary) {
        setCompletedSummary((prev) => prev ?? data.completedSummary);
      }

      if (
        data.battle.status === "COMPLETED" &&
        !announcedCompletionRef.current
      ) {
        announcedCompletionRef.current = true;
        if (data.viewerRole === "spectator") {
          toast.success("Match finished!", {
            description: "Full participant summaries are now unlocked.",
          });
        } else if (data.battle.isDraw) {
          toast.info("Battle ended in a draw!", {
            description: "Both players matched scores.",
          });
        } else if (data.battle.winnerUserId === currentUserId) {
          toast.success("Victory! You won the battle!", {
            description: `+${data.completedSummary?.xpAwarded ?? 150} XP earned.`,
          });
        } else {
          toast.info("Battle completed!", {
            description: "Review your topic breakdown below.",
          });
        }
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setIsLoading(false);
    }
  }, [battleId, currentUserId]);

  const isBattleCompleted = battleMeta?.status === "COMPLETED";

  useEffect(() => {
    void fetchArenaState();

    let isMounted = true;

    try {
      const supabase = createBrowserSupabaseClient();
      const channel = supabase
        .channel(`battle-arena:${battleId}`)
        .on("broadcast", { event: "arena_updated" }, () => {
          if (isMounted) {
            void fetchArenaState();
          }
        })
        .on(
          "broadcast",
          { event: "rematch_offered" },
          (msg: {
            payload?: {
              rematchBattleId?: string;
              inviteCode?: string;
              challengerName?: string;
              challengerUserId?: string;
            };
          }) => {
            if (!isMounted || !msg.payload?.rematchBattleId) return;
            if (msg.payload.challengerUserId === currentUserId) return;
            setRematchOffer({
              rematchBattleId: msg.payload.rematchBattleId,
              inviteCode: msg.payload.inviteCode ?? "",
              challengerName: msg.payload.challengerName ?? "Opponent",
            });
            toast.info(
              `${msg.payload.challengerName ?? "Opponent"} challenged you to a rematch!`,
              {
                description: "Click Accept Rematch on the results card to join.",
              }
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch {
      // Fallback to polling
    }

    const interval = !isBattleCompleted
      ? setInterval(() => {
          if (isMounted && !isSubmittingRef.current) {
            void fetchArenaState();
          }
        }, 2500)
      : null;

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      if (channelRef.current) {
        try {
          const supabase = createBrowserSupabaseClient();
          void supabase.removeChannel(channelRef.current);
        } catch {
          // Ignore cleanup error
        }
        channelRef.current = null;
      }
    };
  }, [battleId, currentUserId, fetchArenaState, isBattleCompleted]);

  async function handleChallengeRematch() {
    setIsCreatingRematch(true);
    try {
      const res = await fetch(`/api/battles/${battleId}/rematch`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        rematchBattleId?: string;
        inviteCode?: string;
        challengerName?: string;
        redirectTo?: string;
      };

      if (!res.ok || !data.rematchBattleId) {
        toast.error("Could not create rematch room", {
          description: data.error ?? "Please try again.",
        });
        setIsCreatingRematch(false);
        return;
      }

      if (channelRef.current) {
        void channelRef.current.send({
          type: "broadcast",
          event: "rematch_offered",
          payload: {
            rematchBattleId: data.rematchBattleId,
            inviteCode: data.inviteCode,
            challengerName: data.challengerName ?? "Opponent",
            challengerUserId: currentUserId,
          },
        });
      }

      toast.success("Rematch room created!", {
        description: `Invite code: ${data.inviteCode}. Redirecting to room...`,
      });
      router.push(data.redirectTo ?? `/arena/battle/${data.rematchBattleId}`);
    } catch {
      toast.error("Network error creating rematch room.");
      setIsCreatingRematch(false);
    }
  }

  function broadcastArenaUpdate() {
    if (channelRef.current) {
      void channelRef.current.send({
        type: "broadcast",
        event: "arena_updated",
        payload: { timestamp: Date.now() },
      });
    }
  }

  const currentQuestion = useMemo(() => {
    if (viewerRole === "spectator" || questions.length === 0) return null;
    const answeredSet = new Set(myAnsweredQuestionIds);
    return questions.find((q) => !answeredSet.has(q.id)) ?? null;
  }, [viewerRole, questions, myAnsweredQuestionIds]);

  const currentQuestionId = currentQuestion?.id ?? null;
  const currentQuestionTimeLimit = currentQuestion?.timeLimitSeconds ?? 15;

  const submitAnswer = useCallback(
    async (params: {
      questionId: string;
      optionKey: OptionKey | null;
      timedOut: boolean;
    }) => {
      if (isSubmittingRef.current || viewerRole === "spectator") return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const elapsedMs = Math.max(
        250,
        Date.now() - questionStartedAtRef.current
      );

      try {
        const res = await fetch(`/api/battles/${battleId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: params.questionId,
            selectedOptionKey: params.optionKey,
            clientElapsedMs: elapsedMs,
            timedOut: params.timedOut,
          }),
        });

        const data = (await res.json()) as {
          error?: string;
          pointsAwarded?: number;
          answeredCount?: number;
          totalQuestions?: number;
        };

        if (!res.ok) {
          toast.error("Could not submit answer", {
            description: data.error ?? "Please try again.",
          });
          return;
        }

        setMyAnsweredQuestionIds((prev) =>
          prev.includes(params.questionId)
            ? prev
            : [...prev, params.questionId]
        );
        setSelectedKey(null);

        if (params.timedOut) {
          toast.warning("Time expired on question", {
            description: "Moving to the next question.",
          });
        } else {
          toast.success(`Answer locked in (${params.optionKey})`, {
            description: `Progress: ${data.answeredCount ?? 0} / ${data.totalQuestions ?? 0} answered`,
          });
        }

        broadcastArenaUpdate();
        await fetchArenaState();
      } catch {
        toast.error("Network error submitting answer");
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [battleId, fetchArenaState, viewerRole]
  );

  const submitAnswerRef = useRef(submitAnswer);
  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  useEffect(() => {
    if (
      !currentQuestionId ||
      isBattleCompleted ||
      viewerRole === "spectator"
    ) {
      return;
    }

    if (activeQuestionIdRef.current !== currentQuestionId) {
      activeQuestionIdRef.current = currentQuestionId;
      questionStartedAtRef.current = Date.now();
      setQuestionSecondsLeft(currentQuestionTimeLimit);
      setSelectedKey(null);
    }

    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - questionStartedAtRef.current) / 1000
      );
      const remaining = Math.max(0, currentQuestionTimeLimit - elapsedSeconds);
      setQuestionSecondsLeft((prev) =>
        prev !== remaining ? remaining : prev
      );

      if (
        remaining === 0 &&
        autoSubmittedForQuestionRef.current !== currentQuestionId &&
        !isSubmittingRef.current
      ) {
        autoSubmittedForQuestionRef.current = currentQuestionId;
        void submitAnswerRef.current({
          questionId: currentQuestionId,
          optionKey: null,
          timedOut: true,
        });
      }
    }, 250);

    return () => clearInterval(timer);
  }, [
    currentQuestionId,
    currentQuestionTimeLimit,
    isBattleCompleted,
    viewerRole,
  ]);

  if (isLoading || !battleMeta) {
    return (
      <Card className="border-border bg-card py-16 text-center shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-game text-sm font-bold">
            LOADING BATTLE ARENA...
          </p>
        </CardContent>
      </Card>
    );
  }

  const playerOne = participants.find((p) => p.slotIndex === 1) ?? null;
  const playerTwo = participants.find((p) => p.slotIndex === 2) ?? null;
  const myParticipant =
    participants.find((p) => p.userId === currentUserId) ?? null;
  const opponentParticipant =
    participants.find((p) => p.userId !== currentUserId) ?? null;

  const totalQuestions = battleMeta.questionCount || questions.length || 1;
  const defaultTabValue = playerOne ? "slot-1" : "slot-2";

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Top Head-to-Head Live Scoreboard & Progress Bar */}
      <Card className="w-full min-w-0 overflow-hidden border-primary/30 bg-card shadow-sm">
        <CardContent className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-11">
          {/* Player 1 Score & Progress */}
          <div className="flex min-w-0 items-center justify-between gap-3 sm:col-span-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ProfileAvatar
                avatarUrl={playerOne?.avatarUrl}
                avatarNumber={playerOne?.avatarNumber}
                displayName={playerOne?.displayName}
                className="size-10 shrink-0 sm:size-11"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-game text-xs font-bold text-foreground">
                    {playerOne?.displayName ?? "Challenger"}
                  </p>
                  {playerOne?.userId === currentUserId ? (
                    <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                      You
                    </Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {playerOne?.answeredCount ?? 0} / {totalQuestions} Answered
                </p>
                <div className="mt-1 h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((playerOne?.answeredCount ?? 0) / totalQuestions) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-game text-lg font-extrabold text-primary">
                {playerOne?.score ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">PTS</p>
            </div>
          </div>

          {/* Center VS */}
          <div className="hidden items-center justify-center sm:col-span-1 sm:flex">
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-game text-[11px] font-bold text-muted-foreground">
              VS
            </span>
          </div>

          {/* Player 2 Score & Progress */}
          <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border/50 pt-3 sm:col-span-5 sm:border-t-0 sm:pt-0">
            <div className="shrink-0 text-left">
              <p className="font-game text-lg font-extrabold text-primary">
                {playerTwo?.score ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">PTS</p>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {playerTwo?.userId === currentUserId ? (
                    <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                      You
                    </Badge>
                  ) : null}
                  <p className="truncate font-game text-xs font-bold text-foreground">
                    {playerTwo?.displayName ?? "Opponent"}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {playerTwo?.answeredCount ?? 0} / {totalQuestions} Answered
                </p>
                <div className="mt-1 ml-auto h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((playerTwo?.answeredCount ?? 0) / totalQuestions) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <ProfileAvatar
                avatarUrl={playerTwo?.avatarUrl}
                avatarNumber={playerTwo?.avatarNumber}
                displayName={playerTwo?.displayName}
                className="size-10 shrink-0 sm:size-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CASE 1: Battle Completed -> Full Match Summary with shadcn Tabs for Both Participants */}
      {isBattleCompleted ? (
        <Card className="w-full min-w-0 overflow-hidden border-2 border-primary/40 bg-card shadow-lg">
          <CardHeader className="min-w-0 space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-light text-primary">
              <Trophy className="size-7" />
            </div>

            <div className="min-w-0">
              <Badge variant="default" className="mb-2 font-game">
                BATTLE COMPLETED
              </Badge>
              <CardTitle className="font-game text-xl font-extrabold break-words sm:text-3xl">
                {battleMeta.isDraw
                  ? "IT'S A DRAW!"
                  : viewerRole === "spectator"
                    ? `${
                        participants.find(
                          (p) => p.userId === battleMeta.winnerUserId
                        )?.displayName ?? "WINNER"
                      } WON THE BATTLE!`
                    : battleMeta.winnerUserId === currentUserId
                      ? "VICTORY — YOU WON!"
                      : `${
                          opponentParticipant?.displayName ?? "OPPONENT"
                        } WON THE BATTLE`}
              </CardTitle>
              <CardDescription className="mt-1 break-words">
                Final Score: {playerOne?.displayName ?? "Player 1"} (
                {playerOne?.score ?? 0} PTS) vs{" "}
                {playerTwo?.displayName ?? "Player 2"} ({playerTwo?.score ?? 0}{" "}
                PTS)
                {viewerRole === "participant" ? (
                  <>
                    {" "}
                    • You earned{" "}
                    <span className="font-semibold text-primary">
                      +{completedSummary?.xpAwarded ?? 60} XP
                    </span>
                  </>
                ) : null}
              </CardDescription>

              <div className="mt-3 flex justify-center">
                <VoiceAudioButton
                  mode="winner"
                  battleId={battleId}
                  initialAudioUrl={
                    completedSummary?.winnerAnnouncementAudioUrl ?? null
                  }
                  fallbackText={
                    battleMeta.isDraw
                      ? `Battle complete in ${battleMeta.courseCode}! It is a draw between ${
                          playerOne?.displayName ?? "Player 1"
                        } and ${
                          playerTwo?.displayName ?? "Player 2"
                        }, with both players finishing at ${
                          playerOne?.score ?? 0
                        } points!`
                      : `Congratulations! ${
                          participants.find(
                            (p) => p.userId === battleMeta.winnerUserId
                          )?.displayName ?? "The champion"
                        } has won the ${
                          battleMeta.courseCode
                        } quiz battle with ${
                          participants.find(
                            (p) => p.userId === battleMeta.winnerUserId
                          )?.score ?? 0
                        } points!`
                  }
                  label="Play Winner Announcement"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-w-0 space-y-6">
            {/* Live Rematch Invitation Banner when opponent challenges */}
            {rematchOffer ? (
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 sm:flex-row">
                <div className="min-w-0 space-y-1 text-center sm:text-left">
                  <Badge className="bg-emerald-600 font-game text-[10px] text-white hover:bg-emerald-600">
                    REMATCH CHALLENGE RECEIVED
                  </Badge>
                  <p className="font-game text-sm font-bold text-foreground">
                    {rematchOffer.challengerName} invited you to a rematch!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Room code: {rematchOffer.inviteCode} • Join Slot 2 in one
                    click.
                  </p>
                </div>
                <Link
                  href={`/arena/battle/${rematchOffer.rematchBattleId}`}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Button className="w-full gap-2 bg-emerald-600 font-game text-xs font-bold text-white hover:bg-emerald-700 sm:w-auto">
                    <Swords className="size-4" />
                    Accept Rematch
                  </Button>
                </Link>
              </div>
            ) : null}

            {/* shadcn Tabs to switch between Player 1 and Player 2 Match Summaries */}
            <Tabs defaultValue={defaultTabValue} className="w-full min-w-0">
              <TabsList>
                {playerOne ? (
                  <TabsTrigger value="slot-1">
                    <ProfileAvatar
                      avatarUrl={playerOne.avatarUrl}
                      avatarNumber={playerOne.avatarNumber}
                      displayName={playerOne.displayName}
                      className="size-5 shrink-0"
                    />
                    <span className="min-w-0 truncate font-game text-xs font-bold">
                      {playerOne.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 px-1.5 py-0 text-[10px]"
                    >
                      {playerOne.score} PTS
                    </Badge>
                  </TabsTrigger>
                ) : null}

                {playerTwo ? (
                  <TabsTrigger value="slot-2">
                    <ProfileAvatar
                      avatarUrl={playerTwo.avatarUrl}
                      avatarNumber={playerTwo.avatarNumber}
                      displayName={playerTwo.displayName}
                      className="size-5 shrink-0"
                    />
                    <span className="min-w-0 truncate font-game text-xs font-bold">
                      {playerTwo.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 px-1.5 py-0 text-[10px]"
                    >
                      {playerTwo.score} PTS
                    </Badge>
                  </TabsTrigger>
                ) : null}
              </TabsList>

              {[playerOne, playerTwo].map((participant) => {
                if (!participant) return null;
                const tabKey =
                  participant.slotIndex === 1 ? "slot-1" : "slot-2";
                const diag =
                  completedSummary?.allParticipantDiagnoses?.[
                    participant.userId
                  ] ?? null;
                const answeredFeed =
                  spectatorFeeds[participant.userId] ?? [];

                return (
                  <TabsContent
                    key={participant.userId}
                    value={tabKey}
                    className="min-w-0 space-y-6 pt-2"
                  >
                    {/* Participant Performance Metrics */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                      <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 text-center">
                        <p className="font-game text-xl font-bold text-primary sm:text-2xl">
                          {participant.score} PTS
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Final Score
                        </p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 text-center">
                        <p className="font-game text-xl font-bold text-foreground sm:text-2xl">
                          {diag?.accuracyPercent ??
                            Math.round(
                              (participant.correctAnswersCount /
                                totalQuestions) *
                                100
                            )}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Accuracy ({participant.correctAnswersCount}/
                          {totalQuestions})
                        </p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-4 text-center">
                        <p className="font-game text-xl font-bold text-foreground sm:text-2xl">
                          {(
                            (diag?.averageResponseTimeMs ??
                              Math.round(
                                participant.totalResponseTimeMs /
                                  totalQuestions
                              )) / 1000
                          ).toFixed(1)}
                          s
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg. Response Time
                        </p>
                      </div>
                    </div>

                    {/* Topic Breakdown */}
                    {diag?.topicBreakdowns &&
                    diag.topicBreakdowns.length > 0 ? (
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="size-4 shrink-0 text-primary" />
                          <h3 className="min-w-0 font-game text-xs font-bold break-words sm:text-sm">
                            {participant.displayName.toUpperCase()}&apos;S TOPIC
                            BREAKDOWN
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {diag.topicBreakdowns.map((tb) => (
                            <div
                              key={tb.topicId}
                              className="flex min-w-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-muted/20 p-3.5"
                            >
                              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="font-game text-xs font-bold break-words text-foreground">
                                    {tb.topicName}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {tb.correctCount} / {tb.totalQuestions}{" "}
                                    Correct •{" "}
                                    {(tb.averageResponseTimeMs / 1000).toFixed(
                                      1
                                    )}
                                    s avg
                                  </p>
                                </div>

                                <Badge
                                  variant={
                                    tb.needsPractice ? "secondary" : "default"
                                  }
                                  className={
                                    tb.needsPractice
                                      ? "shrink-0 text-xs"
                                      : "shrink-0 bg-emerald-600 text-xs text-white hover:bg-emerald-600"
                                  }
                                >
                                  {tb.accuracyPercent}%{" "}
                                  {tb.needsPractice ? "• Review" : "• Strong"}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-end border-t border-border/50 pt-2">
                                <Link
                                  href={`/arena/practice?courseId=${battleMeta.courseId}&topicId=${tb.topicId}&battleId=${battleId}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
                                >
                                  <Brain className="size-3.5" />
                                  {tb.needsPractice
                                    ? "Practice Weak Topic"
                                    : "Drill Topic"}
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Question-by-Question Summary for this Participant */}
                    {answeredFeed.length > 0 ? (
                      <div className="min-w-0 space-y-3">
                        <h3 className="font-game text-xs font-bold sm:text-sm">
                          ANSWERED QUESTIONS REVIEW ({answeredFeed.length})
                        </h3>
                        <div className="space-y-3">
                          {answeredFeed.map((item) => (
                            <div
                              key={item.questionId}
                              className="min-w-0 space-y-2.5 rounded-xl border border-border bg-muted/15 p-3.5 sm:p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 font-game"
                                  >
                                    Q{item.questionIndex}
                                  </Badge>
                                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                                    {item.topicName}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {(item.responseTimeMs / 1000).toFixed(1)}s
                                  </span>
                                  {item.isCorrect ? (
                                    <Badge className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-600">
                                      <CheckCircle2 className="size-3" />+
                                      {item.pointsAwarded} PTS
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="destructive"
                                      className="gap-1 text-xs"
                                    >
                                      <XCircle className="size-3" />0 PTS
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm font-semibold break-words text-foreground">
                                {item.questionText}
                              </p>

                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {item.options.map((opt) => {
                                  const isChosen =
                                    opt.key === item.selectedOptionKey;
                                  const isCorrectKey =
                                    opt.key === item.correctOptionKey;
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                        isCorrectKey
                                          ? "border-emerald-500/60 bg-emerald-500/10 font-semibold text-foreground"
                                          : isChosen
                                            ? "border-destructive/60 bg-destructive/10 text-destructive"
                                            : "border-border/60 bg-card text-muted-foreground"
                                      }`}
                                    >
                                      <span className="shrink-0 font-game font-bold">
                                        {opt.key}.
                                      </span>
                                      <span className="min-w-0 flex-1 break-words">
                                        {opt.text}
                                      </span>
                                      {isChosen ? (
                                        <Badge
                                          variant="secondary"
                                          className="shrink-0 text-[9px]"
                                        >
                                          Picked
                                        </Badge>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>

                              {item.explanation ? (
                                <p className="rounded-lg bg-muted/50 p-2.5 text-xs break-words text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    Explanation:{" "}
                                  </span>
                                  {item.explanation}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>

          <CardFooter className="flex flex-col items-stretch justify-center gap-2.5 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {viewerRole === "participant" ? (
              <Button
                type="button"
                onClick={() => void handleChallengeRematch()}
                disabled={isCreatingRematch}
                className="w-full gap-2 font-game text-xs font-bold sm:w-auto"
              >
                {isCreatingRematch ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Challenge Opponent to Rematch
              </Button>
            ) : null}

            <Link
              href={`/arena/practice?courseId=${battleMeta.courseId}${
                completedSummary?.myDiagnosis?.recommendedPracticeTopicIds &&
                completedSummary.myDiagnosis.recommendedPracticeTopicIds
                  .length > 0
                  ? `&topicId=${completedSummary.myDiagnosis.recommendedPracticeTopicIds.join(",")}`
                  : ""
              }&battleId=${battleId}`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                className="w-full gap-2 font-game text-xs font-bold sm:w-auto"
              >
                <Brain className="size-4 text-primary" />
                Practice Weak Topics
              </Button>
            </Link>

            <Link
              href={`/arena/new?courseId=${battleMeta.courseId}`}
              className="w-full sm:w-auto"
            >
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <PlusCircle className="size-4" />
                New Battle
              </Button>
            </Link>

            <Link href="/leaderboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <Award className="size-4 text-primary" />
                Leaderboard
              </Button>
            </Link>

            <Link href="/arena" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                Arena Lobby
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ) : viewerRole === "spectator" ? (
        /* CASE 2: Live Spectator View with shadcn Tabs (Only Already-Answered Questions Shown) */
        <Card className="w-full min-w-0 overflow-hidden border-border bg-card shadow-md">
          <CardHeader className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="default" className="gap-1.5 font-game">
                <Eye className="size-3.5" />
                LIVE SPECTATOR FEED
              </Badge>
              <span className="text-xs text-muted-foreground">
                Questions appear live as each participant locks in their answer
              </span>
            </div>
            <CardTitle className="font-game text-lg font-bold sm:text-xl">
              WATCH PARTICIPANT PROGRESS
            </CardTitle>
            <CardDescription className="text-xs">
              Switch tabs below to inspect what each student has answered so
              far. Unanswered questions remain hidden to prevent cheating.
            </CardDescription>
          </CardHeader>

          <CardContent className="min-w-0">
            <Tabs defaultValue={defaultTabValue} className="w-full min-w-0">
              <TabsList>
                {playerOne ? (
                  <TabsTrigger value="slot-1">
                    <ProfileAvatar
                      avatarUrl={playerOne.avatarUrl}
                      avatarNumber={playerOne.avatarNumber}
                      displayName={playerOne.displayName}
                      className="size-5 shrink-0"
                    />
                    <span className="min-w-0 truncate font-game text-xs font-bold">
                      {playerOne.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 px-1.5 py-0 text-[10px]"
                    >
                      {playerOne.answeredCount}/{totalQuestions}
                    </Badge>
                  </TabsTrigger>
                ) : null}

                {playerTwo ? (
                  <TabsTrigger value="slot-2">
                    <ProfileAvatar
                      avatarUrl={playerTwo.avatarUrl}
                      avatarNumber={playerTwo.avatarNumber}
                      displayName={playerTwo.displayName}
                      className="size-5 shrink-0"
                    />
                    <span className="min-w-0 truncate font-game text-xs font-bold">
                      {playerTwo.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 px-1.5 py-0 text-[10px]"
                    >
                      {playerTwo.answeredCount}/{totalQuestions}
                    </Badge>
                  </TabsTrigger>
                ) : null}
              </TabsList>

              {[playerOne, playerTwo].map((participant) => {
                if (!participant) return null;
                const tabKey =
                  participant.slotIndex === 1 ? "slot-1" : "slot-2";
                const answeredFeed =
                  spectatorFeeds[participant.userId] ?? [];
                const remainingCount = Math.max(
                  0,
                  totalQuestions - answeredFeed.length
                );

                return (
                  <TabsContent
                    key={participant.userId}
                    value={tabKey}
                    className="min-w-0 space-y-4 pt-3"
                  >
                    {answeredFeed.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                        <Loader2 className="mb-2 size-6 animate-spin text-primary" />
                        <p className="font-game text-sm font-bold break-words">
                          {participant.displayName.toUpperCase()} IS ON
                          QUESTION 1
                        </p>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">
                          Question 1 will appear here immediately as soon as{" "}
                          {participant.displayName} submits their answer.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {answeredFeed.map((item) => (
                          <div
                            key={item.questionId}
                            className="min-w-0 space-y-3 rounded-xl border border-border bg-muted/15 p-3.5 sm:p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <Badge variant="default" className="font-game">
                                  Question {item.questionIndex} of{" "}
                                  {totalQuestions}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="max-w-full truncate text-xs"
                                >
                                  {item.topicName}
                                </Badge>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  Answered in{" "}
                                  {(item.responseTimeMs / 1000).toFixed(1)}s
                                </span>
                                {item.isCorrect ? (
                                  <Badge className="bg-emerald-600 text-xs text-white hover:bg-emerald-600">
                                    +{item.pointsAwarded} PTS
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    0 PTS
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-sm font-semibold break-words text-foreground">
                              {item.questionText}
                            </p>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {item.options.map((opt) => {
                                const isChosen =
                                  opt.key === item.selectedOptionKey;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                                      isChosen
                                        ? "border-primary bg-primary-light/60 font-semibold text-foreground ring-1 ring-primary/30"
                                        : "border-border/60 bg-card text-muted-foreground"
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="shrink-0 font-game font-bold">
                                        {opt.key}.
                                      </span>
                                      <span className="min-w-0 break-words">
                                        {opt.text}
                                      </span>
                                    </div>
                                    {isChosen ? (
                                      <Badge
                                        variant="default"
                                        className="shrink-0 text-[9px]"
                                      >
                                        Locked In
                                      </Badge>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Locked Placeholder for Unanswered Questions */}
                    {remainingCount > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-2">
                          <Lock className="size-4 shrink-0 text-primary" />
                          <span className="break-words">
                            {remainingCount} remaining{" "}
                            {remainingCount === 1
                              ? "question is"
                              : "questions are"}{" "}
                            hidden until {participant.displayName} answers
                          </span>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          In Progress
                        </Badge>
                      </div>
                    ) : null}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      ) : currentQuestion ? (
        /* CASE 3: Active Participant Question Display */
        <Card className="w-full min-w-0 overflow-hidden border-border bg-card shadow-md">
          <CardHeader className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant="default" className="font-game">
                  Question {currentQuestion.questionIndex} of{" "}
                  {currentQuestion.totalQuestions}
                </Badge>
                <Badge
                  variant="secondary"
                  className="max-w-full gap-1 whitespace-normal text-left"
                >
                  <BookOpen className="size-3 shrink-0 text-primary" />
                  <span className="truncate">{currentQuestion.topicName}</span>
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {currentQuestion.difficulty}
                </Badge>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <VoiceAudioButton
                  mode="question"
                  questionId={currentQuestion.id}
                  initialAudioUrl={currentQuestion.audioUrl}
                  fallbackText={currentQuestion.questionText}
                  label="Read Aloud"
                />

                <div
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 font-game text-sm font-bold ${
                    questionSecondsLeft <= 5
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-primary/40 bg-primary-light/50 text-primary"
                  }`}
                >
                  <Clock className="size-4" />
                  <span>{String(questionSecondsLeft).padStart(2, "0")}s</span>
                </div>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-200 ${
                  questionSecondsLeft <= 5 ? "bg-destructive" : "bg-primary"
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        (questionSecondsLeft /
                          currentQuestion.timeLimitSeconds) *
                          100
                      )
                    )
                  )}%`,
                }}
              />
            </div>

            <CardTitle className="pt-2 text-base leading-relaxed font-semibold break-words text-foreground sm:text-xl">
              {currentQuestion.questionText}
            </CardTitle>
          </CardHeader>

          <CardContent className="min-w-0 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedKey === option.key;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedKey(option.key)}
                    className={`flex min-w-0 items-center justify-between rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                      isSelected
                        ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 sm:gap-3.5">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-game text-xs font-bold ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-foreground"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium break-words text-foreground sm:text-base">
                        {option.text}
                      </span>
                    </div>

                    {isSelected ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-stretch justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="size-3.5 shrink-0 text-primary" />
              <span>Faster correct answers earn up to +50 speed bonus points</span>
            </p>

            <Button
              type="button"
              size="lg"
              disabled={!selectedKey || isSubmitting}
              onClick={() => {
                if (!selectedKey) return;
                void submitAnswer({
                  questionId: currentQuestion.id,
                  optionKey: selectedKey,
                  timedOut: false,
                });
              }}
              className="w-full gap-2 font-game text-xs font-bold sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Swords className="size-4" />
                  Lock In Answer
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* CASE 4: Current student finished all questions; waiting for opponent */
        <Card className="w-full min-w-0 overflow-hidden border-border bg-card py-12 text-center shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="font-game text-lg font-bold sm:text-xl">
              YOU COMPLETED ALL {totalQuestions} QUESTIONS!
            </h3>
            <p className="max-w-md text-xs text-muted-foreground">
              Waiting for{" "}
              <span className="font-semibold text-foreground">
                {opponentParticipant?.displayName ?? "your opponent"}
              </span>{" "}
              to finish their remaining questions (
              {opponentParticipant?.answeredCount ?? 0} / {totalQuestions}{" "}
              answered)...
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-primary">
              <Loader2 className="size-4 animate-spin" />
              <span>Synchronizing final battle results...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
