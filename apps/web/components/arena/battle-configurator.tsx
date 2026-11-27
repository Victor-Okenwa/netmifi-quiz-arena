"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  Swords,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

export interface ConfiguratorCourse {
  id: string;
  code: string;
  title: string;
  description: string;
  academicLevel: string;
}

export interface ConfiguratorTopic {
  id: string;
  courseId: string;
  name: string;
  slug: string;
  description: string;
}

interface BattleConfiguratorProps {
  courses: ConfiguratorCourse[];
  topics: ConfiguratorTopic[];
  initialCourseId?: string;
  initialTopicId?: string;
}

const QUESTION_COUNT_OPTIONS = [3, 5, 10] as const;
const TIMER_OPTIONS = [10, 15, 20, 30] as const;

export function BattleConfigurator({
  courses,
  topics,
  initialCourseId,
  initialTopicId,
}: BattleConfiguratorProps) {
  const router = useRouter();

  const defaultCourseId =
    courses.find((c) => c.id === initialCourseId)?.id ??
    courses[0]?.id ??
    "";

  const [courseId, setCourseId] = useState<string>(defaultCourseId);

  const courseTopics = useMemo(
    () => topics.filter((t) => t.courseId === courseId),
    [topics, courseId]
  );

  const defaultTopicId =
    initialTopicId && courseTopics.some((t) => t.id === initialTopicId)
      ? initialTopicId
      : "all";

  const [topicId, setTopicId] = useState<string>(defaultTopicId);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timePerQuestionSeconds, setTimePerQuestionSeconds] =
    useState<number>(15);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [mode, setMode] = useState<"free" | "reward">("free");
  const [stakeSolInput, setStakeSolInput] = useState<string>("0.1");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSelectCourse(newCourseId: string) {
    setCourseId(newCourseId);
    setTopicId("all");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const stakeAmountLamports =
        mode === "reward"
          ? Math.max(1, Math.round(Number.parseFloat(stakeSolInput || "0") * 1_000_000_000))
          : 0;

      const response = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          topicId: topicId === "all" ? undefined : topicId,
          mode,
          questionCount,
          timePerQuestionSeconds,
          isPrivate,
          stakeAmountLamports,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          data.error ?? "Could not create battle room. Please try again."
        );
        setIsLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/arena");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border shadow-md">
      <CardHeader>
        <CardTitle className="font-game text-2xl font-bold">
          CREATE A QUIZ BATTLE
        </CardTitle>
        <CardDescription>
          Choose your course, topic focus, question timer, and match rules to
          open a battle room.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {errorMessage ? (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Course Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-primary" />
              1. Select Course
            </Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {courses.map((course) => {
                const isSelected = course.id === courseId;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleSelectCourse(course.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-muted/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className="font-game text-xs"
                        >
                          {course.code}
                        </Badge>
                        {isSelected ? (
                          <CheckCircle2 className="size-4 text-primary" />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {course.academicLevel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 font-game text-sm font-bold text-foreground">
                        {course.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {course.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Topic Focus */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircle className="size-4 text-primary" />
              2. Select Topic Focus
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTopicId("all")}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                  topicId === "all"
                    ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/60"
                }`}
              >
                <div>
                  <p className="font-game text-xs font-bold text-foreground">
                    All Course Topics
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mixed questions across the entire course syllabus
                  </p>
                </div>
                {topicId === "all" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>

              {courseTopics.map((topic) => {
                const isSelected = topic.id === topicId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setTopicId(topic.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                        : "border-border bg-card hover:bg-muted/60"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-game text-xs font-bold text-foreground">
                        {topic.name}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {topic.description}
                      </p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Question Count & Time Limit */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">
                3. Number of Questions
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`h-11 rounded-lg border font-game text-xs font-bold transition-all ${
                      questionCount === count
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="size-4 text-primary" />
                4. Time per Question
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {TIMER_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimePerQuestionSeconds(sec)}
                    className={`h-11 rounded-lg border font-game text-xs font-bold transition-all ${
                      timePerQuestionSeconds === sec
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Visibility & Battle Mode */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">
                5. Room Visibility
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    !isPrivate
                      ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-game text-xs font-bold">
                    <Globe className="size-3.5 text-primary" />
                    Open Lobby
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Anyone in the Arena Lobby can accept your challenge
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    isPrivate
                      ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-game text-xs font-bold">
                    <Lock className="size-3.5 text-primary" />
                    Friend Invite
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Private room joinable via your 8-character invite code
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">6. Battle Type</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode("free")}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    mode === "free"
                      ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-game text-xs font-bold">
                    <Swords className="size-3.5 text-primary" />
                    Standard Battle
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Compete for XP, rankings, and topic mastery
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("reward")}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    mode === "reward"
                      ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-game text-xs font-bold">
                    <Coins className="size-3.5 text-primary" />
                    Reward Battle
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Staked match with winner reward payout
                  </p>
                </button>
              </div>
            </div>
          </div>

          {mode === "reward" ? (
            <div className="rounded-xl border border-primary/40 bg-primary-light/40 p-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-game text-xs font-bold text-foreground">
                    REWARD STAKE AMOUNT (SOL)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Both participants contribute this stake into the battle
                    escrow before the match starts.
                  </p>
                </div>
                <div className="w-full sm:w-40">
                  <Input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="10"
                    value={stakeSolInput}
                    onChange={(e) => setStakeSolInput(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={isLoading || !courseId}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating Battle Room...
              </>
            ) : (
              <>
                <Swords className="size-5" />
                Create Battle Room
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
