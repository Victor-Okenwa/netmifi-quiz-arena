import {
  FALLBACK_DEPARTMENTS,
  FALLBACK_UNIVERSITIES,
} from "@/lib/academic-fallback";
import {
  getCurrentAuthContext,
  getStudentProfileById,
} from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  and,
  db,
  departments,
  eq,
  ne,
  profiles,
  universities,
} from "@repo/db";
import { academicOnboardingSchema } from "@repo/validators";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authContext = await getCurrentAuthContext();
    if (!authContext) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to complete onboarding." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = academicOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid onboarding input.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      displayName,
      username,
      universityId,
      departmentId,
      academicLevel,
      avatarNumber,
    } = parsed.data;

    let selectedUni = FALLBACK_UNIVERSITIES.find((u) => u.id === universityId);
    let selectedDept = FALLBACK_DEPARTMENTS.find(
      (d) => d.id === departmentId && d.universityId === universityId
    );

    const email = (
      authContext.user.email ?? `${authContext.user.id}@student.netmifi.com`
    ).toLowerCase();

    try {
      // 1. Verify university exists in PostgreSQL
      const [uni] = await db
        .select({
          id: universities.id,
          name: universities.name,
          shortCode: universities.shortCode,
        })
        .from(universities)
        .where(eq(universities.id, universityId))
        .limit(1);

      if (uni) {
        selectedUni = uni;
      }

      // 2. Verify department belongs to the selected university
      const [dept] = await db
        .select({
          id: departments.id,
          universityId: departments.universityId,
          name: departments.name,
          code: departments.code,
        })
        .from(departments)
        .where(
          and(
            eq(departments.id, departmentId),
            eq(departments.universityId, universityId)
          )
        )
        .limit(1);

      if (dept) {
        selectedDept = dept;
      }

      // 3. Check username uniqueness against other profiles
      const [conflictingUsername] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(
            eq(profiles.username, username),
            ne(profiles.id, authContext.user.id)
          )
        )
        .limit(1);

      if (conflictingUsername) {
        return NextResponse.json(
          {
            error: `Username "@${username}" is already taken. Please choose another handle.`,
          },
          { status: 409 }
        );
      }

      if (uni && dept) {
        // 4. Upsert student academic profile in PostgreSQL via Drizzle
        await db
          .insert(profiles)
          .values({
            id: authContext.user.id,
            email,
            displayName,
            username,
            avatarNumber,
            role: "student",
            universityId,
            departmentId,
            academicLevel,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              displayName,
              username,
              avatarNumber,
              universityId,
              departmentId,
              academicLevel,
              updatedAt: new Date(),
            },
          });
      }
    } catch {
      // PostgreSQL unavailable on remote preview; persist to Supabase Auth user_metadata below
    }

    if (!selectedUni || !selectedDept) {
      return NextResponse.json(
        { error: "Please select a valid university and department." },
        { status: 400 }
      );
    }

    // Sync academic profile & chosen avatarNumber into Supabase Auth user_metadata
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          username,
          avatar_number: avatarNumber,
          university_id: selectedUni.id,
          university_name: selectedUni.name,
          university_short_code: selectedUni.shortCode,
          department_id: selectedDept.id,
          department_name: selectedDept.name,
          academic_level: academicLevel,
        },
      });
    } catch {
      // Non-fatal metadata update
    }

    const updatedProfile = await getStudentProfileById(authContext.user.id);

    return NextResponse.json({
      profile: updatedProfile,
      redirectTo: "/arena",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to save academic onboarding profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
