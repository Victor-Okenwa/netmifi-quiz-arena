"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

export function QuickJoinCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = inviteCode.trim();
    if (!cleaned) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/battles/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: cleaned }),
      });

      const data = (await response.json()) as {
        error?: string;
        inviteCode?: string;
        alreadyParticipant?: boolean;
        redirectTo?: string;
      };

      if (!response.ok) {
        const msg =
          data.error ?? "No active battle room found with that invite code.";
        setErrorMessage(msg);
        toast.error("Could not join battle", {
          description: msg,
        });
        setIsLoading(false);
        return;
      }

      toast.success(
        data.alreadyParticipant
          ? "Re-entering battle room"
          : "Joined battle room!",
        {
          description: data.inviteCode
            ? `Room code: ${data.inviteCode}`
            : undefined,
        }
      );

      router.push(data.redirectTo ?? "/arena");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to look up invite code.";
      setErrorMessage(msg);
      toast.error("Connection error", { description: msg });
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-light text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <CardTitle className="font-game text-base font-bold">
              JOIN WITH INVITE CODE
            </CardTitle>
            <CardDescription className="text-xs">
              Paste an 8-character invite code or a shared battle room link.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoinByCode} className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. HRR824K3 or room link"
              className="font-mono text-xs"
              required
              minLength={4}
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || inviteCode.trim().length < 4}
              className="shrink-0 gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Join
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
