/**
 * Question Factory Ingestion Job Service.
 * Manages the lifecycle: PENDING -> CRAWLING -> PROCESSING -> GENERATING -> REVIEW_REQUIRED -> COMPLETED / FAILED.
 * Enforces Rule 6.1 (SSRF-safe, isolated draft questions, human review required).
 */

import {
  contentSources,
  courses,
  db,
  eq,
  ingestionJobs,
  questionOptions,
  questions,
  sql,
  topics,
} from "@repo/db";
import { extractAcademicContent } from "@repo/firecrawl";
import { generateGroundedQuestions } from "./generator";

export interface CreateIngestionJobParams {
  courseCode: string;
  courseTitle: string;
  topicName: string;
  academicLevel?: "100L" | "200L" | "300L" | "400L" | "500L";
  sourceUrl: string;
  sourceTitle: string;
  submittedByUserId?: string;
  maxPages?: number;
}

export interface IngestionJobRecord {
  jobId: string;
  sourceId: string;
  status: "pending" | "crawling" | "processing" | "generating" | "review_required" | "completed" | "failed";
  questionsGeneratedCount: number;
  errorMessage?: string | null;
  sourceTitle: string;
  sourceUrl: string;
  courseCode: string;
  topicName: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

/**
 * Creates an ingestion source and job, then begins asynchronous processing.
 * Enforces course protection: existing course codes CANNOT be overwritten.
 */
export async function createAndRunIngestionJob(
  params: CreateIngestionJobParams
): Promise<{ jobId: string; sourceId: string; courseId: string; topicId: string }> {
  const normalizedCode = params.courseCode.trim().replace(/\s+/g, " ").toUpperCase();
  const codeWithoutSpaces = normalizedCode.replace(/\s+/g, "");

  // 1. Course Protection Guardrail: Verify course code does NOT already exist
  const existing = await db
    .select({ id: courses.id, code: courses.code })
    .from(courses)
    .where(
      sql`UPPER(REPLACE(${courses.code}, ' ', '')) = ${codeWithoutSpaces}`
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(
      `Course code "${normalizedCode}" already exists in the catalog. To protect accredited university curricula, you cannot overwrite existing courses. Please choose a new unique custom course code (e.g. SOL 101, WEB 301, AI 401).`
    );
  }

  // 2. Create the new custom course
  const [newCourse] = await db
    .insert(courses)
    .values({
      code: normalizedCode,
      title: params.courseTitle.trim(),
      description: `Custom Course: ${params.courseTitle.trim()}`,
      academicLevel: params.academicLevel ?? "200L",
    })
    .returning({ id: courses.id, code: courses.code, title: courses.title });

  if (!newCourse) {
    throw new Error("Failed to register new course in database.");
  }

  // 3. Create the topic under the newly created course
  const baseSlug = params.topicName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = baseSlug.length > 0 ? baseSlug : "core-concepts";

  const [newTopic] = await db
    .insert(topics)
    .values({
      courseId: newCourse.id,
      name: params.topicName.trim(),
      slug,
      description: `Core syllabus topics for ${params.courseTitle.trim()}`,
      orderIndex: 1,
    })
    .returning({ id: topics.id, name: topics.name });

  if (!newTopic) {
    throw new Error("Failed to create topic record in database.");
  }

  // 4. Insert content source record
  const [sourceRecord] = await db
    .insert(contentSources)
    .values({
      courseId: newCourse.id,
      topicId: newTopic.id,
      title: params.sourceTitle.trim(),
      sourceUrl: params.sourceUrl.trim(),
      submittedByUserId: params.submittedByUserId ?? null,
    })
    .returning({ id: contentSources.id });

  if (!sourceRecord) {
    throw new Error("Failed to create content source record in database.");
  }

  // 5. Insert initial ingestion job
  const [jobRecord] = await db
    .insert(ingestionJobs)
    .values({
      sourceId: sourceRecord.id,
      status: "pending",
      questionsGeneratedCount: 0,
    })
    .returning({ id: ingestionJobs.id });

  if (!jobRecord) {
    throw new Error("Failed to create ingestion job record in database.");
  }

  // 6. Trigger asynchronous processing without blocking the initial HTTP response
  runIngestionPipeline(jobRecord.id, sourceRecord.id, newCourse, newTopic, params.sourceUrl).catch(
    (err) => {
      console.error(`[QuestionFactory] Background job ${jobRecord.id} failed unhandled:`, err);
    }
  );

  return {
    jobId: jobRecord.id,
    sourceId: sourceRecord.id,
    courseId: newCourse.id,
    topicId: newTopic.id,
  };
}

/**
 * Asynchronous execution pipeline for a queued ingestion job.
 */
export async function runIngestionPipeline(
  jobId: string,
  sourceId: string,
  course: { id: string; code: string; title: string },
  topic: { id: string; name: string },
  sourceUrl: string
): Promise<void> {
  const startedAt = new Date();

  try {
    // Stage 1: Crawling & Extraction
    await db
      .update(ingestionJobs)
      .set({ status: "crawling", startedAt })
      .where(eq(ingestionJobs.id, jobId));

    const extraction = await extractAcademicContent({
      url: sourceUrl,
      fallbackToEducationalParser: true,
    });

    // Stage 2: Processing & Content Persistence
    await db
      .update(ingestionJobs)
      .set({ status: "processing" })
      .where(eq(ingestionJobs.id, jobId));

    await db
      .update(contentSources)
      .set({
        title: extraction.title || undefined,
        rawMarkdown: extraction.rawMarkdown,
        normalizedSections: extraction.sections.map((s) => ({
          heading: s.heading,
          markdownContent: s.markdownContent,
          wordCount: s.wordCount,
        })),
      })
      .where(eq(contentSources.id, sourceId));

    // Stage 3: Question Generation
    await db
      .update(ingestionJobs)
      .set({ status: "generating" })
      .where(eq(ingestionJobs.id, jobId));

    const draftQuestions = await generateGroundedQuestions({
      courseCode: course.code,
      courseTitle: course.title,
      topicName: topic.name,
      sourceTitle: extraction.title,
      sourceUrl,
      sections: extraction.sections,
      targetCount: 5,
    });

    if (draftQuestions.length === 0) {
      throw new Error("Question generator returned 0 questions from the extracted source.");
    }

    // Stage 4: Persist Questions and Options (Strictly approvalStatus = 'draft')
    for (const draft of draftQuestions) {
      const [insertedQuestion] = await db
        .insert(questions)
        .values({
          courseId: course.id,
          topicId: topic.id,
          sourceId,
          questionText: draft.questionText,
          difficulty: draft.difficulty,
          correctOptionKey: draft.correctOptionKey,
          explanation: draft.explanation,
          approvalStatus: "draft", // Strictly draft until administrator review
        })
        .returning({ id: questions.id });

      if (insertedQuestion) {
        const optionKeys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
        await db.insert(questionOptions).values(
          optionKeys.map((key) => ({
            questionId: insertedQuestion.id,
            optionKey: key,
            optionText: draft.options[key],
          }))
        );
      }
    }

    // Stage 5: Finalize Job as 'review_required'
    await db
      .update(ingestionJobs)
      .set({
        status: "review_required",
        questionsGeneratedCount: draftQuestions.length,
        completedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, jobId));
  } catch (pipelineErr) {
    const errorMsg =
      pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);

    console.error(`[QuestionFactory] Job ${jobId} failed:`, errorMsg);

    await db
      .update(ingestionJobs)
      .set({
        status: "failed",
        errorMessage: errorMsg.slice(0, 500),
        completedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, jobId));
  }
}
