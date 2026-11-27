"use client";

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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { OptionKey, QuestionDifficulty } from "@repo/types";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Swords,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export interface PracticeDrillQuestion {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topicId: string;
  topicName: string;
  questionText: string;
  difficulty: QuestionDifficulty;
  correctOptionKey: OptionKey;
  explanation: string;
  options: {
    id: string;
    key: OptionKey;
    text: string;
  }[];
}

export interface PracticeCourseOption {
  id: string;
  code: string;
  title: string;
}

export interface PracticeTopicOption {
  id: string;
  courseId: string;
  name: string;
}

interface TargetedPracticeDrillProps {
  questions: PracticeDrillQuestion[];
  courses: PracticeCourseOption[];
  topics: PracticeTopicOption[];
  selectedCourseId: string;
  selectedTopicIds: string[];
  sourceBattleId?: string;
}

export function TargetedPracticeDrill({
  questions,
  courses,
  topics,
  selectedCourseId,
  selectedTopicIds,
  sourceBattleId,
}: TargetedPracticeDrillProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, { chosen: OptionKey; isCorrect: boolean }>
  >({});

  const [isDrillComplete, setIsDrillComplete] = useState(false);
  const [isAwardingXp, setIsAwardingXp] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [isLaunchingRematch, setIsLaunchingRematch] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;

  const answeredList = useMemo(
    () => Object.values(answersByQuestionId),
    [answersByQuestionId]
  );
  const correctCount = useMemo(
    () => answeredList.filter((a) => a.isCorrect).length,
    [answeredList]
  );
  const accuracyPercent =
    answeredList.length > 0
      ? Math.round((correctCount / answeredList.length) * 100)
      : 0;

  const activeCourse =
    courses.find((c) => c.id === selectedCourseId) ?? courses[0];
  const courseTopics = topics.filter((t) => t.courseId === activeCourse?.id);

  function handleCheckAnswer() {
    if (!currentQuestion || !selectedKey || isChecked) return;
    const isCorrect = selectedKey === currentQuestion.correctOptionKey;
    setAnswersByQuestionId((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        chosen: selectedKey,
        isCorrect,
      },
    }));
    setIsChecked(true);
  }

  async function handleNextQuestion() {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedKey(null);
      setIsChecked(false);
      return;
    }

    // Complete the practice drill & award XP
    setIsDrillComplete(true);
    setIsAwardingXp(true);
    try {
      const res = await fetch("/api/practice/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          topicIds: selectedTopicIds,
          totalQuestions,
          correctCount,
          sourceBattleId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { xpAwarded?: number };
        setXpAwarded(data.xpAwarded ?? 40);
        toast.success(`Practice drill completed! +${data.xpAwarded ?? 40} XP`, {
          description: `You scored ${correctCount}/${totalQuestions} (${accuracyPercent}% accuracy).`,
        });
      }
    } catch {
      setXpAwarded(40);
    } finally {
      setIsAwardingXp(false);
    }
  }

  function handleRestartDrill() {
    setCurrentIndex(0);
    setSelectedKey(null);
    setIsChecked(false);
    setAnswersByQuestionId({});
    setIsDrillComplete(false);
    setXpAwarded(null);
  }

  async function handleLaunchRematch() {
    if (!sourceBattleId) {
      router.push(
        `/arena/new?courseId=${selectedCourseId}${
          selectedTopicIds[0] ? `&topicId=${selectedTopicIds[0]}` : ""
        }`
      );
      return;
    }

    setIsLaunchingRematch(true);
    try {
      const res = await fetch(`/api/battles/${sourceBattleId}/rematch`, {
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
        setIsLaunchingRematch(false);
        return;
      }

      // Broadcast rematch invitation to the source battle room channel
      try {
        const supabase = createBrowserSupabaseClient();
        const channel = supabase.channel(`battle-arena:${sourceBattleId}`);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel.send({
              type: "broadcast",
              event: "rematch_offered",
              payload: {
                rematchBattleId: data.rematchBattleId,
                inviteCode: data.inviteCode,
                challengerName: data.challengerName ?? "Your opponent",
              },
            });
          }
        });
      } catch {
        // Non-blocking broadcast
      }

      toast.success("Rematch room ready!", {
        description: `Invite code: ${data.inviteCode}`,
      });
      router.push(data.redirectTo ?? `/arena/battle/${data.rematchBattleId}`);
    } catch {
      toast.error("Network error creating rematch room.");
      setIsLaunchingRematch(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Top Course & Weak-Topic Filter Bar */}
      <Card className="w-full min-w-0 overflow-hidden border-primary/30 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain className="size-5 shrink-0 text-primary" />
              <CardTitle className="font-game text-lg font-bold sm:text-xl">
                TARGETED TOPIC PRACTICE DRILL
              </CardTitle>
            </div>
            {sourceBattleId ? (
              <Badge variant="default" className="gap-1 font-game">
                <Target className="size-3.5" />
                POST-BATTLE WEAK TOPIC RECOVERY
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-game">
                SELF-PACED MASTERY
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Master weak concepts with instant answer verification and detailed
            academic explanations before your next rematch.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 border-t border-border/60 pt-4">
          {/* Course pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">
              Course:
            </span>
            {courses.map((course) => {
              const isSelected = course.id === activeCourse?.id;
              return (
                <Link
                  key={course.id}
                  href={`/arena/practice?courseId=${course.id}${
                    sourceBattleId ? `&battleId=${sourceBattleId}` : ""
                  }`}
                >
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer font-game text-[11px]"
                  >
                    {course.code}
                  </Badge>
                </Link>
              );
            })}
          </div>

          {/* Topic pills */}
          {courseTopics.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">
                Focus Topic:
              </span>
              <Link
                href={`/arena/practice?courseId=${activeCourse?.id ?? ""}${
                  sourceBattleId ? `&battleId=${sourceBattleId}` : ""
                }`}
              >
                <Badge
                  variant={selectedTopicIds.length === 0 ? "default" : "outline"}
                  className="cursor-pointer text-[11px]"
                >
                  All {activeCourse?.code} Topics
                </Badge>
              </Link>
              {courseTopics.map((topic) => {
                const isSelected = selectedTopicIds.includes(topic.id);
                return (
                  <Link
                    key={topic.id}
                    href={`/arena/practice?courseId=${
                      activeCourse?.id ?? ""
                    }&topicId=${topic.id}${
                      sourceBattleId ? `&battleId=${sourceBattleId}` : ""
                    }`}
                    className="max-w-full"
                  >
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className="max-w-full cursor-pointer whitespace-normal text-left text-[11px]"
                    >
                      {topic.name}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* CASE 1: Drill Completed Summary & Rematch CTA */}
      {isDrillComplete ? (
        <Card className="w-full min-w-0 overflow-hidden border-2 border-primary/40 bg-card shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Trophy className="size-7" />
            </div>

            <div>
              <Badge className="mb-2 bg-emerald-600 font-game text-white hover:bg-emerald-600">
                PRACTICE DRILL COMPLETE
              </Badge>
              <CardTitle className="font-game text-2xl font-extrabold sm:text-3xl">
                {accuracyPercent >= 80
                  ? "TOPIC MASTERED — READY FOR REMATCH!"
                  : "GREAT EFFORT — KEEP SHARPENING YOUR EDGE!"}
              </CardTitle>
              <CardDescription className="mt-1">
                You answered {correctCount} out of {totalQuestions} practice
                questions correctly ({accuracyPercent}% accuracy)
                {xpAwarded ? (
                  <>
                    {" "}
                    and earned{" "}
                    <span className="font-semibold text-primary">
                      +{xpAwarded} XP
                    </span>
                  </>
                ) : isAwardingXp ? (
                  " • Awarding practice XP..."
                ) : null}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-primary">
                  {accuracyPercent}%
                </p>
                <p className="text-xs text-muted-foreground">Drill Accuracy</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-foreground">
                  {correctCount} / {totalQuestions}
                </p>
                <p className="text-xs text-muted-foreground">
                  Questions Mastered
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="font-game text-2xl font-bold text-emerald-500">
                  +{xpAwarded ?? 40} XP
                </p>
                <p className="text-xs text-muted-foreground">Practice Reward</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col items-stretch justify-center gap-3 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              size="lg"
              onClick={() => void handleLaunchRematch()}
              disabled={isLaunchingRematch}
              className="gap-2 font-game text-xs font-bold"
            >
              {isLaunchingRematch ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Swords className="size-4" />
              )}
              {sourceBattleId
                ? "Challenge Opponent to Rematch"
                : "Test Yourself in a Live Battle"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleRestartDrill}
              className="gap-2"
            >
              <RotateCcw className="size-4 text-primary" />
              Practice Again
            </Button>

            {sourceBattleId ? (
              <Link href={`/arena/battle/${sourceBattleId}`}>
                <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                  Back to Battle Diagnosis
                </Button>
              </Link>
            ) : (
              <Link href="/arena">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                  Return to Arena Lobby
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      ) : currentQuestion ? (
        /* CASE 2: Active Practice Question with Immediate Explanation Feedback */
        <Card className="w-full min-w-0 overflow-hidden border-border bg-card shadow-md">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant="default" className="font-game">
                  Practice {currentIndex + 1} of {totalQuestions}
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

              <div className="flex flex-wrap items-center gap-2">
                <VoiceAudioButton
                  mode="question"
                  questionId={currentQuestion.id}
                  fallbackText={currentQuestion.questionText}
                  label="Read Aloud"
                />

                <Badge variant="outline" className="font-game text-xs">
                  Accuracy: {correctCount}/{answeredList.length} (
                  {accuracyPercent}%)
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.round(
                    ((currentIndex + (isChecked ? 1 : 0)) / totalQuestions) *
                      100
                  )}%`,
                }}
              />
            </div>

            <CardTitle className="pt-2 text-base leading-relaxed font-semibold break-words text-foreground sm:text-xl">
              {currentQuestion.questionText}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedKey === option.key;
                const isCorrectOption =
                  option.key === currentQuestion.correctOptionKey;

                let cardStyle =
                  "border-border bg-card hover:border-primary/40 hover:bg-muted/50";
                let badgeStyle =
                  "border border-border bg-muted text-foreground";

                if (!isChecked && isSelected) {
                  cardStyle =
                    "border-primary bg-primary-light/60 ring-2 ring-primary/30";
                  badgeStyle = "bg-primary text-primary-foreground";
                } else if (isChecked) {
                  if (isCorrectOption) {
                    cardStyle =
                      "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30";
                    badgeStyle = "bg-emerald-600 text-white";
                  } else if (isSelected && !isCorrectOption) {
                    cardStyle =
                      "border-destructive bg-destructive/15 ring-2 ring-destructive/30";
                    badgeStyle = "bg-destructive text-destructive-foreground";
                  } else {
                    cardStyle = "border-border/50 bg-card/60 opacity-75";
                  }
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isChecked}
                    onClick={() => setSelectedKey(option.key)}
                    className={`flex min-w-0 items-center justify-between rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${cardStyle}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 sm:gap-3.5">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-game text-xs font-bold ${badgeStyle}`}
                      >
                        {option.key}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium break-words text-foreground sm:text-base">
                        {option.text}
                      </span>
                    </div>

                    {isChecked && isCorrectOption ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                    ) : isChecked && isSelected && !isCorrectOption ? (
                      <XCircle className="size-5 shrink-0 text-destructive" />
                    ) : !isChecked && isSelected ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Immediate Explanation Box */}
            {isChecked ? (
              <div
                className={`rounded-xl border p-4 ${
                  selectedKey === currentQuestion.correctOptionKey
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-primary/40 bg-primary-light/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedKey === currentQuestion.correctOptionKey ? (
                    <>
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      <p className="font-game text-xs font-bold text-emerald-500">
                        CORRECT ANSWER ({currentQuestion.correctOptionKey})
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 shrink-0 text-primary" />
                      <p className="font-game text-xs font-bold text-primary">
                        CORRECT OPTION IS {currentQuestion.correctOptionKey} —
                        CONCEPT EXPLANATION
                      </p>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed break-words text-foreground sm:text-sm">
                  {currentQuestion.explanation}
                </p>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col items-stretch justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              {isChecked
                ? "Review the explanation above, then continue to the next question."
                : "Select an answer option and click Check Answer for instant feedback."}
            </p>

            {!isChecked ? (
              <Button
                type="button"
                size="lg"
                disabled={!selectedKey}
                onClick={handleCheckAnswer}
                className="w-full gap-2 font-game text-xs font-bold sm:w-auto"
              >
                <CheckCircle2 className="size-4" />
                Check Answer
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={() => void handleNextQuestion()}
                className="w-full gap-2 font-game text-xs font-bold sm:w-auto"
              >
                {currentIndex + 1 < totalQuestions ? (
                  <>
                    Next Question
                    <ArrowRight className="size-4" />
                  </>
                ) : (
                  <>
                    Finish Practice Drill
                    <Trophy className="size-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Card className="border-border bg-card py-12 text-center">
          <CardContent className="space-y-3">
            <p className="font-game text-base font-bold">
              NO PRACTICE QUESTIONS FOUND FOR THIS FILTER
            </p>
            <Link href="/arena/practice">
              <Button variant="outline" size="sm">
                Reset Topic Filter
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
