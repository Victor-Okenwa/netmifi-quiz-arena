import { ProfileAvatar } from "@/assets/profiles";
import { ArenaNavbar } from "@/components/arena/arena-navbar";
import { BattleRoomLiveWatcher } from "@/components/arena/battle-room-live-watcher";
import { CopyInviteButton } from "@/components/arena/copy-invite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  ArrowLeft,
  Clock,
  Coins,
  HelpCircle,
  Swords,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BattleRoomPageProps {
  params: Promise<{
    battleId: string;
  }>;
}

export default async function BattleRoomPage({ params }: BattleRoomPageProps) {
  const { user, profile } = await requireOnboardedStudent();
  const { battleId } = await params;

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

  // If the current authenticated student is not the creator and visits the room while Slot 2 is open,
  // automatically enroll them into Slot 2 (`battle_participants`)
  let justJoinedSlotTwo = false;
  if (
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

  const participants = await db
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

  const playerOne = participants.find((p) => p.slotIndex === 1) ?? null;
  const playerTwo = participants.find((p) => p.slotIndex === 2) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} />
      <BattleRoomLiveWatcher
        battleId={battle.id}
        initialParticipantCount={participants.length}
        initialBattleStatus={battle.status}
        justJoinedSlotTwo={justJoinedSlotTwo}
        inviteCode={battle.inviteCode}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Arena Lobby
          </Link>

          <CopyInviteButton
            inviteCode={battle.inviteCode}
            battleId={battle.id}
          />
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

        {/* Player 1 vs Player 2 Matchup Slots */}
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-11">
          {/* Player 1 Slot */}
          <Card className="border-border bg-card shadow-sm md:col-span-5">
            <CardHeader className="items-center text-center">
              <Badge variant="secondary" className="mb-2 text-[10px]">
                Challenger • Slot 1
              </Badge>
              {playerOne ? (
                <>
                  <ProfileAvatar
                    avatarUrl={playerOne.avatarUrl}
                    avatarNumber={playerOne.avatarNumber}
                    displayName={playerOne.displayName}
                    className="size-20 ring-4 ring-primary/25"
                  />
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
            <CardContent className="text-center">
              <Badge variant="default" className="font-game text-xs">
                In Room
              </Badge>
            </CardContent>
          </Card>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center md:col-span-1">
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-primary bg-primary-light font-game text-sm font-extrabold text-primary shadow-sm">
              VS
            </div>
          </div>

          {/* Player 2 Slot */}
          <Card className="border-border bg-card shadow-sm md:col-span-5">
            <CardHeader className="items-center text-center">
              <Badge variant="secondary" className="mb-2 text-[10px]">
                Opponent • Slot 2
              </Badge>
              {playerTwo ? (
                <>
                  <ProfileAvatar
                    avatarUrl={playerTwo.avatarUrl}
                    avatarNumber={playerTwo.avatarNumber}
                    displayName={playerTwo.displayName}
                    className="size-20 ring-4 ring-primary/25"
                  />
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
                      {battle.inviteCode}
                    </span>{" "}
                    with a classmate to join.
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="text-center">
              {playerTwo ? (
                <Badge variant="default" className="font-game text-xs">
                  In Room
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Open Slot
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-muted/20">
          <CardContent className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <Swords className="size-5 text-primary" />
              <div>
                <p className="font-game text-sm font-bold">
                  BATTLE LOBBY READY
                </p>
                <p className="text-xs text-muted-foreground">
                  Once both students are in the room, the timed quiz battle
                  begins automatically.
                </p>
              </div>
            </div>
            <Link href="/arena">
              <Button variant="outline" size="sm">
                Return to Lobby
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
