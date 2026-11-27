import { ArenaNavbar } from "@/components/arena/arena-navbar";
import {
  BattleConfigurator,
  type ConfiguratorCourse,
  type ConfiguratorTopic,
} from "@/components/arena/battle-configurator";
import {
  FALLBACK_COURSES,
  FALLBACK_TOPICS,
} from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import { asc, courses, db, topics } from "@repo/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NewBattlePageProps {
  searchParams: Promise<{
    courseId?: string;
    topicId?: string;
  }>;
}

export default async function NewBattlePage({
  searchParams,
}: NewBattlePageProps) {
  const { profile } = await requireOnboardedStudent();
  const resolvedParams = await searchParams;

  let allCourses: ConfiguratorCourse[] = FALLBACK_COURSES;
  let allTopics: ConfiguratorTopic[] = FALLBACK_TOPICS.map((t) => ({
    ...t,
    description: "Core curriculum topic questions and speed assessment.",
  }));

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
          description: topics.description,
        })
        .from(topics)
        .orderBy(asc(topics.orderIndex)),
    ]);

    if (dbCourses.length > 0) {
      allCourses = dbCourses;
      allTopics = dbTopics;
    }
  } catch {
    // Fallback catalog used when remote DATABASE_URL is not yet configured
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground">
      <ArenaNavbar profile={profile} activeTab="new" />

      <main className="mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Arena Lobby
          </Link>
        </div>

        <BattleConfigurator
          courses={allCourses}
          topics={allTopics}
          initialCourseId={resolvedParams.courseId}
          initialTopicId={resolvedParams.topicId}
        />
      </main>
    </div>
  );
}
