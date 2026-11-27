"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { LiveBattleQuiz } from "@/components/arena/live-battle-quiz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
  Swords,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface LobbyParticipant {
  id?: string;
  userId: string;
  slotIndex: number;
  isReady: boolean;
  score?: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarNumber: number;
  academicLevel: string | null;
  universityShortCode: string | null;
}

interface BattleLobbyArenaProps {
  battleId: string;
  inviteCode: string;
  currentUserId: string;
  initialStatus: string;
  initialCountdownEndsAt: string | null;
  initialServerNow: string;
  initialParticipants: LobbyParticipant[];
  justJoinedSlotTwo?: boolean;
}

const LOCK_THRESHOLD_SECONDS = 10;

function areParticipantsEqual(
  a: LobbyParticipant[],
  b: LobbyParticipant[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pA = a[i];
    const pB = b[i];
    if (!pA || !pB) return false;
    if (
      pA.userId !== pB.userId ||
      pA.slotIndex !== pB.slotIndex ||
      pA.isReady !== pB.isReady ||
      pA.displayName !== pB.displayName
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Single 3D Turning Box Digit (`0`–`9`).
 */
function TurningDigitBox({
  digit,
  isLocked,
}: {
  digit: string;
  isLocked: boolean;
}) {
  return (
    <div
      className="relative flex h-20 w-16 items-center justify-center sm:h-24 sm:w-20"
      style={{ perspective: "600px" }}
    >
      <div
        key={digit}
        className={`animate-box-turn relative flex h-full w-full items-center justify-center rounded-xl border-2 font-game text-4xl font-extrabold shadow-lg sm:text-5xl ${
          isLocked
            ? "border-primary bg-primary text-primary-foreground shadow-primary/25"
            : "border-emerald-500/60 bg-card text-emerald-500 shadow-emerald-500/10"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-1/2 h-px ${
            isLocked ? "bg-primary-foreground/20" : "bg-border/80"
          }`}
        />
        <span className="relative z-10 tracking-tight">{digit}</span>
      </div>
    </div>
  );
}

export function BattleLobbyArena({
  battleId,
  inviteCode,
  currentUserId,
  initialStatus,
  initialCountdownEndsAt,
  initialServerNow,
  initialParticipants,
  justJoinedSlotTwo = false,
}: BattleLobbyArenaProps) {
  const router = useRouter();

  const [participants, setParticipants] =
    useState<LobbyParticipant[]>(initialParticipants);
  const [battleStatus, setBattleStatus] = useState<string>(initialStatus);
  const [countdownEndsAt, setCountdownEndsAt] = useState<string | null>(
    initialCountdownEndsAt
  );

  // Permanent latch: once the match enters ACTIVE or COMPLETED, never unmount LiveBattleQuiz
  const [matchStartedLatch, setMatchStartedLatch] = useState<boolean>(
    initialStatus === "ACTIVE" || initialStatus === "COMPLETED"
  );

  const clockOffsetMsRef = useRef<number>(
    Number.isNaN(Date.parse(initialServerNow))
      ? 0
      : Date.parse(initialServerNow) - Date.now()
  );

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    () => {
      if (!initialCountdownEndsAt) return null;
      const diff = Math.ceil(
        (Date.parse(initialCountdownEndsAt) -
          (Date.now() + clockOffsetMsRef.current)) /
          1000
      );
      return Math.max(0, diff);
    }
  );

  const [isTogglingReady, setIsTogglingReady] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);

  const prevParticipantsRef = useRef<LobbyParticipant[]>(initialParticipants);
  const announcedSelfJoinRef = useRef(false);
  const announcedLockRef = useRef(false);
  const announcedStartRef = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createBrowserSupabaseClient>["channel"]
  > | null>(null);

  const playerOne = participants.find((p) => p.slotIndex === 1) ?? null;
  const playerTwo = participants.find((p) => p.slotIndex === 2) ?? null;
  const myParticipant =
    participants.find((p) => p.userId === currentUserId) ?? null;
  const bothReady = Boolean(playerOne?.isReady && playerTwo?.isReady);

  useEffect(() => {
    if (justJoinedSlotTwo && !announcedSelfJoinRef.current) {
      announcedSelfJoinRef.current = true;
      toast.success("Joined battle room!", {
        description: `Connected to room ${inviteCode} as Opponent (Slot 2).`,
      });
    }
  }, [justJoinedSlotTwo, inviteCode]);

  const applyLobbySnapshot = useCallback(
    (data: {
      battle?: { status: string; countdownEndsAt: string | null };
      serverNow?: string;
      participants?: LobbyParticipant[];
    }) => {
      if (data.serverNow) {
        const parsedServer = Date.parse(data.serverNow);
        if (!Number.isNaN(parsedServer)) {
          clockOffsetMsRef.current = parsedServer - Date.now();
        }
      }

      if (data.battle) {
        const nextStatus = data.battle.status;
        if (nextStatus === "ACTIVE" || nextStatus === "COMPLETED") {
          setMatchStartedLatch(true);
        }
        setBattleStatus((prev) => (prev !== nextStatus ? nextStatus : prev));
        setCountdownEndsAt((prev) =>
          prev !== data.battle!.countdownEndsAt
            ? data.battle!.countdownEndsAt
            : prev
        );
      }

      if (data.participants) {
        const prev = prevParticipantsRef.current;
        const next = data.participants;

        if (!areParticipantsEqual(prev, next)) {
          if (prev.length < 2 && next.length === 2) {
            const opp = next.find((p) => p.userId !== currentUserId);
            if (opp) {
              toast.success(`${opp.displayName} joined the room!`);
            }
          }

          if (prev.length === 2 && next.length < 2) {
            const leftPlayer = prev.find((p) => p.slotIndex === 2);
            if (leftPlayer && leftPlayer.userId !== currentUserId) {
              toast.info(`${leftPlayer.displayName} left the battle room.`);
            }
          }

          for (const nextP of next) {
            if (nextP.userId === currentUserId) continue;
            const prevP = prev.find((p) => p.userId === nextP.userId);
            if (prevP && prevP.isReady !== nextP.isReady) {
              if (nextP.isReady) {
                toast.success(`${nextP.displayName} is READY!`);
              } else {
                toast.warning(`${nextP.displayName} is no longer ready.`);
              }
            }
          }

          prevParticipantsRef.current = next;
          setParticipants(next);
        }
      }
    },
    [currentUserId]
  );

  const fetchLatestSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        battle?: { status: string; countdownEndsAt: string | null };
        serverNow?: string;
        participants?: LobbyParticipant[];
      };
      applyLobbySnapshot(data);
    } catch {
      // Ignore transient network errors
    }
  }, [battleId, applyLobbySnapshot]);

  // Only poll the pre-battle lobby while the match has NOT started yet
  useEffect(() => {
    if (matchStartedLatch) {
      return;
    }

    let isMounted = true;

    try {
      const supabase = createBrowserSupabaseClient();
      const channel = supabase
        .channel(`battle-lobby:${battleId}`)
        .on("broadcast", { event: "lobby_updated" }, () => {
          if (isMounted) {
            void fetchLatestSnapshot();
          }
        })
        .subscribe();

      channelRef.current = channel;
    } catch {
      // Fallback to polling
    }

    const pollInterval = setInterval(() => {
      if (isMounted) {
        void fetchLatestSnapshot();
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (channelRef.current) {
        try {
          const supabase = createBrowserSupabaseClient();
          void supabase.removeChannel(channelRef.current);
        } catch {
          // Ignore cleanup errors
        }
        channelRef.current = null;
      }
    };
  }, [battleId, fetchLatestSnapshot, matchStartedLatch]);

  function broadcastLobbyUpdate() {
    if (channelRef.current) {
      void channelRef.current.send({
        type: "broadcast",
        event: "lobby_updated",
        payload: { timestamp: Date.now() },
      });
    }
  }

  // Tick the 20-second countdown timer without resetting on clockOffsetMs jitter
  useEffect(() => {
    if (matchStartedLatch) {
      return;
    }

    if (!bothReady || !countdownEndsAt) {
      setRemainingSeconds(null);
      announcedLockRef.current = false;
      return;
    }

    const targetMs = Date.parse(countdownEndsAt);
    if (Number.isNaN(targetMs)) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const syncedNow = Date.now() + clockOffsetMsRef.current;
      const secs = Math.max(0, Math.ceil((targetMs - syncedNow) / 1000));
      setRemainingSeconds((prev) => (prev !== secs ? secs : prev));

      if (
        secs <= LOCK_THRESHOLD_SECONDS &&
        secs > 0 &&
        !announcedLockRef.current
      ) {
        announcedLockRef.current = true;
        toast.info("Match locked in!", {
          description:
            "10 seconds remaining — ready state and leaving are now locked.",
        });
      }

      if (secs === 0 && !announcedStartRef.current) {
        announcedStartRef.current = true;
        setBattleStatus("ACTIVE");
        setMatchStartedLatch(true);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 200);
    return () => clearInterval(timer);
  }, [bothReady, countdownEndsAt, matchStartedLatch]);

  if (
    matchStartedLatch ||
    battleStatus === "ACTIVE" ||
    battleStatus === "COMPLETED"
  ) {
    return (
      <LiveBattleQuiz battleId={battleId} currentUserId={currentUserId} />
    );
  }

  const isCountdownLocked =
    bothReady &&
    remainingSeconds !== null &&
    remainingSeconds <= LOCK_THRESHOLD_SECONDS;

  async function handleToggleReady() {
    if (!myParticipant || isCountdownLocked) return;

    setIsTogglingReady(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_ready" }),
      });

      const data = (await res.json()) as {
        error?: string;
        isReady?: boolean;
        battle?: { status: string; countdownEndsAt: string | null };
        serverNow?: string;
        participants?: LobbyParticipant[];
      };

      if (!res.ok) {
        toast.error("Cannot change ready state", {
          description: data.error ?? "Please try again.",
        });
        return;
      }

      applyLobbySnapshot(data);
      broadcastLobbyUpdate();

      if (data.isReady) {
        toast.success("You are READY!", {
          description:
            data.participants?.length === 2 &&
            data.participants.every((p) => p.isReady)
              ? "Both players ready! 20-second match countdown started."
              : "Waiting for opponent to signal ready.",
        });
      } else {
        toast.info("Ready cancelled");
      }
    } catch {
      toast.error("Network error while toggling ready state.");
    } finally {
      setIsTogglingReady(false);
    }
  }

  async function handleLeaveRoom() {
    if (!myParticipant || myParticipant.slotIndex !== 2 || isCountdownLocked) {
      return;
    }

    setIsLeavingRoom(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_room" }),
      });

      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        toast.error("Cannot leave room", {
          description: data.error ?? "Countdown is locked.",
        });
        setIsLeavingRoom(false);
        return;
      }

      broadcastLobbyUpdate();
      toast.success("You left the battle room.");
      router.push(data.redirectTo ?? "/arena");
    } catch {
      toast.error("Network error while leaving room.");
      setIsLeavingRoom(false);
    }
  }

  const formattedSeconds =
    remainingSeconds !== null
      ? String(Math.max(0, Math.min(20, remainingSeconds))).padStart(2, "0")
      : "20";
  const tensDigit = formattedSeconds[0] ?? "2";
  const onesDigit = formattedSeconds[1] ?? "0";

  return (
    <div className="space-y-6">
      {/* 20-Second 3D Turning-Box Countdown Banner */}
      {bothReady && remainingSeconds !== null ? (
        <Card
          className={`overflow-hidden border-2 transition-all ${
            isCountdownLocked
              ? "border-primary bg-primary-light/30 shadow-lg"
              : "border-emerald-500/50 bg-emerald-500/5 shadow-md"
          }`}
        >
          <CardContent className="flex flex-col items-center justify-between gap-6 py-6 sm:flex-row sm:px-8">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                {isCountdownLocked ? (
                  <Badge variant="default" className="gap-1.5 font-game">
                    <Lock className="size-3.5" />
                    MATCH LOCKED IN
                  </Badge>
                ) : (
                  <Badge className="gap-1.5 bg-emerald-600 font-game text-white hover:bg-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    BOTH PLAYERS READY
                  </Badge>
                )}
              </div>

              <h3 className="font-game text-xl font-extrabold tracking-tight sm:text-2xl">
                {isCountdownLocked
                  ? "PREPARE FOR BATTLE — CONTROLS LOCKED"
                  : "MATCH STARTING IN..."}
              </h3>

              <p className="text-xs text-muted-foreground">
                {isCountdownLocked
                  ? "Countdown is at or below 10 seconds. Ready toggle and leaving are now disabled."
                  : "You can still unready or leave before the countdown reaches 10 seconds."}
              </p>
            </div>

            {/* 3D Turning Digit Boxes */}
            <div className="flex items-center gap-3">
              <TurningDigitBox digit={tensDigit} isLocked={isCountdownLocked} />
              <TurningDigitBox digit={onesDigit} isLocked={isCountdownLocked} />
              <div className="ml-1 flex flex-col text-left">
                <span className="font-game text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  SEC
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isCountdownLocked ? "Locked" : "Counting"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Player 1 vs Player 2 Matchup Slots */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-11">
        {/* Player 1 Slot (Challenger) */}
        <Card
          className={`flex flex-col justify-between border-2 transition-all md:col-span-5 ${
            playerOne?.isReady
              ? "border-emerald-500/70 bg-emerald-500/5 shadow-md"
              : "border-border bg-card shadow-sm"
          }`}
        >
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Challenger • Slot 1
              </Badge>
              {playerOne?.userId === currentUserId ? (
                <Badge variant="default" className="text-[10px]">
                  You
                </Badge>
              ) : null}
            </div>

            {playerOne ? (
              <>
                <div className="relative">
                  <ProfileAvatar
                    avatarUrl={playerOne.avatarUrl}
                    avatarNumber={playerOne.avatarNumber}
                    displayName={playerOne.displayName}
                    className={`size-20 ring-4 ${
                      playerOne.isReady
                        ? "ring-emerald-500/50"
                        : "ring-primary/25"
                    }`}
                  />
                  {playerOne.isReady ? (
                    <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                      <CheckCircle2 className="size-4" />
                    </span>
                  ) : null}
                </div>

                <CardTitle className="mt-3 font-game text-lg font-bold">
                  {playerOne.displayName}
                </CardTitle>
                <CardDescription className="text-xs">
                  @{playerOne.username} •{" "}
                  {playerOne.universityShortCode ?? "Student"} (
                  {playerOne.academicLevel ?? "200L"})
                </CardDescription>
              </>
            ) : null}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-3 text-center">
            {playerOne?.isReady ? (
              <Badge className="gap-1.5 bg-emerald-600 px-3 py-1 font-game text-xs text-white hover:bg-emerald-600">
                <CheckCircle2 className="size-3.5" />
                READY
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1 font-game text-xs">
                <Clock className="mr-1 size-3.5 text-muted-foreground" />
                NOT READY
              </Badge>
            )}

            {playerOne?.userId === currentUserId ? (
              <Button
                type="button"
                onClick={handleToggleReady}
                disabled={isTogglingReady || isCountdownLocked}
                className={`mt-2 w-full gap-2 font-game text-xs font-bold text-white shadow-sm ${
                  playerOne.isReady
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isTogglingReady ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isCountdownLocked ? (
                  <Lock className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {isCountdownLocked
                  ? "Ready Locked (Under 10s)"
                  : playerOne.isReady
                    ? "Ready ✓ (Click to Unready)"
                    : "Signal Ready"}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* VS Divider */}
        <div className="flex flex-col items-center justify-center md:col-span-1">
          <div className="flex size-12 items-center justify-center rounded-full border-2 border-primary bg-primary-light font-game text-sm font-extrabold text-primary shadow-sm">
            VS
          </div>
        </div>

        {/* Player 2 Slot (Opponent) */}
        <Card
          className={`flex flex-col justify-between border-2 transition-all md:col-span-5 ${
            playerTwo?.isReady
              ? "border-emerald-500/70 bg-emerald-500/5 shadow-md"
              : "border-border bg-card shadow-sm"
          }`}
        >
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                Opponent • Slot 2
              </Badge>
              {playerTwo?.userId === currentUserId ? (
                <Badge variant="default" className="text-[10px]">
                  You
                </Badge>
              ) : null}
            </div>

            {playerTwo ? (
              <>
                <div className="relative">
                  <ProfileAvatar
                    avatarUrl={playerTwo.avatarUrl}
                    avatarNumber={playerTwo.avatarNumber}
                    displayName={playerTwo.displayName}
                    className={`size-20 ring-4 ${
                      playerTwo.isReady
                        ? "ring-emerald-500/50"
                        : "ring-primary/25"
                    }`}
                  />
                  {playerTwo.isReady ? (
                    <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                      <CheckCircle2 className="size-4" />
                    </span>
                  ) : null}
                </div>

                <CardTitle className="mt-3 font-game text-lg font-bold">
                  {playerTwo.displayName}
                </CardTitle>
                <CardDescription className="text-xs">
                  @{playerTwo.username} •{" "}
                  {playerTwo.universityShortCode ?? "Student"} (
                  {playerTwo.academicLevel ?? "200L"})
                </CardDescription>
              </>
            ) : (
              <>
                <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40">
                  <UserPlus className="size-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-3 font-game text-lg font-bold text-muted-foreground">
                  Waiting for Opponent...
                </CardTitle>
                <CardDescription className="text-xs">
                  Share invite code{" "}
                  <span className="font-mono font-bold text-foreground">
                    {inviteCode}
                  </span>{" "}
                  with a classmate to join.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-3 text-center">
            {playerTwo ? (
              <>
                {playerTwo.isReady ? (
                  <Badge className="gap-1.5 bg-emerald-600 px-3 py-1 font-game text-xs text-white hover:bg-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    READY
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="px-3 py-1 font-game text-xs"
                  >
                    <Clock className="mr-1 size-3.5 text-muted-foreground" />
                    NOT READY
                  </Badge>
                )}

                {playerTwo.userId === currentUserId ? (
                  <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleToggleReady}
                      disabled={
                        isTogglingReady || isLeavingRoom || isCountdownLocked
                      }
                      className={`flex-1 gap-2 font-game text-xs font-bold text-white shadow-sm ${
                        playerTwo.isReady
                          ? "bg-emerald-700 hover:bg-emerald-800"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {isTogglingReady ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isCountdownLocked ? (
                        <Lock className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {isCountdownLocked
                        ? "Ready Locked"
                        : playerTwo.isReady
                          ? "Ready ✓ (Unready)"
                          : "Signal Ready"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLeaveRoom}
                      disabled={
                        isLeavingRoom || isTogglingReady || isCountdownLocked
                      }
                      className="gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                    >
                      {isLeavingRoom ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isCountdownLocked ? (
                        <Lock className="size-3.5" />
                      ) : (
                        <LogOut className="size-3.5" />
                      )}
                      Leave Room
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <Badge variant="outline" className="text-xs">
                Open Slot
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lobby Status Bar */}
      <Card className="border-border bg-muted/20">
        <CardContent className="flex flex-col items-center justify-between gap-4 py-5 sm:flex-row">
          <div className="flex items-center gap-3">
            {isCountdownLocked ? (
              <ShieldAlert className="size-5 text-primary" />
            ) : (
              <Swords className="size-5 text-primary" />
            )}
            <div>
              <p className="font-game text-sm font-bold">
                {bothReady
                  ? "COUNTDOWN ACTIVE — GET READY!"
                  : playerTwo
                    ? "WAITING FOR BOTH PLAYERS TO SIGNAL READY"
                    : "WAITING FOR OPPONENT TO JOIN ROOM"}
              </p>
              <p className="text-xs text-muted-foreground">
                {bothReady
                  ? "The 20-second countdown locks when 10 seconds remain."
                  : "Click the green Signal Ready button on your card when you are set to begin."}
              </p>
            </div>
          </div>

          <Link href="/arena">
            <Button variant="outline" size="sm">
              Back to Lobby
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
