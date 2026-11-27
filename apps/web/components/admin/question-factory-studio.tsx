"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSafeIngestionUrl } from "@repo/validators";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface StudioCourse {
  id: string;
  code: string;
  title: string;
}

export interface StudioTopic {
  id: string;
  courseId: string;
  name: string;
}

export interface IngestionJobItem {
  id: string;
  sourceId: string;
  status: "pending" | "crawling" | "processing" | "generating" | "review_required" | "completed" | "failed";
  questionsGeneratedCount: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  sourceTitle: string;
  sourceUrl: string;
  courseCode: string;
  courseTitle: string;
  topicName: string;
}

export interface QuestionDraftItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  topicId: string;
  topicName: string;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  questionText: string;
  difficulty: "easy" | "medium" | "hard";
  correctOptionKey: "A" | "B" | "C" | "D";
  explanation: string;
  approvalStatus: "draft" | "approved" | "rejected";
  options: Record<string, string>;
  createdAt: string;
}

interface QuestionFactoryStudioProps {
  courses: StudioCourse[];
  topics: StudioTopic[];
  currentUserId: string;
}

export function QuestionFactoryStudio({
  courses,
}: QuestionFactoryStudioProps) {
  const [activeTab, setActiveTab] = useState<"ingest" | "review" | "bank" | "jobs">("ingest");

  // Ingestion form state: Custom Course Generator
  const [courseCode, setCourseCode] = useState<string>("SOL 101");
  const [courseTitle, setCourseTitle] = useState<string>("Solana Blockchain & Smart Contracts");
  const [topicName, setTopicName] = useState<string>("Anchor Escrow & Account Architecture");
  const [academicLevel, setAcademicLevel] = useState<"100L" | "200L" | "300L" | "400L" | "500L">("300L");
  const [sourceUrl, setSourceUrl] = useState<string>("https://solana.com/docs/intro/overview");
  const [sourceTitle, setSourceTitle] = useState<string>("Solana Core Developer Documentation");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [codeWarning, setCodeWarning] = useState<string | null>(null);

  // Jobs state
  const [jobs, setJobs] = useState<IngestionJobItem[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);

  // Review & Question Bank state
  const [questions, setQuestions] = useState<QuestionDraftItem[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "approved" | "rejected">("draft");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Editable drafts in Review Studio
  const [editedQuestions, setEditedQuestions] = useState<Record<string, Partial<QuestionDraftItem>>>({});

  // Real-time Course Code Protection Check
  useEffect(() => {
    const cleanInput = courseCode.trim().replace(/\s+/g, "").toUpperCase();
    if (!cleanInput) {
      setCodeWarning(null);
      return;
    }

    const isMatch = courses.some(
      (c) => c.code.replace(/\s+/g, "").toUpperCase() === cleanInput
    );

    if (isMatch) {
      setCodeWarning(
        `Course code "${courseCode.trim().toUpperCase()}" already exists in the official university catalog. Official courses are locked to protect accredited curricula. Please use a new custom course code (e.g., SOL 101, WEB 301, AI 201).`
      );
    } else {
      setCodeWarning(null);
    }
  }, [courseCode, courses]);

  // Real-time URL safety validation
  useEffect(() => {
    if (!sourceUrl.trim()) {
      setUrlWarning(null);
      return;
    }
    if (!isSafeIngestionUrl(sourceUrl.trim())) {
      setUrlWarning("URL must use HTTPS and point to a public educational web domain (private IP ranges & localhost are blocked).");
    } else {
      setUrlWarning(null);
    }
  }, [sourceUrl]);

  // Load jobs
  async function fetchJobs() {
    setIsLoadingJobs(true);
    try {
      const res = await fetch("/api/admin/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingJobs(false);
    }
  }

  // Load questions
  async function fetchQuestions(filter = statusFilter) {
    setIsLoadingQuestions(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }
      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  useEffect(() => {
    fetchJobs();
    fetchQuestions("draft");
  }, []);

  // Polling for active jobs
  useEffect(() => {
    const hasActiveJob = jobs.some((j) =>
      ["pending", "crawling", "processing", "generating"].includes(j.status)
    );

    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      fetchJobs();
      fetchQuestions();
    }, 4000);

    return () => clearInterval(interval);
  }, [jobs, statusFilter]);

  // Handle Ingestion submission
  async function handleIngestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !courseCode.trim() ||
      !courseTitle.trim() ||
      !topicName.trim() ||
      !sourceUrl.trim() ||
      !sourceTitle.trim()
    ) {
      toast.error("Please fill in all course and source parameters.");
      return;
    }

    if (codeWarning) {
      toast.error("Course protection: You cannot overwrite existing university courses.");
      return;
    }

    if (!isSafeIngestionUrl(sourceUrl.trim())) {
      toast.error("SSRF Block: URL must use HTTPS and cannot resolve to a private or local IP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          topicName: topicName.trim(),
          academicLevel,
          sourceTitle: sourceTitle.trim(),
          sourceUrl: sourceUrl.trim(),
          maxPages: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger ingestion job.");
      }

      toast.success(
        `Custom course ${courseCode.trim().toUpperCase()} registered! Firecrawl is extracting content and generating draft questions.`
      );
      fetchJobs();
      setActiveTab("jobs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ingestion request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle question review action
  async function handleReviewAction(
    questionId: string,
    action: "approve" | "reject"
  ) {
    setReviewingId(questionId);
    try {
      const edits = editedQuestions[questionId] || {};
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          questionText: edits.questionText,
          explanation: edits.explanation,
          difficulty: edits.difficulty,
          correctOptionKey: edits.correctOptionKey,
          options: edits.options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} question.`);
      }

      toast.success(
        action === "approve"
          ? "Question approved! Published to live match pool."
          : "Question rejected and removed from review."
      );

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                ...edits,
                approvalStatus: action === "approve" ? "approved" : "rejected",
              }
            : q
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review action failed.");
    } finally {
      setReviewingId(null);
    }
  }

  const draftCount = questions.filter((q) => q.approvalStatus === "draft").length;

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-game text-2xl font-extrabold tracking-tight sm:text-3xl">
              QUESTION <span className="text-primary">FACTORY</span>
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary">
              INTERACTIVE DEMO
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Generate and verify new academic course question banks from live web resources using Firecrawl and AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchJobs();
              fetchQuestions();
              toast.info("Refreshed jobs and question catalog.");
            }}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Course Protection Banner */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-foreground sm:text-sm">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          Judge & Community Playground — Course Protection Enabled
        </div>
        <p className="mt-1 text-muted-foreground leading-relaxed">
          You can synthesize brand-new course question banks from any educational web resource.
          To preserve accredited tertiary curricula, existing official course codes (
          <span className="font-mono text-foreground font-semibold">
            {courses.slice(0, 8).map((c) => c.code).join(", ")}
          </span>
          ) cannot be overwritten. Enter a new custom course code (e.g.,{" "}
          <span className="font-mono text-primary font-bold">SOL 101</span>,{" "}
          <span className="font-mono text-primary font-bold">WEB 301</span>,{" "}
          <span className="font-mono text-primary font-bold">AI 201</span>,{" "}
          <span className="font-mono text-primary font-bold">CYB 401</span>).
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ingest" className="gap-1.5 text-xs sm:text-sm">
            <Globe className="size-3.5 text-primary" />
            Generate Course
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="size-3.5 text-primary" />
            Ingestion Jobs
            {jobs.filter((j) => ["crawling", "generating"].includes(j.status)).length > 0 ? (
              <span className="flex size-2 animate-ping rounded-full bg-primary" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5 text-xs sm:text-sm">
            <Eye className="size-3.5 text-primary" />
            Review Studio
            {draftCount > 0 ? (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {draftCount}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="size-3.5 text-primary" />
            Arena Bank
          </TabsTrigger>
        </TabsList>

        {/* 1. Ingestion Form Tab */}
        <TabsContent value="ingest" className="mt-6 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-game text-lg">
                CUSTOM COURSE QUESTION FACTORY
              </CardTitle>
              <CardDescription>
                Define a new university course, specify an academic reference URL, and Firecrawl will extract syllabus content and generate 4-choice questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIngestSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="courseCode">
                      New Course Code <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="courseCode"
                      placeholder="e.g. SOL 101, WEB 301, AI 201"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                      required
                    />
                    {codeWarning ? (
                      <p className="flex items-start gap-1.5 text-xs text-destructive">
                        <Lock className="size-3.5 shrink-0 mt-0.5" />
                        {codeWarning}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Must be a unique course code not already in the official catalog.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="courseTitle">
                      Course Title <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="courseTitle"
                      placeholder="e.g. Solana Blockchain & Smart Contract Engineering"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="topicName">
                      Syllabus Topic <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="topicName"
                      placeholder="e.g. Anchor Escrow & Account PDA Model"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicLevel">Academic Level</Label>
                    <select
                      id="academicLevel"
                      value={academicLevel}
                      onChange={(e) =>
                        setAcademicLevel(
                          e.target.value as "100L" | "200L" | "300L" | "400L" | "500L"
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <option value="100L">100L (Freshman)</option>
                      <option value="200L">200L (Sophomore)</option>
                      <option value="300L">300L (Junior)</option>
                      <option value="400L">400L (Senior)</option>
                      <option value="500L">500L (Professional)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceTitle">
                    Source Reference Title <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="sourceTitle"
                    placeholder="e.g. Solana Core Developer Documentation"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">
                    Academic Content URL (HTTPS Only) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://solana.com/docs/intro/overview"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    required
                  />
                  {urlWarning ? (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {urlWarning}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Protected by SSRF guardrails. Private IPs (10.x, 192.168.x, 169.254.x, localhost) are strictly prohibited.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || Boolean(urlWarning) || Boolean(codeWarning)}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Register Course & Generate Questions
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Ingestion Jobs Tab */}
        <TabsContent value="jobs" className="mt-6 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-game text-lg">
                INGESTION PIPELINE MONITOR
              </CardTitle>
              <CardDescription>
                Real-time tracking of content scraping, normalization, and draft generation jobs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJobs && jobs.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No ingestion jobs have been run yet. Use the "Generate Course" tab to start one.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-game text-xs font-bold text-foreground">
                            {job.courseCode}: {job.topicName}
                          </span>
                          <Badge
                            variant={
                              job.status === "review_required"
                                ? "default"
                                : job.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="font-mono text-[10px] uppercase"
                          >
                            {job.status === "review_required" ? "Ready for Review" : job.status}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.sourceTitle} •{" "}
                          <a
                            href={job.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          >
                            Source Link <ExternalLink className="size-2.5" />
                          </a>
                        </p>
                        {job.errorMessage ? (
                          <p className="text-xs text-destructive">
                            Error: {job.errorMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <p className="font-semibold text-foreground">
                            {job.questionsGeneratedCount} questions
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(job.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {job.status === "review_required" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setStatusFilter("draft");
                              fetchQuestions("draft");
                              setActiveTab("review");
                            }}
                            className="gap-1 text-xs"
                          >
                            Review Drafts
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Review Studio Tab */}
        <TabsContent value="review" className="mt-6 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="font-game text-lg">
                  HUMAN REVIEW WORKBENCH
                </CardTitle>
                <CardDescription>
                  Review AI-generated draft questions. Edit choices, confirm accuracy, and click Approve to publish live into the arena.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const next = e.target.value as typeof statusFilter;
                    setStatusFilter(next);
                    fetchQuestions(next);
                  }}
                  className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none"
                >
                  <option value="draft">Pending Review (Drafts)</option>
                  <option value="approved">Approved (Live)</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All Statuses</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : questions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No questions found for the "{statusFilter}" filter.
                </p>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, idx) => {
                    const currentEdits = editedQuestions[q.id] || {};
                    const currentText = currentEdits.questionText ?? q.questionText;
                    const currentExplanation = currentEdits.explanation ?? q.explanation;
                    const currentDifficulty = currentEdits.difficulty ?? q.difficulty;
                    const currentCorrectKey = currentEdits.correctOptionKey ?? q.correctOptionKey;
                    const currentOptions = currentEdits.options ?? q.options;

                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-border/80 bg-background/50 p-4 transition-colors"
                      >
                        {/* Top question row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {q.courseCode} • {q.topicName}
                            </Badge>
                            <Badge
                              variant={
                                q.approvalStatus === "approved"
                                  ? "default"
                                  : q.approvalStatus === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="font-mono text-[10px] uppercase"
                            >
                              {q.approvalStatus}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Difficulty:</span>
                            <select
                              value={currentDifficulty}
                              onChange={(e) =>
                                setEditedQuestions((prev) => ({
                                  ...prev,
                                  [q.id]: {
                                    ...prev[q.id],
                                    difficulty: e.target.value as "easy" | "medium" | "hard",
                                  },
                                }))
                              }
                              className="rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        {/* Editable Question Prompt */}
                        <div className="mt-3 space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Question Prompt
                          </Label>
                          <textarea
                            value={currentText}
                            rows={2}
                            onChange={(e) =>
                              setEditedQuestions((prev) => ({
                                ...prev,
                                [q.id]: {
                                  ...prev[q.id],
                                  questionText: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                          />
                        </div>

                        {/* Options A - D */}
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(["A", "B", "C", "D"] as const).map((key) => {
                            const isCorrect = currentCorrectKey === key;
                            return (
                              <div
                                key={key}
                                className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${
                                  isCorrect
                                    ? "border-primary/60 bg-primary/10"
                                    : "border-border bg-background"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditedQuestions((prev) => ({
                                      ...prev,
                                      [q.id]: {
                                        ...prev[q.id],
                                        correctOptionKey: key,
                                      },
                                    }))
                                  }
                                  className={`flex size-6 shrink-0 items-center justify-center rounded font-game text-xs font-bold transition-colors ${
                                    isCorrect
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                  title="Click to mark as correct answer"
                                >
                                  {key}
                                </button>
                                <input
                                  type="text"
                                  value={currentOptions[key] ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedQuestions((prev) => ({
                                      ...prev,
                                      [q.id]: {
                                        ...prev[q.id],
                                        options: {
                                          ...currentOptions,
                                          [key]: val,
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-full bg-transparent text-xs text-foreground focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Academic Explanation (Shown during post-battle diagnosis)
                          </Label>
                          <textarea
                            value={currentExplanation}
                            rows={2}
                            onChange={(e) =>
                              setEditedQuestions((prev) => ({
                                ...prev,
                                [q.id]: {
                                  ...prev[q.id],
                                  explanation: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus-visible:outline-none"
                          />
                        </div>

                        {/* Actions Row */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
                          <div className="text-[11px] text-muted-foreground">
                            {q.sourceTitle ? (
                              <span>Extracted from: {q.sourceTitle}</span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {q.approvalStatus !== "rejected" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reviewingId === q.id}
                                onClick={() => handleReviewAction(q.id, "reject")}
                                className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="size-3.5" />
                                Reject
                              </Button>
                            ) : null}

                            {q.approvalStatus !== "approved" ? (
                              <Button
                                size="sm"
                                disabled={reviewingId === q.id}
                                onClick={() => handleReviewAction(q.id, "approve")}
                                className="gap-1.5 text-xs"
                              >
                                {reviewingId === q.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-3.5" />
                                )}
                                Approve & Publish to Arena
                              </Button>
                            ) : (
                              <Badge variant="default" className="gap-1 text-xs">
                                <CheckCircle2 className="size-3.5" />
                                LIVE IN ARENA
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Arena Bank Tab */}
        <TabsContent value="bank" className="mt-6 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="font-game text-lg">
                  LIVE ARENA QUESTION POOL
                </CardTitle>
                <CardDescription>
                  Questions currently marked as approved and active for instant match selection and practice drills.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchQuestions("approved")}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Reload Approved
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questions.filter((q) => q.approvalStatus === "approved").length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No approved questions found under the active filter. Review and approve questions in the Review Studio.
                  </p>
                ) : (
                  questions
                    .filter((q) => q.approvalStatus === "approved")
                    .map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-game text-xs font-bold text-foreground">
                              {q.courseCode} • {q.topicName}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {q.difficulty}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            {q.questionText}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Answer [{q.correctOptionKey}]: {q.options[q.correctOptionKey]}
                          </p>
                        </div>
                        <Badge variant="default" className="shrink-0 text-xs">
                          READY
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
