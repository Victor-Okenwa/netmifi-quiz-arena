"use client";

import { LogoIcon } from "@/assets/netmifi";
import {
  type AvatarNumber,
  PROFILE_AVATAR_PRESETS,
  ProfileAvatar,
  normalizeAvatarNumber,
} from "@/assets/profiles";
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
  initialAvatarUrl: string | null;
  initialAvatarNumber: number;
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
  initialAvatarUrl,
  initialAvatarNumber,
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
  const [avatarNumber, setAvatarNumber] = useState<AvatarNumber>(
    normalizeAvatarNumber(initialAvatarNumber)
  );
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
          avatarNumber,
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

  const activePreset =
    PROFILE_AVATAR_PRESETS.find((p) => p.number === avatarNumber) ??
    PROFILE_AVATAR_PRESETS[0]!;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <LogoIcon className="h-9 w-9" />
        <span className="font-game text-xl font-bold tracking-tight text-foreground">
          NETMIFI <span className="text-primary">QUIZ ARENA</span>
        </span>
      </div>

      <Card className="w-full max-w-2xl border-border shadow-lg">
        <CardHeader className="space-y-1.5">
          <CardTitle className="font-game text-2xl font-bold">
            COMPLETE YOUR PROFILE
          </CardTitle>
          <CardDescription>
            Choose your character avatar, university, department, and level to
            unlock your course battles.
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
            {/* Vertical Scrollable Profile Avatar Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label>Select Your Arena Avatar</Label>
                <span className="text-xs text-muted-foreground">
                  Scroll vertically to browse all 5 characters
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-12">
                {/* Active Avatar Preview Card */}
                <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border border-border bg-card p-4 text-center sm:col-span-5">
                  <ProfileAvatar
                    avatarNumber={avatarNumber}
                    displayName={displayName}
                    className="size-20 ring-4 ring-primary/25"
                  />
                  <div>
                    <Badge variant="default" className="font-game text-[10px]">
                      Avatar #{activePreset.number}
                    </Badge>
                    <p className="mt-1 font-game text-sm font-bold text-foreground">
                      {activePreset.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {activePreset.tagline}
                    </p>
                  </div>
                  {initialAvatarUrl ? (
                    <p className="text-[10px] text-muted-foreground">
                      Used automatically whenever no photo URL is set
                    </p>
                  ) : null}
                </div>

                {/* Vertical Scrollable List of 5 Avatars */}
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1 sm:col-span-7">
                  {PROFILE_AVATAR_PRESETS.map((preset) => {
                    const isSelected = preset.number === avatarNumber;
                    const AvatarComponent = preset.Component;

                    return (
                      <button
                        key={preset.number}
                        type="button"
                        onClick={() => setAvatarNumber(preset.number)}
                        className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary-light/60 ring-2 ring-primary/30"
                            : "border-border bg-card hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <AvatarComponent className="size-11 shrink-0 rounded-full ring-2 ring-border" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-game text-xs font-bold text-foreground">
                                {preset.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                #{preset.number}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {preset.tagline}
                            </p>
                          </div>
                        </div>

                        {isSelected ? (
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
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
                <Label htmlFor="username">Username</Label>
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
                University
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
                <Label htmlFor="department">Department</Label>
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
                <Label>Level</Label>
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
                <span>Department Courses ({courses.length})</span>
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
                  Saving Profile...
                </>
              ) : (
                <>
                  <Swords className="size-5" />
                  Continue to Arena
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
