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
  topics,
} from "@repo/db";
import { extractAcademicContent } from "@repo/firecrawl";
import { generateGroundedQuestions } from "./generator";

export interface CreateIngestionJobParams {
  courseId: string;
  topicId: string;
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
 */
export async function createAndRunIngestionJob(
  params: CreateIngestionJobParams
): Promise<{ jobId: string; sourceId: string }> {
  // 1. Verify course and topic existence
  const [course] = await db
    .select({ id: courses.id, code: courses.code, title: courses.title })
    .from(courses)
    .where(eq(courses.id, params.courseId))
    .limit(1);

  if (!course) {
    throw new Error(`Course with ID ${params.courseId} not found.`);
  }

  const [topic] = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(eq(topics.id, params.topicId))
    .limit(1);

  if (!topic) {
    throw new Error(`Topic with ID ${params.topicId} not found.`);
  }

  // 2. Insert content source record
  const [sourceRecord] = await db
    .insert(contentSources)
    .values({
      courseId: params.courseId,
      topicId: params.topicId,
      title: params.sourceTitle.trim(),
      sourceUrl: params.sourceUrl.trim(),
      submittedByUserId: params.submittedByUserId ?? null,
    })
    .returning({ id: contentSources.id });

  if (!sourceRecord) {
    throw new Error("Failed to create content source record in database.");
  }

  // 3. Insert initial ingestion job
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

  // 4. Trigger asynchronous processing without blocking the initial HTTP response
  runIngestionPipeline(jobRecord.id, sourceRecord.id, course, topic, params.sourceUrl).catch(
    (err) => {
      console.error(`[QuestionFactory] Background job ${jobRecord.id} failed unhandled:`, err);
    }
  );

  return {
    jobId: jobRecord.id,
    sourceId: sourceRecord.id,
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
