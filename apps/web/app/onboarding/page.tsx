import { OnboardingForm } from "@/components/auth/onboarding-form";
import {
  FALLBACK_COURSES,
  FALLBACK_DEPARTMENTS,
  FALLBACK_UNIVERSITIES,
} from "@/lib/academic-fallback";
import {
  ensureBaseProfileForUser,
  requireAuthUser,
} from "@/lib/supabase/auth";
import {
  asc,
  courses,
  db,
  departments,
  universities,
} from "@repo/db";

export default async function OnboardingPage() {
  const { user, profile: existingProfile } = await requireAuthUser();
  const profile =
    existingProfile ?? (await ensureBaseProfileForUser(user));

  let allUniversities = FALLBACK_UNIVERSITIES;
  let allDepartments = FALLBACK_DEPARTMENTS;
  let allCourses = FALLBACK_COURSES.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    academicLevel: c.academicLevel,
  }));

  try {
    const [dbUnis, dbDepts, dbCourses] = await Promise.all([
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
          universityId: departments.universityId,
          name: departments.name,
          code: departments.code,
        })
        .from(departments)
        .orderBy(asc(departments.name)),
      db
        .select({
          id: courses.id,
          code: courses.code,
          title: courses.title,
          academicLevel: courses.academicLevel,
        })
        .from(courses)
        .orderBy(asc(courses.code)),
    ]);

    if (dbUnis.length > 0 && dbDepts.length > 0) {
      allUniversities = dbUnis;
      allDepartments = dbDepts;
      allCourses = dbCourses;
    }
  } catch {
    // Database not yet migrated on remote host; fallback academic catalog is used automatically.
  }

  return (
    <OnboardingForm
      initialDisplayName={profile.displayName}
      initialUsername={profile.username}
      initialUniversityId={profile.universityId}
      initialDepartmentId={profile.departmentId}
      initialAcademicLevel={profile.academicLevel ?? "200L"}
      universities={allUniversities}
      departments={allDepartments}
      courses={allCourses}
    />
  );
}
