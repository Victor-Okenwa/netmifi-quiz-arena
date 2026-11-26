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
import {
  getCurrentAuthContext,
  getStudentProfileById,
} from "@/lib/supabase/auth";

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

    const { displayName, username, universityId, departmentId, academicLevel } =
      parsed.data;

    // 1. Verify university exists
    const [uni] = await db
      .select({ id: universities.id })
      .from(universities)
      .where(eq(universities.id, universityId))
      .limit(1);

    if (!uni) {
      return NextResponse.json(
        { error: "Selected university was not found." },
        { status: 400 }
      );
    }

    // 2. Verify department belongs to the selected university
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.universityId, universityId)
        )
      )
      .limit(1);

    if (!dept) {
      return NextResponse.json(
        {
          error:
            "Selected department does not belong to the chosen university.",
        },
        { status: 400 }
      );
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

    const email = (
      authContext.user.email ?? `${authContext.user.id}@student.netmifi.com`
    ).toLowerCase();

    // 4. Upsert student academic profile in PostgreSQL via Drizzle
    await db
      .insert(profiles)
      .values({
        id: authContext.user.id,
        email,
        displayName,
        username,
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
          universityId,
          departmentId,
          academicLevel,
          updatedAt: new Date(),
        },
      });

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
