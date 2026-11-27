"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import { ChevronDown, GraduationCap, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ProfileMenuPopoverProps {
  profile: AuthenticatedStudentProfile;
}

export function ProfileMenuPopover({ profile }: ProfileMenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-2.5 pl-1 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ProfileAvatar
          avatarUrl={profile.avatarUrl}
          avatarNumber={profile.avatarNumber}
          displayName={profile.displayName}
          className="size-7"
        />
        <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
          {profile.displayName}
        </span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Profile menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              avatarNumber={profile.avatarNumber}
              displayName={profile.displayName}
              className="size-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-game text-xs font-bold text-foreground">
                {profile.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          </div>

          {/* Academic badge info */}
          <div className="flex items-center justify-between border-b border-border py-2.5">
            <Badge variant="secondary" className="gap-1.5 text-[11px]">
              <GraduationCap className="size-3.5 text-primary" />
              {profile.universityShortCode ?? "UNI"} •{" "}
              {profile.academicLevel ?? "200L"}
            </Badge>
            <span className="font-game text-xs font-bold text-primary">
              {profile.xp} XP
            </span>
          </div>

          {/* Menu actions */}
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Link
              href="/onboarding"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <UserCog className="size-4 text-primary" />
              Profile
            </Link>

            <SignOutButton className="w-full justify-start" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
