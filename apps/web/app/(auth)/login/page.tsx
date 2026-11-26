import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const auth = await getCurrentAuthContext();
  if (auth) {
    redirect(auth.isOnboarded ? "/arena" : "/onboarding");
  }

  const resolvedParams = await searchParams;
  const initialError = resolvedParams.error ?? null;

  return <AuthForm mode="login" initialError={initialError} />;
}
