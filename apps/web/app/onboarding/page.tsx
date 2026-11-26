import { OnboardingForm } from "@/components/auth/onboarding-form";
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

  const [allUniversities, allDepartments, allCourses] = await Promise.all([
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
