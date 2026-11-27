"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface BattleRoomLiveWatcherProps {
  battleId: string;
  initialParticipantCount: number;
  initialBattleStatus: string;
  justJoinedSlotTwo?: boolean;
  inviteCode: string;
}

/**
 * Watches the battle room state so that when Player 2 joins Slot 2,
 * Player 1's screen automatically refreshes and displays a bottom-right toast notification.
 */
export function BattleRoomLiveWatcher({
  battleId,
  initialParticipantCount,
  initialBattleStatus,
  justJoinedSlotTwo = false,
  inviteCode,
}: BattleRoomLiveWatcherProps) {
  const router = useRouter();
  const prevCountRef = useRef(initialParticipantCount);
  const prevStatusRef = useRef(initialBattleStatus);
  const announcedJoinRef = useRef(false);

  useEffect(() => {
    if (justJoinedSlotTwo && !announcedJoinRef.current) {
      announcedJoinRef.current = true;
      toast.success("You joined the battle room!", {
        description: `Connected to room ${inviteCode} as Opponent (Slot 2).`,
      });
    }
  }, [justJoinedSlotTwo, inviteCode]);

  useEffect(() => {
    prevCountRef.current = initialParticipantCount;
    prevStatusRef.current = initialBattleStatus;
  }, [initialParticipantCount, initialBattleStatus]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/battles/${battleId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = (await res.json()) as {
          battle?: { status: string };
          participantCount?: number;
          participants?: { slotIndex: number; displayName: string }[];
        };

        const newCount = data.participantCount ?? prevCountRef.current;
        const newStatus = data.battle?.status ?? prevStatusRef.current;

        if (
          newCount > prevCountRef.current ||
          newStatus !== prevStatusRef.current
        ) {
          if (newCount > prevCountRef.current) {
            const slotTwoPlayer = data.participants?.find(
              (p) => p.slotIndex === 2
            );
            toast.success("Opponent joined the battle room!", {
              description: slotTwoPlayer
                ? `${slotTwoPlayer.displayName} has entered Slot 2.`
                : "Both slots are now filled.",
            });
          }
          prevCountRef.current = newCount;
          prevStatusRef.current = newStatus;
          router.refresh();
        }
      } catch {
        // Ignore transient polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [battleId, router]);

  return null;
}
