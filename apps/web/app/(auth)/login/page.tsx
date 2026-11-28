import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    redirect?: string;
    redirect_to?: string;
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const redirectTarget =
    resolvedParams.redirect ??
    resolvedParams.redirect_to ??
    resolvedParams.next ??
    null;

  const auth = await getCurrentAuthContext();
  if (auth) {
    if (auth.isOnboarded) {
      redirect(redirectTarget ?? "/arena");
    } else {
      redirect(
        redirectTarget
          ? `/onboarding?redirect=${encodeURIComponent(redirectTarget)}`
          : "/onboarding",
      );
    }
  }

  const initialError = resolvedParams.error ?? null;

  return (
    <AuthForm
      mode="login"
      initialError={initialError}
      redirectTarget={redirectTarget}
    />
  );
}
