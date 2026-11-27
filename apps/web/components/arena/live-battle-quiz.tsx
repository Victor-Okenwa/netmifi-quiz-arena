"use client";

import { ProfileAvatar } from "@/assets/profiles";
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
import type {
  ArenaParticipantState,
  CompletedBattleSummary,
  SanitizedBattleArenaState,
} from "@/lib/battle-engine/engine";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { OptionKey, PublicBattleQuestion } from "@repo/types";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  PlusCircle,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
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

export function LiveBattleQuiz({
  battleId,
  currentUserId,
}: LiveBattleQuizProps) {
  // Static questions list (loaded once so question cards never flicker or reload during polling)
  const [questions, setQuestions] = useState<PublicBattleQuestion[]>([]);
  const [battleMeta, setBattleMeta] = useState<
    SanitizedBattleArenaState["battle"] | null
  >(null);
  const [myAnsweredQuestionIds, setMyAnsweredQuestionIds] = useState<string[]>(
    []
  );
  const [participants, setParticipants] = useState<ArenaParticipantState[]>([]);
  const [completedSummary, setCompletedSummary] =
    useState<CompletedBattleSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Only set static questions array once so question DOM & selected option never reset
      setQuestions((prev) => (prev.length === 0 ? data.questions : prev));

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

      if (data.completedSummary) {
        setCompletedSummary((prev) => prev ?? data.completedSummary);
      }

      if (
        data.battle.status === "COMPLETED" &&
        !announcedCompletionRef.current
      ) {
        announcedCompletionRef.current = true;
        const isWin = data.battle.winnerUserId === currentUserId;
        const isDraw = data.battle.isDraw;
        if (isDraw) {
          toast.info("Battle ended in a draw!", {
            description: "Both players matched scores.",
          });
        } else if (isWin) {
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

  // Subscribe to Supabase Realtime broadcast channel + lightweight background progress check
  useEffect(() => {
    void fetchArenaState();

    if (isBattleCompleted) {
      return;
    }

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
        .subscribe();

      channelRef.current = channel;
    } catch {
      // Fallback to polling
    }

    const interval = setInterval(() => {
      if (isMounted && !isSubmittingRef.current) {
        void fetchArenaState();
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
  }, [battleId, fetchArenaState, isBattleCompleted]);

  function broadcastArenaUpdate() {
    if (channelRef.current) {
      void channelRef.current.send({
        type: "broadcast",
        event: "arena_updated",
        payload: { timestamp: Date.now() },
      });
    }
  }

  // Determine the next unanswered question for the current student
  const currentQuestion = useMemo(() => {
    if (questions.length === 0) return null;
    const answeredSet = new Set(myAnsweredQuestionIds);
    return questions.find((q) => !answeredSet.has(q.id)) ?? null;
  }, [questions, myAnsweredQuestionIds]);

  const currentQuestionId = currentQuestion?.id ?? null;
  const currentQuestionTimeLimit = currentQuestion?.timeLimitSeconds ?? 15;

  const submitAnswer = useCallback(
    async (params: {
      questionId: string;
      optionKey: OptionKey | null;
      timedOut: boolean;
    }) => {
      if (isSubmittingRef.current) return;
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

        // Optimistically advance to the next question immediately without waiting for poll
        setMyAnsweredQuestionIds((prev) =>
          prev.includes(params.questionId) ? prev : [...prev, params.questionId]
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
    [battleId, fetchArenaState]
  );

  const submitAnswerRef = useRef(submitAnswer);
  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  }, [submitAnswer]);

  // Per-question timer effect keyed strictly on primitive `currentQuestionId`
  useEffect(() => {
    if (!currentQuestionId || isBattleCompleted) {
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
      setQuestionSecondsLeft((prev) => (prev !== remaining ? remaining : prev));

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
  }, [currentQuestionId, currentQuestionTimeLimit, isBattleCompleted]);

  if (isLoading || !battleMeta) {
    return (
      <Card className="border-border bg-card py-16 text-center shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-game text-sm font-bold">
            LOADING BATTLE QUESTIONS...
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

  return (
    <div className="space-y-6">
      {/* Top Head-to-Head Live Scoreboard & Progress Bar */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardContent className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-11">
          {/* Player 1 Score & Progress */}
          <div className="flex items-center justify-between gap-3 sm:col-span-5">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileAvatar
                avatarUrl={playerOne?.avatarUrl}
                avatarNumber={playerOne?.avatarNumber}
                displayName={playerOne?.displayName}
                className="size-11"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-game text-xs font-bold text-foreground">
                    {playerOne?.displayName ?? "Challenger"}
                  </p>
                  {playerOne?.userId === currentUserId ? (
                    <Badge variant="default" className="px-1.5 py-0 text-[9px]">
                      You
                    </Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {playerOne?.answeredCount ?? 0} / {totalQuestions} Answered
                </p>
                <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
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

            <div className="text-right">
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
          <div className="flex items-center justify-between gap-3 sm:col-span-5">
            <div className="text-left">
              <p className="font-game text-lg font-extrabold text-primary">
                {playerTwo?.score ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">PTS</p>
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {playerTwo?.userId === currentUserId ? (
                    <Badge variant="default" className="px-1.5 py-0 text-[9px]">
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
                <div className="mt-1 ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-muted">
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
                className="size-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CASE 1: Battle Completed -> Final Results & Topic Breakdown */}
      {isBattleCompleted ? (
        <Card className="border-2 border-primary/40 bg-card shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-light text-primary">
              <Trophy className="size-7" />
            </div>

            <div>
              <Badge variant="default" className="mb-2 font-game">
                BATTLE COMPLETED
              </Badge>
              <CardTitle className="font-game text-3xl font-extrabold">
                {battleMeta.isDraw
                  ? "IT'S A DRAW!"
                  : battleMeta.winnerUserId === currentUserId
                    ? "VICTORY — YOU WON!"
                    : `${
                        opponentParticipant?.displayName ?? "OPPONENT"
                      } WON THE BATTLE`}
              </CardTitle>
              <CardDescription className="mt-1">
                Final Score: {myParticipant?.score ?? 0} PTS vs{" "}
                {opponentParticipant?.score ?? 0} PTS • You earned{" "}
                <span className="font-semibold text-primary">
                  +{completedSummary?.xpAwarded ?? 60} XP
                </span>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-primary">
                  {myParticipant?.score ?? 0} PTS
                </p>
                <p className="text-xs text-muted-foreground">Your Final Score</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-foreground">
                  {completedSummary?.myDiagnosis?.accuracyPercent ??
                    Math.round(
                      ((myParticipant?.correctAnswersCount ?? 0) /
                        totalQuestions) *
                        100
                    )}
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall Accuracy ({myParticipant?.correctAnswersCount ?? 0}/
                  {totalQuestions})
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-foreground">
                  {(
                    (completedSummary?.myDiagnosis?.averageResponseTimeMs ??
                      0) / 1000
                  ).toFixed(1)}
                  s
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg. Response Time
                </p>
              </div>
            </div>

            {completedSummary?.myDiagnosis?.topicBreakdowns &&
            completedSummary.myDiagnosis.topicBreakdowns.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h3 className="font-game text-sm font-bold">
                    YOUR TOPIC PERFORMANCE DIAGNOSIS
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {completedSummary.myDiagnosis.topicBreakdowns.map((tb) => (
                    <div
                      key={tb.topicId}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3.5"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="truncate font-game text-xs font-bold text-foreground">
                          {tb.topicName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {tb.correctCount} / {tb.totalQuestions} Correct •{" "}
                          {(tb.averageResponseTimeMs / 1000).toFixed(1)}s avg
                        </p>
                      </div>

                      <Badge
                        variant={tb.needsPractice ? "secondary" : "default"}
                        className={
                          tb.needsPractice
                            ? "text-xs"
                            : "bg-emerald-600 text-xs text-white hover:bg-emerald-600"
                        }
                      >
                        {tb.accuracyPercent}%{" "}
                        {tb.needsPractice ? "• Review" : "• Strong"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6">
            <Link href={`/arena/new?courseId=${battleMeta.courseId}`}>
              <Button className="gap-2">
                <PlusCircle className="size-4" />
                Play Another Battle
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="gap-2">
                <Award className="size-4 text-primary" />
                View Leaderboard
              </Button>
            </Link>
            <Link href="/arena">
              <Button variant="ghost">Return to Arena Lobby</Button>
            </Link>
          </CardFooter>
        </Card>
      ) : currentQuestion ? (
        /* CASE 2: Active Question Display */
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="font-game">
                  Question {currentQuestion.questionIndex} of{" "}
                  {currentQuestion.totalQuestions}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="size-3 text-primary" />
                  {currentQuestion.topicName}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {currentQuestion.difficulty}
                </Badge>
              </div>

              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-game text-sm font-bold ${
                  questionSecondsLeft <= 5
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary-light/50 text-primary"
                }`}
              >
                <Clock className="size-4" />
                <span>{String(questionSecondsLeft).padStart(2, "0")}s</span>
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

            <CardTitle className="pt-2 text-lg leading-relaxed font-semibold text-foreground sm:text-xl">
              {currentQuestion.questionText}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedKey === option.key;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedKey(option.key)}
                    className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 pr-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-game text-xs font-bold ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-foreground"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="text-sm font-medium text-foreground sm:text-base">
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

          <CardFooter className="flex items-center justify-between border-t border-border pt-5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="size-3.5 text-primary" />
              Faster correct answers earn up to +50 speed bonus points
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
              className="gap-2 font-game text-xs font-bold"
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
        /* CASE 3: Current student finished all questions; waiting for opponent */
        <Card className="border-border bg-card py-12 text-center shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="font-game text-xl font-bold">
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
