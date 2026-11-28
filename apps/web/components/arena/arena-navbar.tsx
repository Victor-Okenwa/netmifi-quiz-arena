"use client";

import { LogoIcon } from "@/assets/netmifi";
import { ProfileMenuPopover } from "@/components/arena/profile-menu-popover";
import { Button } from "@/components/ui/button";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import {
  Brain,
  Menu,
  PlusCircle,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export { AppSidebar, ArenaAppShell } from "./app-sidebar";
export type { ArenaActiveTab } from "./app-sidebar";

interface ArenaNavbarProps {
  profile: AuthenticatedStudentProfile;
  activeTab?:
    "lobby" | "findMatch" | "new" | "practice" | "leaderboard" | "factory";
}

const NAV_ITEMS = [
  {
    key: "lobby" as const,
    label: "Arena Lobby",
    href: "/arena",
    icon: Swords,
  },
  {
    key: "findMatch" as const,
    label: "Find Match",
    href: "/arena/find-match",
    icon: Users,
  },
  {
    key: "new" as const,
    label: "New Battle",
    href: "/arena/new",
    icon: PlusCircle,
  },
  {
    key: "practice" as const,
    label: "Practice Drill",
    href: "/arena/practice",
    icon: Brain,
  },
  {
    key: "leaderboard" as const,
    label: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    key: "factory" as const,
    label: "Question Factory",
    href: "/arena/factory",
    icon: Sparkles,
  },
];

export function ArenaNavbar({ profile, activeTab }: ArenaNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link
              href="/arena"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-w-0 items-center gap-2.5 sm:gap-3"
            >
              <LogoIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
              <span className="truncate font-game text-sm font-bold tracking-tight sm:text-xl">
                NETMIFI <span className="text-primary">QUIZ ARENA</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <Link key={item.key} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Icon className="size-4 text-primary" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ProfileMenuPopover profile={profile} />

            {/* Mobile Hamburger Menu Button (Three Lines Icon) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="size-9 md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="size-5 text-foreground" />
              ) : (
                <Menu className="size-5 text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Mobile Dropdown Menu */}
        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-border/60 bg-background/98 px-4 pt-2 pb-4 shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2.5 px-3 py-2.5 text-sm font-medium"
                    >
                      <Icon className="size-4 shrink-0 text-primary" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>

      {/* Structural layout spacer matching fixed 64px navbar height */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
