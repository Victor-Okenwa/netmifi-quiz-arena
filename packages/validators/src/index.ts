import { z } from "zod";

/**
 * Private/loopback IPv4 & hostname patterns blocked for SSRF protection on Firecrawl ingestion.
 */
const BLOCKED_SSRF_HOSTS =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

/**
 * Validates whether a URL string is a safe public HTTPS URL suitable for Firecrawl extraction.
 */
export function isSafeIngestionUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") {
      return false;
    }
    if (BLOCKED_SSRF_HOSTS.test(parsed.hostname)) {
      return false;
    }
    if (parsed.hostname.endsWith(".local") || parsed.hostname.endsWith(".internal")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const optionKeySchema = z.enum(["A", "B", "C", "D"]);

export const battleModeSchema = z.enum(["free", "reward"]);

export const questionDifficultySchema = z.enum(["easy", "medium", "hard"]);

export const createBattleSchema = z
  .object({
    courseId: z.string().uuid("Invalid course ID"),
    topicId: z.string().uuid("Invalid topic ID").optional(),
    mode: battleModeSchema.default("free"),
    questionCount: z.number().int().min(3).max(20).default(10),
    timePerQuestionSeconds: z.number().int().min(10).max(60).default(15),
    isPrivate: z.boolean().default(false),
    stakeAmountLamports: z.number().int().nonnegative().default(0),
  })
  .refine(
    (data) => (data.mode === "reward" ? data.stakeAmountLamports > 0 : data.stakeAmountLamports === 0),
    {
      message: "Reward battles require a positive stake amount; free battles must have zero stake.",
      path: ["stakeAmountLamports"],
    }
  );

export const joinBattleSchema = z.object({
  battleId: z.string().uuid("Invalid battle ID"),
  inviteCode: z.string().trim().min(4).max(16).optional(),
  depositTxSignature: z.string().trim().min(32).max(128).optional(),
});

export const submitAnswerSchema = z.object({
  battleId: z.string().uuid("Invalid battle ID"),
  questionId: z.string().uuid("Invalid question ID"),
  selectedOptionKey: optionKeySchema,
  clientElapsedMs: z.number().int().nonnegative().max(120_000).optional(),
});

export const ingestSourceUrlSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  topicId: z.string().uuid("Invalid topic ID"),
  sourceTitle: z.string().trim().min(3).max(200),
  sourceUrl: z
    .string()
    .url("Must be a valid URL")
    .refine(isSafeIngestionUrl, {
      message: "URL must use HTTPS and point to a public, non-private host.",
    }),
  maxPages: z.number().int().min(1).max(10).default(1),
});

export const questionDraftReviewSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  action: z.enum(["approve", "reject"]),
  questionText: z.string().trim().min(10).max(1000).optional(),
  explanation: z.string().trim().min(10).max(2000).optional(),
  difficulty: questionDifficultySchema.optional(),
  correctOptionKey: optionKeySchema.optional(),
});

export const walletLinkVerifySchema = z.object({
  walletAddress: z.string().trim().min(32).max(44),
  nonce: z.string().trim().min(16).max(128),
  signatureBase64: z.string().trim().min(32),
});

export type CreateBattleInput = z.infer<typeof createBattleSchema>;
export type JoinBattleInput = z.infer<typeof joinBattleSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type IngestSourceUrlInput = z.infer<typeof ingestSourceUrlSchema>;
export type QuestionDraftReviewInput = z.infer<typeof questionDraftReviewSchema>;
export type WalletLinkVerifyInput = z.infer<typeof walletLinkVerifySchema>;
