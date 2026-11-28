import { ArenaAppShell } from "@/components/arena/app-sidebar";
import {
  StudentMatchFinder,
  type MatchedStudentItem,
} from "@/components/arena/student-match-finder";
import {
  FALLBACK_DEPARTMENTS,
  FALLBACK_STUDENT_PEERS,
  FALLBACK_UNIVERSITIES,
} from "@/lib/academic-fallback";
import { requireOnboardedStudent } from "@/lib/supabase/auth";
import {
  asc,
  db,
  departments,
  desc,
  eq,
  profiles,
  universities,
} from "@repo/db";

export default async function FindMatchPage() {
  const { profile } = await requireOnboardedStudent("/arena/find-match");

  let allStudents: MatchedStudentItem[] = FALLBACK_STUDENT_PEERS;
  let allUniversities = FALLBACK_UNIVERSITIES;
  let allDepartments = FALLBACK_DEPARTMENTS;

  try {
    const [dbUnis, dbDepts, dbProfiles] = await Promise.all([
      db
        .select({
          id: universities.id,
          name: universities.name,
          shortCode: universities.shortCode,
        })
        .from(universities)
        .orderBy(asc(universities.shortCode)),
      db
        .select({
          id: departments.id,
          name: departments.name,
          code: departments.code,
          universityId: departments.universityId,
        })
        .from(departments)
        .orderBy(asc(departments.name)),
      db
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
          universityId: profiles.universityId,
          universityName: universities.name,
          universityShortCode: universities.shortCode,
          departmentId: profiles.departmentId,
          departmentName: departments.name,
          departmentCode: departments.code,
        })
        .from(profiles)
        .leftJoin(universities, eq(profiles.universityId, universities.id))
        .leftJoin(departments, eq(profiles.departmentId, departments.id))
        .orderBy(desc(profiles.xp))
        .limit(100),
    ]);

    if (dbUnis.length > 0) {
      allUniversities = dbUnis;
    }
    if (dbDepts.length > 0) {
      allDepartments = dbDepts;
    }

    if (dbProfiles.length > 0) {
      // Merge DB profiles with fallback student peers (deduplicated by username)
      // to ensure students across Accountancy, Computer Science, and Statistics always exist.
      const seenUsernames = new Set<string>();
      const mergedList: MatchedStudentItem[] = [];

      for (const p of dbProfiles) {
        if (!seenUsernames.has(p.username)) {
          seenUsernames.add(p.username);
          mergedList.push(p);
        }
      }

      for (const peer of FALLBACK_STUDENT_PEERS) {
        if (!seenUsernames.has(peer.username)) {
          seenUsernames.add(peer.username);
          mergedList.push(peer);
        }
      }

      allStudents = mergedList;
    }
  } catch {
    // Database unreachable; fallback catalog is used automatically
  }

  return (
    <ArenaAppShell profile={profile} activeTab="findMatch">
      <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <StudentMatchFinder
          currentUser={profile}
          initialStudents={allStudents}
          universities={allUniversities}
          departments={allDepartments}
        />
      </main>
    </ArenaAppShell>
  );
}
