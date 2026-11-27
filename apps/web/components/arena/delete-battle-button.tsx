"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";

interface DeleteBattleButtonProps {
  battleId: string;
  size?: "sm" | "default";
  showLabel?: boolean;
}

export function DeleteBattleButton({
  battleId,
  size = "sm",
  showLabel = true,
}: DeleteBattleButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as {
        error?: string;
        deleted?: boolean;
      };

      if (!res.ok || !data.deleted) {
        toast.error("Cannot delete room", {
          description:
            data.error ??
            "Room cannot be deleted once an opponent has joined or battle has started.",
        });
        setIsDeleting(false);
        return;
      }

      toast.success("Battle room deleted and removed.");
      router.refresh();
    } catch {
      toast.error("Failed to delete battle room.");
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={(e) => void handleDelete(e)}
      disabled={isDeleting}
      title="Delete Room"
      className="gap-1 border-destructive/40 px-2.5 text-xs text-destructive hover:bg-destructive/10"
    >
      {isDeleting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      {showLabel ? "Delete" : null}
    </Button>
  );
}
