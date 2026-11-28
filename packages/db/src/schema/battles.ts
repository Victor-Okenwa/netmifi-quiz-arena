import {
  bigint,
  boolean,
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
import { battleModeEnum, battleStatusEnum, optionKeyEnum } from "./enums";
import { audioAssets, questions } from "./question-factory";

export interface StoredTopicBreakdown {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
  needsPractice: boolean;
}

export interface StoredParticipantDiagnosis {
  userId: string;
  accuracyPercent: number;
  averageResponseTimeMs: number;
  topicBreakdowns: StoredTopicBreakdown[];
  recommendedPracticeTopicIds: string[];
}

export const battles = pgTable(
  "battles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inviteCode: text("invite_code").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    creatorUserId: uuid("creator_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: battleStatusEnum("status").notNull().default("WAITING"),
    mode: battleModeEnum("mode").notNull().default("free"),
    isPrivate: boolean("is_private").notNull().default(false),
    questionCount: integer("question_count").notNull().default(5),
    timePerQuestionSeconds: integer("time_per_question_seconds")
      .notNull()
      .default(15),
    stakeAmountLamports: bigint("stake_amount_lamports", { mode: "number" })
      .notNull()
      .default(0),
    tokenMintAddress: text("token_mint_address"),
    onChainBattlePda: text("on_chain_battle_pda"),
    winnerUserId: uuid("winner_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    isDraw: boolean("is_draw").notNull().default(false),
    winnerAnnouncementAudioId: uuid("winner_announcement_audio_id").references(
      () => audioAssets.id,
      { onDelete: "set null" },
    ),
    settlementTxSignature: text("settlement_tx_signature"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("battles_invite_code_idx").on(table.inviteCode),
    index("battles_status_mode_idx").on(table.status, table.mode),
    index("battles_course_topic_idx").on(table.courseId, table.topicId),
    index("battles_creator_user_id_idx").on(table.creatorUserId),
  ],
);

export const battleParticipants = pgTable(
  "battle_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    isReady: boolean("is_ready").notNull().default(false),
    score: integer("score").notNull().default(0),
    correctAnswersCount: integer("correct_answers_count").notNull().default(0),
    totalResponseTimeMs: integer("total_response_time_ms").notNull().default(0),
    depositConfirmed: boolean("deposit_confirmed").notNull().default(false),
    depositTxSignature: text("deposit_tx_signature"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("battle_participants_battle_user_idx").on(
      table.battleId,
      table.userId,
    ),
    uniqueIndex("battle_participants_battle_slot_idx").on(
      table.battleId,
      table.slotIndex,
    ),
    index("battle_participants_user_id_idx").on(table.userId),
  ],
);

export const battleQuestions = pgTable(
  "battle_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull(),
    timeLimitSeconds: integer("time_limit_seconds").notNull().default(15),
  },
  (table) => [
    uniqueIndex("battle_questions_battle_question_idx").on(
      table.battleId,
      table.questionId,
    ),
    uniqueIndex("battle_questions_battle_order_idx").on(
      table.battleId,
      table.orderIndex,
    ),
  ],
);

/**
 * Atomic answer submissions.
 * Unique constraint `(battle_id, user_id, question_id)` prevents duplicate submission exploits.
 */
export const answerSubmissions = pgTable(
  "answer_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    selectedOptionKey: optionKeyEnum("selected_option_key").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    responseTimeMs: integer("response_time_ms").notNull(),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("answer_submissions_battle_user_question_idx").on(
      table.battleId,
      table.userId,
      table.questionId,
    ),
    index("answer_submissions_battle_user_idx").on(
      table.battleId,
      table.userId,
    ),
  ],
);

export const battleResults = pgTable(
  "battle_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    battleId: uuid("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    winnerUserId: uuid("winner_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    isDraw: boolean("is_draw").notNull().default(false),
    creatorScore: integer("creator_score").notNull().default(0),
    opponentScore: integer("opponent_score").notNull().default(0),
    participantDiagnoses: jsonb("participant_diagnoses")
      .$type<Record<string, StoredParticipantDiagnosis>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("battle_results_battle_id_idx").on(table.battleId)],
);
