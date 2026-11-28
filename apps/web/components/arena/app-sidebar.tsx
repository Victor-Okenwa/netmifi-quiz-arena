"use client";

import { LogoIcon } from "@/assets/netmifi";
import { ProfileAvatar } from "@/assets/profiles";
import { ProfileMenuPopover } from "@/components/arena/profile-menu-popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import {
  Brain,
  Coins,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type ArenaActiveTab =
  | "lobby"
  | "findMatch"
  | "new"
  | "practice"
  | "leaderboard"
  | "factory"
  | "wallet"
  | "battle";

interface AppSidebarProps {
  profile: AuthenticatedStudentProfile;
  activeTab?: ArenaActiveTab;
}

const PRIMARY_NAV = [
  {
    key: "lobby" as const,
    label: "Arena Lobby",
    href: "/arena",
    icon: Swords,
    badge: null,
  },
  {
    key: "findMatch" as const,
    label: "Find Match",
    href: "/arena/find-match",
    icon: Users,
    badge: "100% Match",
  },
  {
    key: "new" as const,
    label: "New Battle",
    href: "/arena/new",
    icon: PlusCircle,
    badge: null,
  },
  {
    key: "practice" as const,
    label: "Practice Drill",
    href: "/arena/practice",
    icon: Brain,
    badge: null,
  },
];

const SECONDARY_NAV = [
  {
    key: "leaderboard" as const,
    label: "Campus Rankings",
    href: "/leaderboard",
    icon: Trophy,
    badge: null,
  },
  {
    key: "factory" as const,
    label: "Question Factory",
    href: "/arena/factory",
    icon: Sparkles,
    badge: "AI",
  },
];

const SETTINGS_NAV = [
  {
    key: "wallet" as const,
    label: "Solana Devnet Wallet",
    href: "/settings/wallet",
    icon: Coins,
    badge: "Devnet",
  },
];

export function AppSidebar({ profile, activeTab }: AppSidebarProps) {
  const pathname = usePathname();

  function isItemActive(href: string, key: ArenaActiveTab) {
    if (activeTab) return activeTab === key;
    if (href === "/arena") return pathname === "/arena";
    return pathname?.startsWith(href);
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Brand & App Title Header */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="gap-3">
              <Link href="/arena">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LogoIcon className="size-6" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 leading-none">
                  <span className="font-game text-sm font-bold tracking-tight text-sidebar-foreground truncate">
                    NETMIFI <span className="text-primary">ARENA</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                    Academic Quiz Duels
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Group 1: Matchmaking & Battles */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-game uppercase tracking-wider text-muted-foreground">
            Matchmaking & Battles
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.key);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={active ? "font-semibold text-primary" : ""}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 2: Competitive & Syllabus */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-game uppercase tracking-wider text-muted-foreground">
            Rankings & Syllabus
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.key);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={active ? "font-semibold text-primary" : ""}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge className="text-[10px] font-medium bg-muted text-muted-foreground">
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 3: Settings & Wallet */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-game uppercase tracking-wider text-muted-foreground">
            Escrow & Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.key);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={active ? "font-semibold text-primary" : ""}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer with Student Identity */}
      <SidebarFooter className="border-t border-sidebar-border p-2 sm:p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2 text-sidebar-foreground group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
              <ProfileAvatar
                avatarUrl={profile.avatarUrl}
                avatarNumber={profile.avatarNumber}
                displayName={profile.displayName}
                className="size-8 shrink-0 ring-1 ring-primary/40"
              />
              <div className="flex flex-col min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-game text-xs font-bold text-foreground">
                  {profile.displayName}
                </span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  @{profile.username} •{" "}
                  {profile.universityShortCode ?? "Campus"}
                </span>
              </div>
              <Badge
                variant="outline"
                className="font-game text-[10px] shrink-0 text-primary border-primary/30 group-data-[collapsible=icon]:hidden"
              >
                {profile.xp} XP
              </Badge>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

interface ArenaAppShellProps {
  profile: AuthenticatedStudentProfile;
  activeTab?: ArenaActiveTab;
  children: ReactNode;
  pageTitle?: string;
}

const TAB_TITLES: Record<ArenaActiveTab, string> = {
  lobby: "Arena Lobby",
  findMatch: "Find Opponent Match",
  new: "Create Battle Room",
  practice: "Targeted Practice Drill",
  leaderboard: "Campus Leaderboard",
  factory: "Question Factory",
  wallet: "Solana Devnet Wallet",
  battle: "Live Quiz Duel",
};

export function ArenaAppShell({
  profile,
  activeTab = "lobby",
  children,
  pageTitle,
}: ArenaAppShellProps) {
  const displayTitle =
    pageTitle ?? TAB_TITLES[activeTab] ?? "NetMifi Quiz Arena";

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar profile={profile} activeTab={activeTab} />
      <SidebarInset className="flex flex-col min-h-screen bg-background text-foreground">
        {/* Navigation Bar: Clean header with SidebarTrigger and Profile Popover (No Search Bar) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="font-game text-sm font-bold tracking-tight text-foreground sm:text-base">
              {displayTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ProfileMenuPopover profile={profile} />
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 w-full">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
