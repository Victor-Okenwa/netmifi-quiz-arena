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
import { AlertCircle, ArrowRight, Eye, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

export function QuickJoinCard() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpectateLoading, setIsSpectateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitLookup(asSpectator: boolean) {
    const cleaned = inviteCode.trim();
    if (!cleaned) return;

    setErrorMessage(null);
    if (asSpectator) {
      setIsSpectateLoading(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/battles/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: cleaned, asSpectator }),
      });

      const data = (await response.json()) as {
        error?: string;
        inviteCode?: string;
        alreadyParticipant?: boolean;
        isSpectator?: boolean;
        redirectTo?: string;
      };

      if (!response.ok) {
        const msg =
          data.error ?? "No active battle room found with that invite code.";
        setErrorMessage(msg);
        toast.error("Could not find battle room", {
          description: msg,
        });
        return;
      }

      if (data.isSpectator) {
        toast.info("Entering as Spectator", {
          description: data.inviteCode
            ? `Watching room ${data.inviteCode} live.`
            : undefined,
        });
      } else {
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
      }

      router.push(data.redirectTo ?? "/arena");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to look up invite code.";
      setErrorMessage(msg);
      toast.error("Connection error", { description: msg });
    } finally {
      setIsLoading(false);
      setIsSpectateLoading(false);
    }
  }

  function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLookup(false);
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
              JOIN OR SPECTATE ROOM
            </CardTitle>
            <CardDescription className="text-xs">
              Paste an 8-character invite code or a shared battle room link.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleJoinByCode} className="flex flex-col gap-2.5">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="e.g. HRR824K3 or room link"
            className="font-mono text-xs"
            required
            minLength={4}
            disabled={isLoading || isSpectateLoading}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="submit"
              disabled={
                isLoading || isSpectateLoading || inviteCode.trim().length < 4
              }
              className="gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Join Match
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                isLoading || isSpectateLoading || inviteCode.trim().length < 4
              }
              onClick={() => void submitLookup(true)}
              className="gap-1.5"
            >
              {isSpectateLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Eye className="size-4 text-primary" />
                  Spectate
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
