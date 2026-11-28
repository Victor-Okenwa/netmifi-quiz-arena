import { ProfileAvatar } from "@/assets/profiles";
import { ArenaAppShell } from "@/components/arena/app-sidebar";
import { DeleteBattleButton } from "@/components/arena/delete-battle-button";
import { QuickJoinCard } from "@/components/arena/quick-join-card";
import { ViewBattleRoomDialog } from "@/components/arena/view-battle-room-dialog";
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
import { FALLBACK_COURSES, FALLBACK_TOPICS } from "@/lib/academic-fallback";
import { getActiveSpectatorCount } from "@/lib/battle-engine/spectator-presence";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import {
  and,
  asc,
  battleParticipants,
  battles,
  courses,
  db,
  desc,
  eq,
  inArray,
  profiles,
  topics,
  universities,
} from "@repo/db";
import { formatSol } from "@repo/validators";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Coins,
  Eye,
  PlusCircle,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

interface OpenBattleRow {
  id: string;
  inviteCode: string;
  status: string;
  mode: "free" | "reward";
  questionCount: number;
  timePerQuestionSeconds: number;
  stakeAmountLamports: number;
  courseCode: string;
  courseTitle: string;
  topicName: string | null;
  creatorUserId: string;
  creatorDisplayName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  creatorAvatarNumber: number;
  creatorUniversityShortCode: string | null;
}

interface RecentBattleRow {
  id: string;
  inviteCode: string;
  status: string;
  mode: "free" | "reward";
  score: number;
  courseCode: string;
  courseTitle: string;
  topicName: string | null;
  creatorUserId: string;
}

export default async function ArenaPage() {
  const { profile } = await requireOnboardedStudent();

  let availableCourses = FALLBACK_COURSES;
  let availableTopics = FALLBACK_TOPICS;
  let openBattles: OpenBattleRow[] = [];
  let recentBattles: RecentBattleRow[] = [];

  try {
    const [dbCourses, dbTopics, dbOpenBattles, dbRecentBattles] =
      await Promise.all([
        db
          .select({
            id: courses.id,
            code: courses.code,
            title: courses.title,
            description: courses.description,
            academicLevel: courses.academicLevel,
          })
          .from(courses)
          .orderBy(asc(courses.code)),
        db
          .select({
            id: topics.id,
            courseId: topics.courseId,
            name: topics.name,
            slug: topics.slug,
          })
          .from(topics)
          .orderBy(asc(topics.orderIndex)),
        db
          .select({
            id: battles.id,
            inviteCode: battles.inviteCode,
            status: battles.status,
            mode: battles.mode,
            questionCount: battles.questionCount,
            timePerQuestionSeconds: battles.timePerQuestionSeconds,
            stakeAmountLamports: battles.stakeAmountLamports,
            courseCode: courses.code,
            courseTitle: courses.title,
            topicName: topics.name,
            creatorUserId: battles.creatorUserId,
            creatorDisplayName: profiles.displayName,
            creatorUsername: profiles.username,
            creatorAvatarUrl: profiles.avatarUrl,
            creatorAvatarNumber: profiles.avatarNumber,
            creatorUniversityShortCode: universities.shortCode,
          })
          .from(battles)
          .innerJoin(courses, eq(battles.courseId, courses.id))
          .leftJoin(topics, eq(battles.topicId, topics.id))
          .innerJoin(profiles, eq(battles.creatorUserId, profiles.id))
          .leftJoin(universities, eq(profiles.universityId, universities.id))
          .where(
            and(
              inArray(battles.status, ["WAITING", "READY", "ACTIVE"]),
              eq(battles.isPrivate, false),
            ),
          )
          .orderBy(desc(battles.createdAt))
          .limit(10),
        db
          .select({
            id: battles.id,
            inviteCode: battles.inviteCode,
            status: battles.status,
            mode: battles.mode,
            score: battleParticipants.score,
            courseCode: courses.code,
            courseTitle: courses.title,
            topicName: topics.name,
            creatorUserId: battles.creatorUserId,
          })
          .from(battleParticipants)
          .innerJoin(battles, eq(battleParticipants.battleId, battles.id))
          .innerJoin(courses, eq(battles.courseId, courses.id))
          .leftJoin(topics, eq(battles.topicId, topics.id))
          .where(eq(battleParticipants.userId, profile.id))
          .orderBy(desc(battleParticipants.joinedAt))
          .limit(4),
      ]);

    if (dbCourses.length > 0) {
      availableCourses = dbCourses;
      availableTopics = dbTopics;
    }
    openBattles = dbOpenBattles;
    recentBattles = dbRecentBattles;
  } catch {
    // Fallback catalog used when remote DATABASE_URL is not yet configured
  }

  const winRate =
    profile.battlesPlayed > 0
      ? Math.round((profile.battlesWon / profile.battlesPlayed) * 100)
      : 0;

  return (
    <ArenaAppShell profile={profile} activeTab="lobby">
      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Student Identity & Quick Actions Banner */}
        <Card className="w-full min-w-0 overflow-hidden border-primary/30 bg-card shadow-sm">
          <CardHeader className="flex min-w-0 flex-col justify-between gap-5 px-4 sm:px-6 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                avatarNumber={profile.avatarNumber}
                displayName={profile.displayName}
                className="size-14 shrink-0 ring-2 ring-primary/30 sm:size-16"
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    @{profile.username}
                  </span>
                  {profile.universityShortCode ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {profile.universityShortCode}
                    </Badge>
                  ) : null}
                </div>
                <CardTitle className="font-game text-lg font-bold break-words sm:text-2xl">
                  Welcome back, {profile.displayName}
                </CardTitle>
                <CardDescription className="break-words text-xs sm:text-sm">
                  {profile.universityName} • {profile.departmentName} (
                  {profile.academicLevel})
                </CardDescription>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:w-auto">
              <div className="grid w-full grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-center sm:w-auto sm:grid-cols-4 sm:gap-4 sm:px-5">
                <div>
                  <p className="font-game text-base font-bold text-primary sm:text-lg">
                    {profile.xp}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Total XP</p>
                </div>
                <div>
                  <p className="font-game text-base font-bold text-foreground sm:text-lg">
                    {profile.battlesPlayed}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Battles</p>
                </div>
                <div>
                  <p className="font-game text-base font-bold text-foreground sm:text-lg">
                    {profile.battlesWon}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Victories</p>
                </div>
                <div>
                  <p className="font-game text-base font-bold text-foreground sm:text-lg">
                    {winRate}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">Win Rate</p>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-2.5 sm:flex sm:w-auto sm:items-center">
                <Link href="/arena/find-match" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 sm:w-auto"
                  >
                    <Users className="size-4 text-primary" />
                    Find Match
                  </Button>
                </Link>
                <Link href="/arena/new" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 sm:w-auto">
                    <PlusCircle className="size-4" />
                    Create Battle
                  </Button>
                </Link>
                <Link href="/leaderboard" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 sm:w-auto"
                  >
                    <Trophy className="size-4 text-primary" />
                    Rankings
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Matchmaking Row: Invite Code + Open & Live Challenges */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-4">
            <QuickJoinCard />

            {recentBattles.length > 0 ? (
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-game text-base font-bold">
                    YOUR RECENT BATTLES
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Jump back into an active room or view results.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {recentBattles.map((rb) => (
                    <div
                      key={rb.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/70"
                    >
                      <Link
                        href={`/arena/battle/${rb.id}`}
                        className="min-w-0 flex-1 pr-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-game text-xs font-bold text-primary">
                            {rb.courseCode}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {rb.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                          {rb.topicName ?? rb.courseTitle}
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {rb.creatorUserId === profile.id &&
                        rb.status === "WAITING" ? (
                          <DeleteBattleButton battleId={rb.id} />
                        ) : null}
                        <Link href={`/arena/battle/${rb.id}`}>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Open & Live Challenges Feed */}
          <Card className="w-full min-w-0 overflow-hidden border-border bg-card shadow-sm lg:col-span-8">
            <CardHeader className="flex flex-col items-start justify-between gap-3 pb-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-primary" />
                  <CardTitle className="font-game text-base font-bold sm:text-lg">
                    OPEN & LIVE ARENA ROOMS
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Accept an open challenge or spectate a live match in progress.
                </CardDescription>
              </div>
              <Link href="/arena/new" className="shrink-0">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Swords className="size-3.5 text-primary" />
                  Host Room
                </Button>
              </Link>
            </CardHeader>

            <CardContent>
              {openBattles.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                  <Swords className="mb-3 size-8 text-muted-foreground" />
                  <p className="font-game text-sm font-bold text-foreground">
                    NO OPEN OR LIVE ROOMS RIGHT NOW
                  </p>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Be the first to open a battle room for your course or invite
                    a classmate directly with an invite code.
                  </p>
                  <Link href="/arena/new" className="mt-4">
                    <Button size="sm" className="gap-1.5">
                      <PlusCircle className="size-4" />
                      Create First Challenge
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {openBattles.map((battle) => {
                    const isWaiting = battle.status === "WAITING";
                    const spectatorCount = getActiveSpectatorCount(battle.id);
                    return (
                      <div
                        key={battle.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="default" className="font-game">
                                {battle.courseCode}
                              </Badge>
                              <Badge
                                variant={isWaiting ? "outline" : "secondary"}
                                className="text-[10px]"
                              >
                                {isWaiting ? "OPEN" : battle.status}
                              </Badge>
                              {battle.mode === "reward" ? (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 text-[10px]"
                                >
                                  <Coins className="size-3 text-primary" />
                                  {formatSol(battle.stakeAmountLamports)} SOL
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {battle.questionCount} Qs •{" "}
                                {battle.timePerQuestionSeconds}s
                              </span>
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground"
                                title="Spectators Watching"
                              >
                                <Eye className="size-3 text-primary" />
                                {spectatorCount}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="font-game text-sm font-bold text-foreground">
                              {battle.topicName ?? "All Course Topics"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {battle.courseTitle}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <ProfileAvatar
                              avatarUrl={battle.creatorAvatarUrl}
                              avatarNumber={battle.creatorAvatarNumber}
                              displayName={battle.creatorDisplayName}
                              className="size-7"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {battle.creatorDisplayName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {battle.creatorUniversityShortCode ?? "Student"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <ViewBattleRoomDialog
                              battleId={battle.id}
                              currentUserId={profile.id}
                              initialCourseCode={battle.courseCode}
                              initialCourseTitle={battle.courseTitle}
                              initialTopicName={battle.topicName}
                              initialStatus={battle.status}
                              initialMode={battle.mode}
                              initialStakeLamports={battle.stakeAmountLamports}
                              initialQuestionCount={battle.questionCount}
                              initialTimePerQuestionSeconds={
                                battle.timePerQuestionSeconds
                              }
                              initialSpectatorCount={spectatorCount}
                            />

                            {isWaiting &&
                            battle.creatorUserId === profile.id ? (
                              <DeleteBattleButton battleId={battle.id} />
                            ) : (
                              <Link
                                href={`/arena/battle/${battle.id}?spectate=true`}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 px-2.5 text-xs"
                                  title="Watch as Spectator"
                                >
                                  <Eye className="size-3.5 text-primary" />
                                  {isWaiting ? "Watch" : "Watch Live"}
                                </Button>
                              </Link>
                            )}
                            {isWaiting ? (
                              <Link href={`/arena/battle/${battle.id}`}>
                                <Button size="sm" className="gap-1 px-2.5">
                                  {battle.creatorUserId === profile.id
                                    ? "Enter"
                                    : "Accept"}
                                  <ArrowRight className="size-3.5" />
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Course & Topic Catalog */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-game text-xl font-bold">
                COURSES & BATTLE TOPICS
              </h2>
              <p className="text-sm text-muted-foreground">
                Click any course or topic below to launch a targeted quiz
                battle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {availableCourses.map((course) => {
              const courseTopics = availableTopics.filter(
                (t) => t.courseId === course.id,
              );
              return (
                <Card
                  key={course.id}
                  className="flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="font-game">
                        {course.code}
                      </Badge>
                      <Badge variant="secondary">{course.academicLevel}</Badge>
                    </div>
                    <CardTitle className="mt-2 font-game text-lg">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {course.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <BookOpen className="size-3.5 text-primary" />
                      <span>Topics ({courseTopics.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {courseTopics.map((topic) => (
                        <Link
                          key={topic.id}
                          href={`/arena/new?courseId=${course.id}&topicId=${topic.id}`}
                          className="max-w-full"
                        >
                          <Badge
                            variant="outline"
                            className="max-w-full cursor-pointer whitespace-normal text-left text-[11px] font-normal transition-colors hover:border-primary hover:bg-primary-light hover:text-primary"
                          >
                            {topic.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
                    <Link
                      href={`/arena/new?courseId=${course.id}`}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                      >
                        <Swords className="size-3.5 text-primary" />
                        Battle
                      </Button>
                    </Link>
                    <Link
                      href={`/arena/practice?courseId=${course.id}`}
                      className="w-full"
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                      >
                        <BookOpen className="size-3.5 text-primary" />
                        Practice
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </ArenaAppShell>
  );
}
