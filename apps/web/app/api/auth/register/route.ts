import { registerStudentSchema } from "@repo/validators";
import { NextResponse } from "next/server";
import { ensureBaseProfileForUser } from "@/lib/supabase/auth";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registerStudentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Invalid registration details.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { displayName, email, password } = parsed.data;
    const supabase = await createServerSupabaseClient();
    const adminClient = createAdminSupabaseClient();

    // If the service-role client is available, create the user with email pre-confirmed
    // so hackathon students and judges can immediately sign in without email delay.
    if (adminClient) {
      const { data: adminCreated, error: adminError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: displayName,
          },
        });

      if (adminError && !adminError.message.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: adminError.message },
          { status: 400 },
        );
      }

      if (adminError && adminError.message.toLowerCase().includes("already")) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please sign in instead.",
          },
          { status: 409 },
        );
      }

      // Immediately sign in to establish the browser session cookie
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError || !signInData.user) {
        const targetUser = adminCreated.user;
        if (targetUser) {
          await ensureBaseProfileForUser(targetUser, displayName);
        }
        return NextResponse.json(
          {
            error:
              signInError?.message ??
              "Account created, please sign in with your credentials.",
            redirectTo: "/login",
          },
          { status: 200 },
        );
      }

      await ensureBaseProfileForUser(signInData.user, displayName);

      return NextResponse.json({
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
        },
        redirectTo: "/onboarding",
      });
    }

    // Standard Supabase signUp flow when service-role key is not used
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create student account." },
        { status: 400 },
      );
    }

    await ensureBaseProfileForUser(data.user, displayName);

    if (!data.session) {
      return NextResponse.json({
        requiresEmailVerification: true,
        message:
          "Account created! Please check your email inbox to confirm your account, then sign in.",
        redirectTo: "/login",
      });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      redirectTo: "/onboarding",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected registration error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
