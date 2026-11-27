"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyInviteButtonProps {
  inviteCode: string;
  battleId: string;
}

export function CopyInviteButton({
  inviteCode,
  battleId,
}: CopyInviteButtonProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      toast.success("Invite code copied!", {
        description: `Share code ${inviteCode} with your opponent.`,
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Could not copy invite code");
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/arena/battle/${battleId}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Battle room link copied!", {
        description: "Send this link to a classmate to join directly.",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Could not copy room link");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopyCode}
        className="gap-1.5 font-mono text-xs"
      >
        {copiedCode ? (
          <>
            <Check className="size-3.5 text-primary" />
            Copied ({inviteCode})
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            Copy Code: {inviteCode}
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleCopyLink}
        className="gap-1.5 text-xs"
      >
        {copiedLink ? (
          <>
            <Check className="size-3.5 text-primary" />
            Invite Link Copied
          </>
        ) : (
          <>
            <Link2 className="size-3.5" />
            Share Room Link
          </>
        )}
      </Button>
    </div>
  );
}
