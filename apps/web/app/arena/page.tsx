import { LogoIcon } from "@/assets/netmifi";
import { ProfileAvatar } from "@/assets/profiles";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FALLBACK_COURSES,
  FALLBACK_TOPICS,
} from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import { asc, courses, db, topics } from "@repo/db";
import { BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function ArenaPage() {
  const { profile } = await requireOnboardedStudent();

  let availableCourses = FALLBACK_COURSES;
  let availableTopics = FALLBACK_TOPICS;

  try {
    const [dbCourses, dbTopics] = await Promise.all([
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
    ]);

    if (dbCourses.length > 0) {
      availableCourses = dbCourses;
      availableTopics = dbTopics;
    }
  } catch {
    // Fallback catalog used when remote DATABASE_URL is not yet configured
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8" />
            <span className="font-game text-xl font-bold tracking-tight">
              NETMIFI <span className="text-primary">QUIZ ARENA</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex">
              <GraduationCap className="size-3.5 text-primary" />
              {profile.universityShortCode ?? "UNI"} • {profile.academicLevel}
            </Badge>
            <Link href="/onboarding">
              <Button variant="ghost" size="sm">
                Edit Profile
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Student Identity Banner */}
        <Card className="border-primary/30 bg-card shadow-sm">
          <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                avatarNumber={profile.avatarNumber}
                displayName={profile.displayName}
                className="size-16 ring-2 ring-primary/30"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    @{profile.username}
                  </span>
                </div>
                <CardTitle className="font-game text-2xl font-bold">
                  Welcome back, {profile.displayName}
                </CardTitle>
                <CardDescription>
                  {profile.universityName} • {profile.departmentName} (
                  {profile.academicLevel})
                </CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-muted/40 px-5 py-3 text-center">
              <div>
                <p className="font-game text-lg font-bold text-primary">
                  {profile.xp}
                </p>
                <p className="text-[11px] text-muted-foreground">Total XP</p>
              </div>
              <div>
                <p className="font-game text-lg font-bold text-foreground">
                  {profile.battlesPlayed}
                </p>
                <p className="text-[11px] text-muted-foreground">Battles</p>
              </div>
              <div>
                <p className="font-game text-lg font-bold text-foreground">
                  {profile.battlesWon}
                </p>
                <p className="text-[11px] text-muted-foreground">Victories</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Course & Topic Catalog */}
        <section className="space-y-4">
          <div>
            <h2 className="font-game text-xl font-bold">
              COURSES & BATTLE TOPICS
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a course topic to challenge a course-mate or practice weak
              areas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {availableCourses.map((course) => {
              const courseTopics = availableTopics.filter(
                (t) => t.courseId === course.id
              );
              return (
                <Card key={course.id} className="flex flex-col justify-between">
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
                        <Badge
                          key={topic.id}
                          variant="outline"
                          className="text-[11px] font-normal"
                        >
                          {topic.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
