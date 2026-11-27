import { ArenaNavbar } from "@/components/arena/arena-navbar";
import {
  BattleLobbyArena,
  type LobbyParticipant,
} from "@/components/arena/battle-lobby-arena";
import { CopyInviteButton } from "@/components/arena/copy-invite-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { joinBattleAsOpponent } from "@/lib/battle-join";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import {
  asc,
  battleParticipants,
  battles,
  courses,
  db,
  eq,
  profiles,
  topics,
  universities,
} from "@repo/db";
import { formatSol } from "@repo/validators";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Coins,
  Eye,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BattleRoomPageProps {
  params: Promise<{
    battleId: string;
  }>;
  searchParams: Promise<{
    spectate?: string;
  }>;
}

export default async function BattleRoomPage({
  params,
  searchParams,
}: BattleRoomPageProps) {
  const { user, profile } = await requireOnboardedStudent();
  const { battleId } = await params;
  const resolvedSearchParams = await searchParams;
  const forceSpectate = resolvedSearchParams.spectate === "true";

  const [initialBattle] = await db
    .select({
      id: battles.id,
      inviteCode: battles.inviteCode,
      status: battles.status,
      mode: battles.mode,
      isPrivate: battles.isPrivate,
      questionCount: battles.questionCount,
      timePerQuestionSeconds: battles.timePerQuestionSeconds,
      stakeAmountLamports: battles.stakeAmountLamports,
      onChainBattlePda: battles.onChainBattlePda,
      creatorUserId: battles.creatorUserId,
      startedAt: battles.startedAt,
      courseCode: courses.code,
      courseTitle: courses.title,
      topicName: topics.name,
    })
    .from(battles)
    .innerJoin(courses, eq(battles.courseId, courses.id))
    .leftJoin(topics, eq(battles.topicId, topics.id))
    .where(eq(battles.id, battleId))
    .limit(1);

  if (!initialBattle) {
    notFound();
  }

  // Automatically enroll authenticated opponent into Slot 2 ONLY if not spectating and room is WAITING
  let justJoinedSlotTwo = false;
  let joinError: string | null = null;
  if (
    !forceSpectate &&
    user.id !== initialBattle.creatorUserId &&
    initialBattle.status === "WAITING"
  ) {
    const joinResult = await joinBattleAsOpponent(initialBattle.id, user);
    if (joinResult.joined && !joinResult.alreadyParticipant) {
      justJoinedSlotTwo = true;
    } else if (!joinResult.joined && joinResult.error) {
      // e.g. insufficient wallet balance for a Reward Battle stake
      joinError = joinResult.error;
    }
  }

  const battle = justJoinedSlotTwo
    ? { ...initialBattle, status: "READY" as const }
    : initialBattle;

  const participants: LobbyParticipant[] = await db
    .select({
      id: battleParticipants.id,
      userId: battleParticipants.userId,
      slotIndex: battleParticipants.slotIndex,
      isReady: battleParticipants.isReady,
      depositConfirmed: battleParticipants.depositConfirmed,
      depositTxSignature: battleParticipants.depositTxSignature,
      score: battleParticipants.score,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      avatarNumber: profiles.avatarNumber,
      academicLevel: profiles.academicLevel,
      universityShortCode: universities.shortCode,
    })
    .from(battleParticipants)
    .innerJoin(profiles, eq(battleParticipants.userId, profiles.id))
    .leftJoin(universities, eq(profiles.universityId, universities.id))
    .where(eq(battleParticipants.battleId, battle.id))
    .orderBy(asc(battleParticipants.slotIndex));

  const isParticipant = participants.some((p) => p.userId === user.id);
  const isSpectator = !isParticipant;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} />

      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            Back to Arena Lobby
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {isSpectator ? (
              <Badge variant="default" className="gap-1.5 font-game">
                <Eye className="size-3.5" />
                SPECTATOR MODE
              </Badge>
            ) : null}
            <CopyInviteButton
              inviteCode={battle.inviteCode}
              battleId={battle.id}
            />
          </div>
        </div>

        {/* Battle Room Header Card */}
        <Card className="w-full min-w-0 overflow-hidden border-primary/30 bg-card shadow-md">
          <CardHeader className="flex min-w-0 flex-col justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="font-game">
                  {battle.courseCode}
                </Badge>
                <Badge variant="secondary">{battle.status}</Badge>
                {battle.mode === "reward" ? (
                  <Badge variant="outline" className="gap-1">
                    <Coins className="size-3.5 text-primary" />
                    {formatSol(battle.stakeAmountLamports)}{" "}
                    SOL Stake
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="font-game text-lg font-bold break-words sm:text-2xl">
                {battle.courseTitle}
              </CardTitle>
              <CardDescription className="break-words">
                Topic: {battle.topicName ?? "All Course Topics"} • Invite Code:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {battle.inviteCode}
                </span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs sm: shrink-0 sm:gap-4 sm:self-center sm:px-4 sm:py-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-4 shrink-0 text-primary" />
                <span className="font-semibold">
                  {battle.questionCount} Questions
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 shrink-0 text-primary" />
                <span className="font-semibold">
                  {battle.timePerQuestionSeconds}s / Question
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {joinError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>
              Could not join this battle: {joinError} You are viewing as a
              spectator.
            </p>
          </div>
        ) : null}

        {/* Interactive Ready Lobby, 3D Turning-Box Countdown, Spectator View & Live Quiz */}
        <BattleLobbyArena
          battleId={battle.id}
          inviteCode={battle.inviteCode}
          currentUserId={user.id}
          initialStatus={battle.status}
          battleMode={battle.mode}
          stakeAmountLamports={battle.stakeAmountLamports}
          onChainBattlePda={battle.onChainBattlePda}
          initialCountdownEndsAt={
            battle.startedAt ? battle.startedAt.toISOString() : null
          }
          initialServerNow={new Date().toISOString()}
          initialParticipants={participants}
          justJoinedSlotTwo={justJoinedSlotTwo}
        />
      </main>
    </div>
  );
}
