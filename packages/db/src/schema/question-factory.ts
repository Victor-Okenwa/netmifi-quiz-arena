import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { courses, profiles, topics } from "./academic";
import {
  audioAssetTypeEnum,
  audioGenerationStatusEnum,
  ingestionJobStatusEnum,
  optionKeyEnum,
  questionApprovalStatusEnum,
  questionDifficultyEnum,
} from "./enums";

export interface NormalizedSectionRecord {
  heading: string;
  markdownContent: string;
  wordCount: number;
}

export const contentSources = pgTable(
  "content_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    rawMarkdown: text("raw_markdown"),
    normalizedSections: jsonb("normalized_sections").$type<
      NormalizedSectionRecord[]
    >(),
    licenseNotes: text("license_notes"),
    submittedByUserId: uuid("submitted_by_user_id").references(
      () => profiles.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("content_sources_course_topic_idx").on(table.courseId, table.topicId),
  ]
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => contentSources.id, { onDelete: "cascade" }),
    status: ingestionJobStatusEnum("status").notNull().default("pending"),
    questionsGeneratedCount: integer("questions_generated_count")
      .notNull()
      .default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ingestion_jobs_source_id_idx").on(table.sourceId),
    index("ingestion_jobs_status_idx").on(table.status),
  ]
);

/**
 * Metadata for ElevenLabs TTS audio cached in Supabase Storage.
 * Keyed by `contentHash` = sha256(normalizedText + voiceId + modelId) to prevent duplicate generation.
 */
export const audioAssets = pgTable(
  "audio_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetType: audioAssetTypeEnum("asset_type").notNull(),
    contentHash: text("content_hash").notNull(),
    voiceId: text("voice_id").notNull(),
    modelId: text("model_id").notNull().default("eleven_multilingual_v2"),
    storagePath: text("storage_path").notNull(),
    publicUrl: text("public_url").notNull(),
    durationMs: integer("duration_ms"),
    status: audioGenerationStatusEnum("status").notNull().default("ready"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("audio_assets_content_hash_idx").on(table.contentHash)]
);

/**
 * Academic questions.
 * SECURITY: `correctOptionKey` and `explanation` must NEVER be sent to the client during an active battle.
 */
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => contentSources.id, {
      onDelete: "set null",
    }),
    questionText: text("question_text").notNull(),
    difficulty: questionDifficultyEnum("difficulty")
      .notNull()
      .default("medium"),
    correctOptionKey: optionKeyEnum("correct_option_key").notNull(),
    explanation: text("explanation").notNull(),
    approvalStatus: questionApprovalStatusEnum("approval_status")
      .notNull()
      .default("draft"),
    audioAssetId: uuid("audio_asset_id").references(() => audioAssets.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(
      () => profiles.id,
      { onDelete: "set null" }
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("questions_course_topic_status_idx").on(
      table.courseId,
      table.topicId,
      table.approvalStatus
    ),
    index("questions_approval_status_idx").on(table.approvalStatus),
  ]
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionKey: optionKeyEnum("option_key").notNull(),
    optionText: text("option_text").notNull(),
  },
  (table) => [
    index("question_options_question_id_idx").on(table.questionId),
    uniqueIndex("question_options_question_key_idx").on(
      table.questionId,
      table.optionKey
    ),
  ]
);
