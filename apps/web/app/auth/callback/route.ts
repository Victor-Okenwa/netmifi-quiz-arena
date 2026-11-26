import { NextResponse } from "next/server";
import { ensureBaseProfileForUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const profile = await ensureBaseProfileForUser(data.user);
      const isOnboarded = Boolean(profile.universityId && profile.departmentId);
      return NextResponse.redirect(
        `${origin}${isOnboarded ? "/arena" : "/onboarding"}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
