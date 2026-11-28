import { ArenaNavbar } from "@/components/arena/arena-navbar";
import {
  QuestionFactoryStudio,
  type StudioCourse,
  type StudioTopic,
} from "@/components/admin/question-factory-studio";
import { FALLBACK_COURSES, FALLBACK_TOPICS } from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import { asc, courses, db, topics } from "@repo/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function QuestionFactoryPage() {
  const { profile } = await requireOnboardedStudent();

  let allCourses: StudioCourse[] = FALLBACK_COURSES.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
  }));

  let allTopics: StudioTopic[] = FALLBACK_TOPICS.map((t) => ({
    id: t.id,
    courseId: t.courseId,
    name: t.name,
  }));

  try {
    const [dbCourses, dbTopics] = await Promise.all([
      db
        .select({
          id: courses.id,
          code: courses.code,
          title: courses.title,
        })
        .from(courses)
        .orderBy(asc(courses.code)),
      db
        .select({
          id: topics.id,
          courseId: topics.courseId,
          name: topics.name,
        })
        .from(topics)
        .orderBy(asc(topics.orderIndex)),
    ]);

    if (dbCourses.length > 0) {
      allCourses = dbCourses;
      allTopics = dbTopics;
    }
  } catch {
    // Fallback catalog used if db query fails
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} activeTab="factory" />

      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <div>
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Arena Lobby
          </Link>
        </div>

        <QuestionFactoryStudio
          courses={allCourses}
          topics={allTopics}
          currentUserId={profile.id}
        />
      </main>
    </div>
  );
}
