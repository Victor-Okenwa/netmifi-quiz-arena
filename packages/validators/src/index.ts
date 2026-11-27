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

/** Number of lamports in one SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * The only stake amounts (in SOL) a Reward Battle may use. Reward Battles are
 * winner-takes-all: both players stake the same preset amount and the winner
 * receives the full pot (2 × stake).
 */
export const REWARD_STAKE_OPTIONS_SOL = [
  0.005, 0.1, 0.2, 0.3, 0.5, 0.7, 1,
] as const;

/** {@link REWARD_STAKE_OPTIONS_SOL} converted to integer lamports. */
export const REWARD_STAKE_OPTIONS_LAMPORTS: readonly number[] =
  REWARD_STAKE_OPTIONS_SOL.map((sol) => Math.round(sol * LAMPORTS_PER_SOL));

/**
 * Checks whether a lamport amount is one of the preset Reward Battle stakes.
 *
 * @param lamports - Candidate stake amount in lamports.
 * @returns `true` when the amount matches a preset stake option.
 */
export function isAllowedRewardStakeLamports(lamports: number): boolean {
  return REWARD_STAKE_OPTIONS_LAMPORTS.includes(lamports);
}

/**
 * Formats a lamport amount as a SOL string with at least 2 and at most 4
 * decimals, so small stakes like 0.005 SOL are not rounded to "0.01".
 *
 * @param lamports - Amount in lamports.
 * @returns Human-readable SOL amount without the unit (e.g. "0.005", "0.10", "1.00").
 * @example formatSol(5_000_000); // "0.005"
 */
export function formatSol(lamports: number): string {
  const fixed = (lamports / LAMPORTS_PER_SOL).toFixed(4);
  // Trim trailing zeros but always keep two decimals ("0.1000" -> "0.10").
  return fixed.replace(/(\.\d{2}\d*?)0+$/, "$1");
}

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
    (data) =>
      data.mode === "reward"
        ? isAllowedRewardStakeLamports(data.stakeAmountLamports)
        : data.stakeAmountLamports === 0,
    {
      message: `Reward battles must use one of the preset stakes (${REWARD_STAKE_OPTIONS_SOL.join(", ")} SOL); free battles must have zero stake.`,
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
  courseCode: z
    .string()
    .trim()
    .min(3, "Course code must be at least 3 characters (e.g. SOL 101)")
    .max(12, "Course code cannot exceed 12 characters")
    .regex(
      /^[A-Za-z]{2,5}\s*\d{2,4}[A-Za-z]?$/,
      "Format must be like SOL 101, WEB 301, or AI 401"
    ),
  courseTitle: z.string().trim().min(3).max(120),
  topicName: z.string().trim().min(2).max(100),
  academicLevel: z
    .enum(["100L", "200L", "300L", "400L", "500L"])
    .default("200L"),
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
  questionId: z.string().uuid("Invalid question ID").optional(),
  action: z.enum(["approve", "reject"]),
  questionText: z.string().trim().min(10).max(1000).optional(),
  explanation: z.string().trim().min(10).max(2000).optional(),
  difficulty: questionDifficultySchema.optional(),
  correctOptionKey: optionKeySchema.optional(),
  options: z
    .object({
      A: z.string().trim().min(1).max(500).optional(),
      B: z.string().trim().min(1).max(500).optional(),
      C: z.string().trim().min(1).max(500).optional(),
      D: z.string().trim().min(1).max(500).optional(),
    })
    .optional(),
});

export const walletLinkVerifySchema = z.object({
  walletAddress: z.string().trim().min(32).max(44),
  nonce: z.string().trim().min(16).max(128),
  signatureBase64: z.string().trim().min(32),
});

export const academicLevelSchema = z.enum(["100L", "200L", "300L", "400L", "500L"]);

export const registerStudentSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(80, "Display name must be at most 80 characters"),
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const loginStudentSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const academicOnboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(80, "Display name must be at most 80 characters"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores"
    ),
  universityId: z.string().uuid("Please select your university"),
  departmentId: z.string().uuid("Please select your department"),
  academicLevel: academicLevelSchema.default("200L"),
  avatarNumber: z.number().int().min(1).max(5).default(1),
});

export type CreateBattleInput = z.infer<typeof createBattleSchema>;
export type JoinBattleInput = z.infer<typeof joinBattleSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type IngestSourceUrlInput = z.infer<typeof ingestSourceUrlSchema>;
export type QuestionDraftReviewInput = z.infer<typeof questionDraftReviewSchema>;
export type WalletLinkVerifyInput = z.infer<typeof walletLinkVerifySchema>;
export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
export type SignInStudentInput = z.infer<typeof loginStudentSchema>;
export type AcademicOnboardingInput = z.infer<typeof academicOnboardingSchema>;
