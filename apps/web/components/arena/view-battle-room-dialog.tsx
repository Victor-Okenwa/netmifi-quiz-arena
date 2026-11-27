"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSol } from "@repo/validators";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  HelpCircle,
  Info,
  Loader2,
  Swords,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface RoomParticipantDetail {
  userId: string;
  slotIndex: number;
  isReady: boolean;
  score: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarNumber: number;
  academicLevel: string | null;
  universityShortCode: string | null;
}

interface RoomSnapshotResponse {
  battle: {
    id: string;
    status: string;
    mode: "free" | "reward";
    questionCount: number;
    timePerQuestionSeconds: number;
    stakeAmountLamports: number;
    inviteCode: string;
    creatorUserId: string;
    courseCode: string;
    courseTitle: string;
    topicName: string | null;
  };
  spectatorCount: number;
  participants: RoomParticipantDetail[];
}

export interface ViewBattleRoomDialogProps {
  battleId: string;
  currentUserId: string;
  initialCourseCode: string;
  initialCourseTitle: string;
  initialTopicName: string | null;
  initialStatus: string;
  initialMode: "free" | "reward";
  initialStakeLamports: number;
  initialQuestionCount: number;
  initialTimePerQuestionSeconds: number;
  initialSpectatorCount?: number;
}

export function ViewBattleRoomDialog({
  battleId,
  currentUserId,
  initialCourseCode,
  initialCourseTitle,
  initialTopicName,
  initialStatus,
  initialMode,
  initialStakeLamports,
  initialQuestionCount,
  initialTimePerQuestionSeconds,
  initialSpectatorCount = 0,
}: ViewBattleRoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<RoomSnapshotResponse | null>(null);

  const loadRoomDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as RoomSnapshotResponse;
      setSnapshot(data);
    } catch {
      // Ignore transient errors
    } finally {
      setIsLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    void loadRoomDetails();

    const interval = setInterval(() => {
      void loadRoomDetails();
    }, 2500);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loadRoomDetails]);

  const battle = snapshot?.battle;
  const status = battle?.status ?? initialStatus;
  const mode = battle?.mode ?? initialMode;
  const stakeLamports = battle?.stakeAmountLamports ?? initialStakeLamports;
  const courseCode = battle?.courseCode ?? initialCourseCode;
  const courseTitle = battle?.courseTitle ?? initialCourseTitle;
  const topicName = battle?.topicName ?? initialTopicName;
  const questionCount = battle?.questionCount ?? initialQuestionCount;
  const timePerQuestion =
    battle?.timePerQuestionSeconds ?? initialTimePerQuestionSeconds;
  const spectatorCount = snapshot?.spectatorCount ?? initialSpectatorCount;

  const participants = snapshot?.participants ?? [];
  const playerOne = participants.find((p) => p.slotIndex === 1) ?? null;
  const playerTwo = participants.find((p) => p.slotIndex === 2) ?? null;
  const isMyRoom = participants.some((p) => p.userId === currentUserId);
  const isWaiting = status === "WAITING";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1 px-2.5 text-xs"
        title="View Match Details, Opponents & Spectators"
      >
        <Info className="size-3.5 text-primary" />
        View
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Battle Room Details"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-primary/40 bg-card text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="font-game">
                    {courseCode}
                  </Badge>
                  <Badge
                    variant={isWaiting ? "outline" : "secondary"}
                    className="font-game text-[11px]"
                  >
                    {isWaiting ? "OPEN ROOM" : status}
                  </Badge>
                  {mode === "reward" ? (
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <Coins className="size-3 text-primary" />
                      {formatSol(stakeLamports)} SOL Stake
                    </Badge>
                  ) : null}
                </div>
                <h3 className="font-game text-base font-bold break-words text-foreground sm:text-lg">
                  {topicName ?? "All Course Topics"}
                </h3>
                <p className="text-xs text-muted-foreground">{courseTitle}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 p-5">
              {/* Match Metrics & Live Spectator Counter */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border bg-muted/25 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <HelpCircle className="size-3.5" />
                    <span className="font-game text-sm font-bold">
                      {questionCount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Questions
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/25 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <Clock className="size-3.5" />
                    <span className="font-game text-sm font-bold">
                      {timePerQuestion}s
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Per Question
                  </p>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <Eye className="size-3.5" />
                    <span className="font-game text-sm font-bold">
                      {spectatorCount}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {spectatorCount === 1 ? "Spectator" : "Spectators"}
                  </p>
                </div>
              </div>

              {/* Opponents Involved Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-game text-xs font-bold text-foreground">
                    <Users className="size-3.5 text-primary" />
                    OPPONENTS INVOLVED
                  </p>
                  {battle?.inviteCode ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Code:{" "}
                      <strong className="text-foreground">
                        {battle.inviteCode}
                      </strong>
                    </span>
                  ) : null}
                </div>

                {isLoading && !snapshot ? (
                  <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-8">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Slot 1: Challenger */}
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                      {playerOne ? (
                        <>
                          <ProfileAvatar
                            avatarUrl={playerOne.avatarUrl}
                            avatarNumber={playerOne.avatarNumber}
                            displayName={playerOne.displayName}
                            className="size-10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-game text-xs font-bold text-foreground">
                                {playerOne.displayName}
                              </p>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {playerOne.universityShortCode ?? "Student"} •{" "}
                              {playerOne.academicLevel ?? "200L"}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              {status === "ACTIVE" || status === "COMPLETED" ? (
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 font-mono text-[10px]"
                                >
                                  {playerOne.score} PTS
                                </Badge>
                              ) : playerOne.isReady ? (
                                <Badge className="gap-1 bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-600">
                                  <CheckCircle2 className="size-2.5" />
                                  Ready
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  Slot 1 • Host
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Challenger Slot 1
                        </p>
                      )}
                    </div>

                    {/* Slot 2: Opponent */}
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                      {playerTwo ? (
                        <>
                          <ProfileAvatar
                            avatarUrl={playerTwo.avatarUrl}
                            avatarNumber={playerTwo.avatarNumber}
                            displayName={playerTwo.displayName}
                            className="size-10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-game text-xs font-bold text-foreground">
                              {playerTwo.displayName}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {playerTwo.universityShortCode ?? "Student"} •{" "}
                              {playerTwo.academicLevel ?? "200L"}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              {status === "ACTIVE" || status === "COMPLETED" ? (
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 font-mono text-[10px]"
                                >
                                  {playerTwo.score} PTS
                                </Badge>
                              ) : playerTwo.isReady ? (
                                <Badge className="gap-1 bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-600">
                                  <CheckCircle2 className="size-2.5" />
                                  Ready
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  Slot 2 • Challenger
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2.5 text-muted-foreground">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/40">
                            <UserPlus className="size-4" />
                          </div>
                          <div>
                            <p className="font-game text-xs font-semibold text-foreground">
                              Open Slot 2
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Waiting for opponent
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-muted/20 px-5 py-3.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Close
              </Button>

              {!isMyRoom ? (
                <Link
                  href={`/arena/battle/${battleId}?spectate=true`}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="size-3.5 text-primary" />
                    Watch Live
                  </Button>
                </Link>
              ) : null}

              {isMyRoom ? (
                <Link
                  href={`/arena/battle/${battleId}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Swords className="size-3.5" />
                    Enter Your Room
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              ) : isWaiting && !playerTwo ? (
                <Link
                  href={`/arena/battle/${battleId}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Swords className="size-3.5" />
                    Accept Challenge
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
