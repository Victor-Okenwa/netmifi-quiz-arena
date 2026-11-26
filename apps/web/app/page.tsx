import { LogoIcon, MascotIcon } from "@/assets/netmifi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  ChevronRight,
  Flame,
  Gamepad2,
  Medal,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8" />
            <span className="font-game text-xl font-bold tracking-tight text-foreground">
              NETMIFI <span className="text-primary">QUIZ ARENA</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a
              href="#modes"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Game Modes
            </a>
            <a
              href="#leaderboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Leaderboard
            </a>
            <a
              href="#rewards"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Tournaments
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </a>
            <a href="/register">
              <Button size="sm">
                <Gamepad2 className="size-4" />
                Play Now
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="flex flex-col items-center text-center lg:col-span-7 lg:items-start lg:text-left">
              <Badge
                variant="secondary"
                className="mb-6 gap-2 px-3 py-1 text-xs font-semibold"
              >
                <Sparkles className="size-3.5 text-primary" />
                NetMifi Design System • Powered by Lexend & Orbitron
              </Badge>

              <h1 className="font-game text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                TEST YOUR WIT. <br />
                <span className="text-primary">CONQUER THE ARENA.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground font-sans">
                Real-time competitive academic quizzes, speed duels, and campus tournaments.
                Challenge peers across tertiary institutions, master syllabus concepts, and climb
                the seasonal ranks.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/arena">
                  <Button size="lg" className="gap-2 text-base">
                    <Swords className="size-5" />
                    Enter Instant Match
                  </Button>
                </a>
                <a href="/register">
                  <Button size="lg" variant="outline" className="gap-2 text-base">
                    Create Student Account
                    <ChevronRight className="size-4" />
                  </Button>
                </a>
              </div>

              {/* Quick stats banner */}
              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8 text-left w-full max-w-lg">
                <div>
                  <p className="font-game text-2xl font-bold text-foreground">12.4K+</p>
                  <p className="text-xs text-muted-foreground font-sans">Active Gladiators</p>
                </div>
                <div>
                  <p className="font-game text-2xl font-bold text-primary">98.2%</p>
                  <p className="text-xs text-muted-foreground font-sans">Curriculum Match</p>
                </div>
                <div>
                  <p className="font-game text-2xl font-bold text-foreground">50ms</p>
                  <p className="text-xs text-muted-foreground font-sans">Real-time Sync</p>
                </div>
              </div>
            </div>

            {/* Hero Visual Card / Mascot */}
            <div className="relative flex justify-center lg:col-span-5">
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="size-5 text-primary" />
                    <span className="font-game text-sm font-bold">LIVE MATCHMAKING</span>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Ranked
                  </Badge>
                </div>

                <div className="my-8 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex size-24 items-center justify-center rounded-full bg-primary-light">
                    <MascotIcon className="size-16" />
                  </div>
                  <div>
                    <h3 className="font-game text-lg font-bold">Campus Clash Series</h3>
                    <p className="text-sm text-muted-foreground">General Science & Computing</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg bg-muted/60 p-4 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Match Type</span>
                    <span>1v1 Speed Battle</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Questions</span>
                    <span>15 Rounds • 10s per question</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Season</span>
                    <span className="text-primary font-semibold">Alpha Season 1</span>
                  </div>
                </div>

                <Button className="mt-5 w-full gap-2" variant="default">
                  <Zap className="size-4" /> Find Match Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modes Grid */}
      <section id="modes" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="font-game text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              CHOOSE YOUR <span className="text-primary">BATTLEGROUND</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground font-sans">
              Multiple game modes tailored for rapid revision, friendly challenge, or high-stakes competitive play.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Mode 1 */}
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Swords className="size-5" />
                  </div>
                  <Badge variant="secondary">Fast Paced</Badge>
                </div>
                <CardTitle className="mt-4 font-game text-xl">1v1 Quick Duel</CardTitle>
                <CardDescription>
                  Instant head-to-head showdown. Answer fast, get multipliers, and outsmart your opponent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• 10 lightning-round questions</li>
                  <li>• 12-second countdown per question</li>
                  <li>• Instant ranking progression</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Queue Duel
                </Button>
              </CardFooter>
            </Card>

            {/* Mode 2 */}
            <Card className="border-primary/50 shadow-md transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Trophy className="size-5" />
                  </div>
                  <Badge variant="default">Competitive</Badge>
                </div>
                <CardTitle className="mt-4 font-game text-xl">Campus Tournament</CardTitle>
                <CardDescription>
                  Represent your university and department. Bracket tournaments with official prize pools.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Multi-stage bracket elimination</li>
                  <li>• Institution leaderboard points</li>
                  <li>• Trophy badges & verified certificate</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Join Bracket</Button>
              </CardFooter>
            </Card>

            {/* Mode 3 */}
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Brain className="size-5" />
                  </div>
                  <Badge variant="secondary">Self-Study</Badge>
                </div>
                <CardTitle className="mt-4 font-game text-xl">Solo Training</CardTitle>
                <CardDescription>
                  Drill past exam papers, mock questions, and difficult syllabus topics at your own pace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Instant explanation on answers</li>
                  <li>• Adaptive difficulty based on performance</li>
                  <li>• Custom topic selectors</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Start Training
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-5 w-5" />
            <span className="font-game font-semibold">NETMIFI QUIZ ARENA</span>
          </div>
          <p>© 2026 NetMifi Ecosystem. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
