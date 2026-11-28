import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

interface RegisterPageProps {
  searchParams: Promise<{
    redirect?: string;
    redirect_to?: string;
    next?: string;
  }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
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

  return <AuthForm mode="register" redirectTarget={redirectTarget} />;
}
