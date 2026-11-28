"use client";

import { ProfileAvatar } from "@/assets/profiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AuthenticatedStudentProfile } from "@/lib/supabase/auth";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Percent,
  Search,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export interface MatchedStudentItem {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarNumber: number;
  academicLevel: string | null;
  xp: number;
  battlesPlayed: number;
  battlesWon: number;
  universityId: string | null;
  universityName: string | null;
  universityShortCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
}

interface StudentMatchFinderProps {
  currentUser: AuthenticatedStudentProfile;
  initialStudents: MatchedStudentItem[];
  universities: { id: string; name: string; shortCode: string }[];
  departments: { id: string; name: string; code: string }[];
}

export function StudentMatchFinder({
  currentUser,
  initialStudents,
  universities,
  departments,
}: StudentMatchFinderProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>("ALL");
  const [selectedUniCode, setSelectedUniCode] = useState<string>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"match" | "xp" | "wins">("match");

  // Distinct courses/departments for filter badges
  const distinctCourses = useMemo(() => {
    const map = new Map<string, string>();
    map.set("ACC", "Accountancy (ACC)");
    map.set("CSC", "Computer Science (CSC)");
    map.set("STA", "Statistics (STA)");

    for (const d of departments) {
      if (!map.has(d.code)) {
        map.set(d.code, `${d.name} (${d.code})`);
      }
    }
    return Array.from(map.entries()).map(([code, label]) => ({
      code,
      label,
    }));
  }, [departments]);

  // Distinct universities for filter badges
  const distinctUniversities = useMemo(() => {
    const list: { shortCode: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const u of universities) {
      if (!seen.has(u.shortCode)) {
        seen.add(u.shortCode);
        list.push({ shortCode: u.shortCode, name: u.name });
      }
    }
    return list;
  }, [universities]);

  // Compute match percentage and filter criteria for each student
  const matchedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Exclude current user from opponents list
    const otherStudents = initialStudents.filter(
      (s) => s.id !== currentUser.id,
    );

    return otherStudents
      .map((student) => {
        const studentUniCode = student.universityShortCode ?? "";
        const studentDeptCode = student.departmentCode ?? "";
        const studentDeptName = student.departmentName ?? "";
        const studentUniName = student.universityName ?? "";
        const studentLevel = student.academicLevel ?? "";

        // Text Search match check
        const textMatches =
          !q ||
          student.displayName.toLowerCase().includes(q) ||
          student.username.toLowerCase().includes(q) ||
          studentDeptCode.toLowerCase().includes(q) ||
          studentDeptName.toLowerCase().includes(q) ||
          studentUniCode.toLowerCase().includes(q) ||
          studentUniName.toLowerCase().includes(q) ||
          studentLevel.toLowerCase().includes(q);

        // Calculate Match Percentage (100% to 0%)
        let matchScore = 0;
        let matchReason = "Open Challenger";

        // Determine comparison basis:
        // If user explicitly chose a Course of Study or School filter, match against that selection.
        // Otherwise, match against the current user's profile.
        const targetDeptCode =
          selectedDeptCode !== "ALL"
            ? selectedDeptCode
            : currentUser.departmentName?.toLowerCase().includes("account")
              ? "ACC"
              : currentUser.departmentName?.toLowerCase().includes("statistic")
                ? "STA"
                : "CSC";

        const targetUniCode =
          selectedUniCode !== "ALL"
            ? selectedUniCode
            : (currentUser.universityShortCode ?? "UNILAG");

        const isExactDept =
          studentDeptCode.toUpperCase() === targetDeptCode.toUpperCase();
        const isExactUni =
          studentUniCode.toUpperCase() === targetUniCode.toUpperCase();
        const isSameLevel = studentLevel === currentUser.academicLevel;

        if (isExactDept && isExactUni) {
          matchScore = 100;
          matchReason = "100% Match • Same Course & University";
        } else if (isExactDept) {
          // Same course of study (e.g. Accountancy), different university
          matchScore = isSameLevel ? 85 : 75;
          matchReason = `${matchScore}% Match • Syllabus Peer (${studentDeptCode})`;
        } else if (isExactUni) {
          // Same university, different department
          matchScore = isSameLevel ? 60 : 50;
          matchReason = `${matchScore}% Match • Campus Rival (${studentUniCode})`;
        } else if (isSameLevel) {
          // Same level cohort across campuses
          matchScore = 25;
          matchReason = "25% Match • Cohort Peer";
        } else {
          matchScore = 0;
          matchReason = "0% Match • Open Challenger";
        }

        // Filter checks for department, university, and level pills
        if (
          selectedDeptCode !== "ALL" &&
          studentDeptCode.toUpperCase() !== selectedDeptCode.toUpperCase()
        ) {
          // If a specific course of study is filtered (e.g. Accountancy), reduce score if not matching
          matchScore = Math.max(0, matchScore - 50);
        }

        if (
          selectedUniCode !== "ALL" &&
          studentUniCode.toUpperCase() !== selectedUniCode.toUpperCase()
        ) {
          matchScore = Math.max(0, matchScore - 40);
        }

        if (selectedLevel !== "ALL" && studentLevel !== selectedLevel) {
          matchScore = Math.max(0, matchScore - 20);
        }

        return {
          ...student,
          matchScore,
          matchReason,
          textMatches,
        };
      })
      .filter((s) => s.textMatches)
      .sort((a, b) => {
        if (sortBy === "match") {
          if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return b.xp - a.xp;
        }
        if (sortBy === "xp") {
          return b.xp - a.xp;
        }
        return b.battlesWon - a.battlesWon;
      });
  }, [
    initialStudents,
    currentUser,
    searchQuery,
    selectedDeptCode,
    selectedUniCode,
    selectedLevel,
    sortBy,
  ]);

  function getBadgeStyle(score: number) {
    if (score >= 90) {
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold";
    }
    if (score >= 70) {
      return "border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold";
    }
    if (score >= 45) {
      return "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold";
    }
    if (score > 0) {
      return "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400";
    }
    return "border-border bg-muted/60 text-muted-foreground";
  }

  function getBarColor(score: number) {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-teal-500";
    if (score >= 45) return "bg-amber-500";
    if (score > 0) return "bg-blue-500";
    return "bg-muted-foreground/30";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Match Identity Banner */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="size-3 text-primary" />
                Live Peer Matchmaking
              </Badge>
              <Badge variant="outline" className="text-xs">
                {currentUser.universityShortCode ?? "Campus"} •{" "}
                {currentUser.departmentName ?? "Department"}
              </Badge>
            </div>
            <CardTitle className="font-game text-xl font-bold sm:text-2xl">
              FIND YOUR ACADEMIC OPPONENT
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Discover students matching your course of study (e.g. Accountancy,
              Computer Science, Statistics) and school, ranked from 100% to 0%
              match.
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/arena/new">
              <Button size="sm" className="gap-1.5">
                <Swords className="size-4" />
                Create Custom Battle
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-0">
          {/* Main Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by student name, @username, course (e.g. accountancy), or school (e.g. UNILAG)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 pr-9 text-sm shadow-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3.5 text-xs sm:p-4">
            {/* 1. Course of Study Filter */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-1.5 font-medium text-foreground shrink-0 w-28">
                <BookOpen className="size-3.5 text-primary" />
                Course of Study:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={selectedDeptCode === "ALL" ? "default" : "outline"}
                  onClick={() => setSelectedDeptCode("ALL")}
                  className="h-7 text-xs px-2.5"
                >
                  All Courses
                </Button>
                {distinctCourses.map((c) => (
                  <Button
                    key={c.code}
                    size="sm"
                    variant={
                      selectedDeptCode === c.code ? "default" : "outline"
                    }
                    onClick={() => setSelectedDeptCode(c.code)}
                    className="h-7 text-xs px-2.5"
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 2. School / University Filter */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-1.5 font-medium text-foreground shrink-0 w-28">
                <Building2 className="size-3.5 text-primary" />
                University / School:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={selectedUniCode === "ALL" ? "default" : "outline"}
                  onClick={() => setSelectedUniCode("ALL")}
                  className="h-7 text-xs px-2.5"
                >
                  All Universities
                </Button>
                {distinctUniversities.map((u) => (
                  <Button
                    key={u.shortCode}
                    size="sm"
                    variant={
                      selectedUniCode === u.shortCode ? "default" : "outline"
                    }
                    onClick={() => setSelectedUniCode(u.shortCode)}
                    className="h-7 text-xs px-2.5"
                  >
                    {u.shortCode}
                  </Button>
                ))}
              </div>
            </div>

            {/* 3. Academic Level Filter & Sort By */}
            <div className="flex flex-col justify-between gap-2 border-t border-border/60 pt-2.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground shrink-0">
                  Level:
                </span>
                <div className="flex flex-wrap gap-1">
                  {["ALL", "100L", "200L", "300L", "400L"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedLevel === lvl
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">
                  Sort By:
                </span>
                <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSortBy("match")}
                    className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                      sortBy === "match"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Match % (100% → 0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("xp")}
                    className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                      sortBy === "xp"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    XP
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("wins")}
                    className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                      sortBy === "wins"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Wins
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="font-game text-sm font-semibold tracking-wide text-foreground">
          MATCH RESULTS ({matchedStudents.length}{" "}
          {matchedStudents.length === 1 ? "STUDENT" : "STUDENTS"})
        </p>
        <span className="text-xs text-muted-foreground">
          Ranked from 100% to 0% match similarity
        </span>
      </div>

      {/* Student Cards Grid */}
      {matchedStudents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Users className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-game text-base font-bold text-foreground">
            No Matched Students Found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            No students matched your search criteria. Try clearing filters or
            searching for another course of study like &quot;Accountancy&quot;
            or &quot;CSC&quot;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedDeptCode("ALL");
              setSelectedUniCode("ALL");
              setSelectedLevel("ALL");
            }}
            className="mt-4 gap-1.5"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matchedStudents.map((student) => {
            const winRate =
              student.battlesPlayed > 0
                ? Math.round((student.battlesWon / student.battlesPlayed) * 100)
                : 0;

            const targetCourseCode = student.departmentCode ?? "ACC";

            return (
              <Card
                key={student.id}
                className="group relative flex flex-col justify-between overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
              >
                {/* Top Match Bar Header */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`gap-1 px-2 py-0.5 text-xs ${getBadgeStyle(student.matchScore)}`}
                    >
                      <Percent className="size-3 shrink-0" />
                      {student.matchScore}% Match
                    </Badge>
                  </div>
                  <span className="truncate text-[11px] font-medium text-muted-foreground">
                    {student.academicLevel ?? "200L"}
                  </span>
                </div>

                {/* Progress bar visual indicator */}
                <div className="h-1 w-full bg-muted">
                  <div
                    className={`h-full transition-all duration-300 ${getBarColor(student.matchScore)}`}
                    style={{ width: `${Math.max(student.matchScore, 4)}%` }}
                  />
                </div>

                <CardContent className="space-y-4 p-4">
                  {/* Identity row */}
                  <div className="flex items-start gap-3">
                    <ProfileAvatar
                      avatarUrl={student.avatarUrl}
                      avatarNumber={student.avatarNumber}
                      displayName={student.displayName}
                      className="size-12 shrink-0 ring-2 ring-border group-hover:ring-primary/40 transition-all"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="truncate font-game text-sm font-bold text-foreground">
                        {student.displayName}
                      </h4>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        @{student.username}
                      </p>
                      <p className="text-[11px] font-medium text-primary line-clamp-1">
                        {student.matchReason}
                      </p>
                    </div>
                  </div>

                  {/* Academic affiliation badges */}
                  <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <Building2 className="size-3 text-muted-foreground" />
                        School
                      </span>
                      <span className="truncate font-medium text-foreground text-right">
                        {student.universityShortCode ?? "University"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <BookOpen className="size-3 text-muted-foreground" />
                        Course
                      </span>
                      <span className="truncate font-medium text-foreground text-right">
                        {student.departmentName ?? "Department"}
                      </span>
                    </div>
                  </div>

                  {/* Student Stats Banner */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <p className="font-game font-bold text-primary">
                        {student.xp}
                      </p>
                      <p className="text-[10px] text-muted-foreground">XP</p>
                    </div>
                    <div>
                      <p className="font-game font-bold text-foreground">
                        {student.battlesWon}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Wins</p>
                    </div>
                    <div>
                      <p className="font-game font-bold text-foreground">
                        {winRate}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Win Rate
                      </p>
                    </div>
                  </div>
                </CardContent>

                {/* Challenge Action Button */}
                <div className="border-t border-border/60 p-3 bg-muted/10">
                  <Link
                    href={`/arena/new?opponent=${encodeURIComponent(student.id)}&courseCode=${encodeURIComponent(targetCourseCode)}`}
                    className="block w-full"
                  >
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs font-semibold"
                    >
                      <Swords className="size-3.5" />
                      Challenge to 1v1 Battle
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
