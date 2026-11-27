"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

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
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/arena/battle/${battleId}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback
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
            Copied Code
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            Copy Code ({inviteCode})
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
