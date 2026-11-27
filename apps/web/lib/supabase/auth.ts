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
  avatarNumber: number;
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

export function clampAvatarNumber(num: unknown): number {
  if (typeof num === "number" && num >= 1 && num <= 5) {
    return Math.floor(num);
  }
  return 1;
}

/**
 * Builds a profile object from Supabase Auth `user.user_metadata` when PostgreSQL is not yet connected
 * on a remote deployment.
 */
export function buildProfileFromUserMetadata(
  user: User,
  preferredDisplayName?: string
): AuthenticatedStudentProfile {
  const email = (user.email ?? `${user.id}@student.netmifi.com`).toLowerCase();
  const meta = user.user_metadata ?? {};

  const metadataName =
    typeof meta.display_name === "string"
      ? meta.display_name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.name === "string"
          ? meta.name
          : undefined;

  const displayName =
    preferredDisplayName?.trim() ||
    metadataName?.trim() ||
    (email.split("@")[0] ?? "Student");

  const username =
    typeof meta.username === "string" && meta.username.trim().length >= 3
      ? meta.username.trim()
      : generateFallbackUsername(email, user.id);

  // If the student explicitly chose a numbered character avatar, use the character avatar fallback (avatarUrl = null)
  const usePresetAvatar = meta.use_preset_avatar === true;

  const avatarUrl = usePresetAvatar
    ? null
    : typeof meta.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta.picture === "string"
        ? meta.picture
        : null;

  const avatarNumber = clampAvatarNumber(meta.avatar_number);

  return {
    id: user.id,
    email,
    displayName,
    username,
    avatarUrl,
    avatarNumber,
    role: "student",
    universityId:
      typeof meta.university_id === "string" ? meta.university_id : null,
    universityName:
      typeof meta.university_name === "string" ? meta.university_name : null,
    universityShortCode:
      typeof meta.university_short_code === "string"
        ? meta.university_short_code
        : null,
    departmentId:
      typeof meta.department_id === "string" ? meta.department_id : null,
    departmentName:
      typeof meta.department_name === "string" ? meta.department_name : null,
    academicLevel:
      typeof meta.academic_level === "string" ? meta.academic_level : "200L",
    xp: typeof meta.xp === "number" ? meta.xp : 0,
    battlesPlayed:
      typeof meta.battles_played === "number" ? meta.battles_played : 0,
    battlesWon: typeof meta.battles_won === "number" ? meta.battles_won : 0,
  };
}

/**
 * Loads the student's Drizzle profile joined with university and department metadata.
 * Returns `null` if not found or if the database connection is unavailable.
 */
export async function getStudentProfileById(
  userId: string
): Promise<AuthenticatedStudentProfile | null> {
  try {
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        avatarNumber: profiles.avatarNumber,
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
  } catch {
    return null;
  }
}

/**
 * Ensures a baseline `profiles` row exists in PostgreSQL for a verified Supabase Auth user,
 * gracefully falling back to Supabase user metadata if the database is unreachable.
 */
export async function ensureBaseProfileForUser(
  user: User,
  preferredDisplayName?: string
): Promise<AuthenticatedStudentProfile> {
  const fallbackProfile = buildProfileFromUserMetadata(
    user,
    preferredDisplayName
  );

  try {
    const existing = await getStudentProfileById(user.id);
    if (existing) {
      return existing;
    }

    await db
      .insert(profiles)
      .values({
        id: user.id,
        email: fallbackProfile.email,
        displayName: fallbackProfile.displayName,
        username: fallbackProfile.username,
        avatarUrl: fallbackProfile.avatarUrl,
        avatarNumber: fallbackProfile.avatarNumber,
        role: "student",
      })
      .onConflictDoNothing();

    const created = await getStudentProfileById(user.id);
    return created ?? fallbackProfile;
  } catch {
    return fallbackProfile;
  }
}

/**
 * Verifies the user's session on the server via `supabase.auth.getUser()`
 * and fetches their Drizzle profile (or metadata fallback).
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

    const dbProfile = await getStudentProfileById(user.id);
    const profile = dbProfile ?? buildProfileFromUserMetadata(user);
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
