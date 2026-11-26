"use client";

import { LogoIcon } from "@/assets/netmifi";
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
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Swords,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

export interface UniversityOption {
  id: string;
  name: string;
  shortCode: string;
}

export interface DepartmentOption {
  id: string;
  universityId: string;
  name: string;
  code: string;
}

export interface CoursePreviewOption {
  id: string;
  code: string;
  title: string;
  academicLevel: string;
}

interface OnboardingFormProps {
  initialDisplayName: string;
  initialUsername: string;
  initialUniversityId: string | null;
  initialDepartmentId: string | null;
  initialAcademicLevel: string;
  universities: UniversityOption[];
  departments: DepartmentOption[];
  courses: CoursePreviewOption[];
}

const ACADEMIC_LEVELS = ["100L", "200L", "300L", "400L", "500L"] as const;

export function OnboardingForm({
  initialDisplayName,
  initialUsername,
  initialUniversityId,
  initialDepartmentId,
  initialAcademicLevel,
  universities,
  departments,
  courses,
}: OnboardingFormProps) {
  const router = useRouter();
  const defaultUniId = initialUniversityId ?? universities[0]?.id ?? "";

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [universityId, setUniversityId] = useState(defaultUniId);
  const [academicLevel, setAcademicLevel] = useState(
    initialAcademicLevel || "200L"
  );

  const filteredDepartments = useMemo(
    () => departments.filter((dept) => dept.universityId === universityId),
    [departments, universityId]
  );

  const [departmentId, setDepartmentId] = useState(
    initialDepartmentId ?? filteredDepartments[0]?.id ?? ""
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleUniversityChange(newUniId: string) {
    setUniversityId(newUniId);
    const matchingDepts = departments.filter(
      (dept) => dept.universityId === newUniId
    );
    setDepartmentId(matchingDepts[0]?.id ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          universityId,
          departmentId,
          academicLevel,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          data.error ?? "Failed to save academic profile. Please try again."
        );
        setIsLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/arena");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <LogoIcon className="h-9 w-9" />
        <span className="font-game text-xl font-bold tracking-tight text-foreground">
          NETMIFI <span className="text-primary">QUIZ ARENA</span>
        </span>
      </div>

      <Card className="w-full max-w-2xl border-border shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="default" className="gap-1.5">
              <GraduationCap className="size-3.5" />
              Step 1 of 1 • Academic Profile Setup
            </Badge>
            <span className="text-xs text-muted-foreground">
              Nigerian Tertiary Curriculum
            </span>
          </div>
          <CardTitle className="font-game text-2xl font-bold">
            CONFIGURE YOUR ACADEMIC LOADOUT
          </CardTitle>
          <CardDescription>
            Select your university, department, and level so Quiz Arena can
            match you with relevant course battles, peers, and topic diagnoses.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {errorMessage ? (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Student Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Chidi Okafor"
                  required
                  minLength={2}
                  maxLength={80}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Arena Handle (@username)</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  placeholder="chidi_csc"
                  required
                  minLength={3}
                  maxLength={24}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* University Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="size-4 text-primary" />
                Select Your University
              </Label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {universities.map((uni) => {
                  const isSelected = uni.id === universityId;
                  return (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleUniversityChange(uni.id)}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary-light/60 text-foreground ring-2 ring-primary/30"
                          : "border-border bg-card hover:bg-muted/60"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-game text-xs font-bold text-primary">
                          {uni.shortCode}
                        </p>
                        <p className="truncate text-xs font-medium text-foreground">
                          {uni.name}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department & Level */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="department">Academic Department</Label>
                <select
                  id="department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  required
                  disabled={isLoading}
                >
                  {filteredDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Academic Level</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ACADEMIC_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAcademicLevel(lvl)}
                      className={`h-9 rounded-md border font-game text-xs font-bold transition-colors ${
                        academicLevel === lvl
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Available Battle Courses Preview */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-foreground">
                <BookOpen className="size-4 text-primary" />
                <span>Unlocked Arena Courses ({courses.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-lg border border-border/80 bg-card p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-game text-xs font-bold text-primary">
                        {course.code}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {course.academicLevel}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-foreground">
                      {course.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={isLoading || !universityId || !departmentId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving Academic Profile...
                </>
              ) : (
                <>
                  <Swords className="size-5" />
                  Complete Setup & Enter Quiz Arena
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
