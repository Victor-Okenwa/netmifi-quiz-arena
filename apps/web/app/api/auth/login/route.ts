import { loginStudentSchema } from "@repo/validators";
import { NextResponse } from "next/server";
import { ensureBaseProfileForUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = loginStudentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid login credentials.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Invalid email or password." },
        { status: 401 },
      );
    }

    const profile = await ensureBaseProfileForUser(data.user);
    const isOnboarded = Boolean(profile.universityId && profile.departmentId);

    const rawRedirect =
      typeof (body as Record<string, unknown>)?.redirect === "string"
        ? ((body as Record<string, unknown>).redirect as string).trim()
        : null;
    const safeRedirect =
      rawRedirect &&
      rawRedirect.startsWith("/") &&
      !rawRedirect.startsWith("//")
        ? rawRedirect
        : null;

    let targetUrl: string;
    if (isOnboarded) {
      targetUrl = safeRedirect ?? "/arena";
    } else {
      targetUrl = safeRedirect
        ? `/onboarding?redirect=${encodeURIComponent(safeRedirect)}`
        : "/onboarding";
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      isOnboarded,
      redirectTo: targetUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected sign-in error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
