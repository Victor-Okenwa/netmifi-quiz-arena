"use client";

import { LogoIcon } from "@/assets/netmifi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { displayName, email, password }
          : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        requiresEmailVerification?: boolean;
        redirectTo?: string;
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Authentication failed. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.requiresEmailVerification) {
        setInfoMessage(
          data.message ??
            "Account created! Check your email inbox to confirm your address."
        );
        setIsLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/onboarding");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      setIsLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    setErrorMessage(null);
    setIsOAuthLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsOAuthLoading(false);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Google OAuth is not available right now."
      );
      setIsOAuthLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-90"
      >
        <LogoIcon className="h-9 w-9" />
        <span className="font-game text-xl font-bold tracking-tight text-foreground">
          NETMIFI <span className="text-primary">QUIZ ARENA</span>
        </span>
      </Link>

      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex items-center justify-center">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
              <GraduationCap className="size-3.5 text-primary" />
              No Crypto Wallet Required for Academic Battles
            </Badge>
          </div>
          <CardTitle className="font-game text-2xl font-bold">
            {mode === "register"
              ? "CREATE STUDENT ACCOUNT"
              : "ENTER THE ARENA"}
          </CardTitle>
          <CardDescription>
            {mode === "register"
              ? "Join fellow university students to battle, diagnose weak topics, and master your courses."
              : "Sign in to your Netmifi academic profile to continue your quiz battles."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {errorMessage ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {infoMessage ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-primary/40 bg-primary-light p-3 text-xs text-primary">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Full Name / Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Chidi Okafor"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  disabled={isLoading}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">University or Personal Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="chidi@student.unilag.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {mode === "register"
                    ? "Creating Student Account..."
                    : "Signing In..."}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {mode === "register"
                    ? "Create Account & Choose University"
                    : "Sign In to Arena"}
                </>
              )}
            </Button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border" />
            <span className="bg-card px-3 text-xs text-muted-foreground">
              OR
            </span>
            <div className="w-full border-t border-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleOAuth}
            disabled={isLoading || isOAuthLoading}
          >
            {isOAuthLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Continue with Google
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          {mode === "register" ? (
            <p>
              Already have a Netmifi student account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Sign In
              </Link>
            </p>
          ) : (
            <p>
              New to Netmifi Quiz Arena?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Create a Student Account
              </Link>
            </p>
          )}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>
              Secured by Supabase Auth • Solana wallet linking is 100% optional
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
