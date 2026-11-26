import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentAuthContext } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const auth = await getCurrentAuthContext();
  if (auth) {
    redirect(auth.isOnboarded ? "/arena" : "/onboarding");
  }

  return <AuthForm mode="register" />;
}
