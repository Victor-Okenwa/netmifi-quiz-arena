import { LogoIcon } from "@/assets/netmifi";
import { ProfileMenuPopover } from "@/components/arena/profile-menu-popover";
import { Button } from "@/components/ui/button";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import { PlusCircle, Swords, Trophy } from "lucide-react";
import Link from "next/link";

interface ArenaNavbarProps {
  profile: AuthenticatedStudentProfile;
  activeTab?: "lobby" | "new" | "leaderboard";
}

export function ArenaNavbar({ profile, activeTab }: ArenaNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/arena" className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8" />
            <span className="font-game text-lg font-bold tracking-tight sm:text-xl">
              NETMIFI <span className="text-primary">QUIZ ARENA</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/arena">
              <Button
                variant={activeTab === "lobby" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <Swords className="size-4 text-primary" />
                Arena Lobby
              </Button>
            </Link>
            <Link href="/arena/new">
              <Button
                variant={activeTab === "new" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <PlusCircle className="size-4 text-primary" />
                New Battle
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button
                variant={activeTab === "leaderboard" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <Trophy className="size-4 text-primary" />
                Leaderboard
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ProfileMenuPopover profile={profile} />
        </div>
      </div>
    </header>
  );
}
