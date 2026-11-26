import {
  db,
  departments,
  eq,
  profiles,
  universities,
} from "@repo/db";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./server";

export interface AuthenticatedStudentProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  role: "student" | "admin" | "reviewer";
  universityId: string | null;
  universityName: string | null;
  universityShortCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  academicLevel: string | null;
  xp: number;
  battlesPlayed: number;
  battlesWon: number;
}

export interface AuthSessionContext {
  user: User;
  profile: AuthenticatedStudentProfile | null;
  isOnboarded: boolean;
}

/**
 * Generates a clean default username from an email address and user ID suffix.
 */
export function generateFallbackUsername(email: string, userId: string): string {
  const prefix = (email.split("@")[0] ?? "student")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15);
  const suffix = userId.replace(/-/g, "").slice(0, 5).toLowerCase();
  return `${prefix || "student"}_${suffix}`;
}

/**
 * Loads the student's Drizzle profile joined with university and department metadata.
 */
export async function getStudentProfileById(
  userId: string
): Promise<AuthenticatedStudentProfile | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      universityId: profiles.universityId,
      universityName: universities.name,
      universityShortCode: universities.shortCode,
      departmentId: profiles.departmentId,
      departmentName: departments.name,
      academicLevel: profiles.academicLevel,
      xp: profiles.xp,
      battlesPlayed: profiles.battlesPlayed,
      battlesWon: profiles.battlesWon,
    })
    .from(profiles)
    .leftJoin(universities, eq(profiles.universityId, universities.id))
    .leftJoin(departments, eq(profiles.departmentId, departments.id))
    .where(eq(profiles.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Ensures a baseline `profiles` row exists in PostgreSQL for a verified Supabase Auth user.
 */
export async function ensureBaseProfileForUser(
  user: User,
  preferredDisplayName?: string
): Promise<AuthenticatedStudentProfile> {
  const existing = await getStudentProfileById(user.id);
  if (existing) {
    return existing;
  }

  const email = (user.email ?? `${user.id}@student.netmifi.com`).toLowerCase();
  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : undefined;

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;

  const displayName =
    preferredDisplayName?.trim() ||
    metadataName?.trim() ||
    (email.split("@")[0] ?? "Student");

  const username = generateFallbackUsername(email, user.id);

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email,
      displayName,
      username,
      avatarUrl,
      role: "student",
    })
    .onConflictDoNothing();

  const created = await getStudentProfileById(user.id);
  if (!created) {
    throw new Error("Failed to initialize student profile record.");
  }

  return created;
}

/**
 * Verifies the user's session on the server via `supabase.auth.getUser()`
 * and fetches their Drizzle profile from PostgreSQL.
 * Returns `null` if unauthenticated.
 */
export async function getCurrentAuthContext(): Promise<AuthSessionContext | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const profile = await getStudentProfileById(user.id);
    const isOnboarded = Boolean(
      profile && profile.universityId && profile.departmentId
    );

    return {
      user,
      profile,
      isOnboarded,
    };
  } catch {
    return null;
  }
}

/**
 * Server Component guard: requires an authenticated Supabase user.
 * Redirects to `/login` if not authenticated.
 */
export async function requireAuthUser(): Promise<AuthSessionContext> {
  const context = await getCurrentAuthContext();
  if (!context) {
    redirect("/login");
  }
  return context;
}

/**
 * Server Component guard: requires an authenticated student who has completed academic onboarding.
 * Redirects to `/login` if unauthenticated or `/onboarding` if academic profile is incomplete.
 */
export async function requireOnboardedStudent(): Promise<{
  user: User;
  profile: AuthenticatedStudentProfile;
}> {
  const context = await requireAuthUser();
  if (!context.profile || !context.isOnboarded) {
    redirect("/onboarding");
  }
  return {
    user: context.user,
    profile: context.profile,
  };
}
