import { ProfileAvatar } from "@/assets/profiles";
import { ArenaNavbar } from "@/components/arena/arena-navbar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FALLBACK_UNIVERSITIES } from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import { db, desc, eq, profiles, universities } from "@repo/db";
import { Building2, Medal, Swords, Trophy } from "lucide-react";

interface LeaderboardStudentRow {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarNumber: number;
  academicLevel: string | null;
  xp: number;
  battlesPlayed: number;
  battlesWon: number;
  universityShortCode: string | null;
  universityName: string | null;
}

export default async function LeaderboardPage() {
  const { profile } = await requireOnboardedStudent();

  let rankedStudents: LeaderboardStudentRow[] = [];

  try {
    rankedStudents = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        avatarNumber: profiles.avatarNumber,
        academicLevel: profiles.academicLevel,
        xp: profiles.xp,
        battlesPlayed: profiles.battlesPlayed,
        battlesWon: profiles.battlesWon,
        universityShortCode: universities.shortCode,
        universityName: universities.name,
      })
      .from(profiles)
      .leftJoin(universities, eq(profiles.universityId, universities.id))
      .orderBy(desc(profiles.xp), desc(profiles.battlesWon))
      .limit(50);
  } catch {
    rankedStudents = [
      {
        id: profile.id,
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        avatarNumber: profile.avatarNumber,
        academicLevel: profile.academicLevel,
        xp: profile.xp,
        battlesPlayed: profile.battlesPlayed,
        battlesWon: profile.battlesWon,
        universityShortCode: profile.universityShortCode,
        universityName: profile.universityName,
      },
    ];
  }

  // Aggregate XP & Victories by University
  const universityTotalsMap = new Map<
    string,
    {
      shortCode: string;
      name: string;
      totalXp: number;
      totalWins: number;
      studentCount: number;
    }
  >();

  for (const uni of FALLBACK_UNIVERSITIES) {
    universityTotalsMap.set(uni.shortCode, {
      shortCode: uni.shortCode,
      name: uni.name,
      totalXp: 0,
      totalWins: 0,
      studentCount: 0,
    });
  }

  for (const student of rankedStudents) {
    const code = student.universityShortCode;
    if (!code) continue;
    const existing = universityTotalsMap.get(code) ?? {
      shortCode: code,
      name: student.universityName ?? code,
      totalXp: 0,
      totalWins: 0,
      studentCount: 0,
    };
    existing.totalXp += student.xp;
    existing.totalWins += student.battlesWon;
    existing.studentCount += 1;
    universityTotalsMap.set(code, existing);
  }

  const universityStandings = Array.from(universityTotalsMap.values()).sort(
    (a, b) => b.totalXp - a.totalXp || b.studentCount - a.studentCount
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} activeTab="leaderboard" />

      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="font-game text-3xl font-extrabold tracking-tight">
            ARENA <span className="text-primary">LEADERBOARD</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Student rankings and inter-university standings across course quiz
            battles.
          </p>
        </div>

        {/* Inter-University Standings */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="font-game text-lg font-bold">
              UNIVERSITY STANDINGS
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universityStandings.map((uni, idx) => (
              <Card key={uni.shortCode} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={idx === 0 ? "default" : "secondary"}
                      className="font-game"
                    >
                      #{idx + 1} • {uni.shortCode}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {uni.studentCount}{" "}
                      {uni.studentCount === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                  <CardTitle className="mt-1 truncate text-sm font-semibold">
                    {uni.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total XP: </span>
                    <span className="font-game font-bold text-primary">
                      {uni.totalXp}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Victories: </span>
                    <span className="font-game font-bold text-foreground">
                      {uni.totalWins}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Top Students Ranking */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <CardTitle className="font-game text-xl font-bold">
                TOP STUDENT RANKINGS
              </CardTitle>
            </div>
            <CardDescription>
              Ranked by total XP earned and battle victories.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {rankedStudents.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No student rankings recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rankedStudents.map((student, index) => {
                  const isCurrentUser = student.id === profile.id;
                  const winRate =
                    student.battlesPlayed > 0
                      ? Math.round(
                          (student.battlesWon / student.battlesPlayed) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={student.id}
                      className={`flex flex-wrap items-center justify-between gap-4 py-3.5 px-2 transition-colors ${
                        isCurrentUser ? "rounded-lg bg-primary-light/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex w-8 shrink-0 items-center justify-center font-game text-sm font-bold">
                          {index === 0 ? (
                            <Medal className="size-5 text-primary" />
                          ) : (
                            `#${index + 1}`
                          )}
                        </div>

                        <ProfileAvatar
                          avatarUrl={student.avatarUrl}
                          avatarNumber={student.avatarNumber}
                          displayName={student.displayName}
                          className="size-10"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {student.displayName}
                            </p>
                            {isCurrentUser ? (
                              <Badge variant="default" className="text-[10px]">
                                You
                              </Badge>
                            ) : null}
                            {student.universityShortCode ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {student.universityShortCode}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{student.username} •{" "}
                            {student.academicLevel ?? "200L"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div className="hidden sm:block">
                          <p className="font-game text-xs font-bold text-foreground">
                            {student.battlesWon}W / {student.battlesPlayed}M
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {winRate}% Win Rate
                          </p>
                        </div>

                        <div className="min-w-[72px]">
                          <p className="font-game text-base font-bold text-primary">
                            {student.xp} XP
                          </p>
                          <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                            <Swords className="size-3" />
                            Arena Score
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
