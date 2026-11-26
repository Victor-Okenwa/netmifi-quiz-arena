import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "admin",
  "reviewer",
]);

export const battleStatusEnum = pgEnum("battle_status", [
  "WAITING",
  "READY",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const battleModeEnum = pgEnum("battle_mode", ["free", "reward"]);

export const questionDifficultyEnum = pgEnum("question_difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const questionApprovalStatusEnum = pgEnum("question_approval_status", [
  "draft",
  "approved",
  "rejected",
]);

export const optionKeyEnum = pgEnum("option_key", ["A", "B", "C", "D"]);

export const ingestionJobStatusEnum = pgEnum("ingestion_job_status", [
  "pending",
  "crawling",
  "processing",
  "generating",
  "review_required",
  "completed",
  "failed",
]);

export const audioAssetTypeEnum = pgEnum("audio_asset_type", [
  "question",
  "winner_announcement",
]);

export const audioGenerationStatusEnum = pgEnum("audio_generation_status", [
  "pending",
  "ready",
  "failed",
]);

export const rewardTxTypeEnum = pgEnum("reward_tx_type", [
  "deposit",
  "settle",
  "cancel",
  "refund",
]);

export const rewardTxStatusEnum = pgEnum("reward_tx_status", [
  "pending",
  "confirmed",
  "failed",
]);
