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
import { ArrowLeft, Clock, Coins, Eye, HelpCircle } from "lucide-react";
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
  if (
    !forceSpectate &&
    user.id !== initialBattle.creatorUserId &&
    initialBattle.status === "WAITING"
  ) {
    const joinResult = await joinBattleAsOpponent(initialBattle.id, user);
    if (joinResult.joined && !joinResult.alreadyParticipant) {
      justJoinedSlotTwo = true;
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
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
        <Card className="border-primary/30 bg-card shadow-md">
          <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="font-game">
                  {battle.courseCode}
                </Badge>
                <Badge variant="secondary">{battle.status}</Badge>
                {battle.mode === "reward" ? (
                  <Badge variant="outline" className="gap-1">
                    <Coins className="size-3.5 text-primary" />
                    {(battle.stakeAmountLamports / 1_000_000_000).toFixed(2)}{" "}
                    SOL Stake
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="font-game text-2xl font-bold">
                {battle.courseTitle}
              </CardTitle>
              <CardDescription>
                Topic: {battle.topicName ?? "All Course Topics"} • Invite Code:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {battle.inviteCode}
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-semibold">
                  {battle.questionCount} Questions
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                <span className="font-semibold">
                  {battle.timePerQuestionSeconds}s / Question
                </span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Interactive Ready Lobby, 3D Turning-Box Countdown, Spectator View & Live Quiz */}
        <BattleLobbyArena
          battleId={battle.id}
          inviteCode={battle.inviteCode}
          currentUserId={user.id}
          initialStatus={battle.status}
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
