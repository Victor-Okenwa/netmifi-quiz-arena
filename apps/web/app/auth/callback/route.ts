import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ensureBaseProfileForUser } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  const baseOrigin =
    !isLocalEnv && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      `${baseOrigin}/login?error=missing_oauth_code`,
    );
  }

  try {
    const env = getServerEnv();
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.redirect(
        `${baseOrigin}/login?error=oauth_not_configured`,
      );
    }

    const cookieStore = await cookies();
    const pendingCookies: {
      name: string;
      value: string;
      options?: Record<string, unknown>;
    }[] = [];

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[],
          ) {
            for (const cookie of cookiesToSet) {
              pendingCookies.push(cookie);
              try {
                cookieStore.set(cookie.name, cookie.value, cookie.options);
              } catch {
                // Handled via response.cookies below
              }
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        `${baseOrigin}/login?error=${encodeURIComponent(
          error?.message ?? "Google sign-in could not be completed.",
        )}`,
      );
    }

    const profile = await ensureBaseProfileForUser(data.user);
    const isOnboarded = Boolean(profile.universityId && profile.departmentId);

    const destination =
      nextPath && nextPath.startsWith("/")
        ? nextPath
        : isOnboarded
          ? "/arena"
          : "/onboarding";

    const response = NextResponse.redirect(`${baseOrigin}${destination}`);
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication callback failed.";
    return NextResponse.redirect(
      `${baseOrigin}/login?error=${encodeURIComponent(message)}`,
    );
  }
}
