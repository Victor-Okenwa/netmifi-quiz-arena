/**
 * Shared domain types for Netmifi Quiz Arena.
 * Enforces the core product loop: BATTLE -> DIAGNOSIS -> PRACTICE -> REMATCH.
 */

export type BattleStatus =
  | "WAITING"
  | "READY"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type BattleMode = "free" | "reward";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type QuestionApprovalStatus = "draft" | "approved" | "rejected";

export type IngestionJobStatus =
  | "pending"
  | "crawling"
  | "processing"
  | "generating"
  | "review_required"
  | "completed"
  | "failed";

export type OptionKey = "A" | "B" | "C" | "D";

/**
 * Client-safe answer option sent during an active battle.
 * Never includes `isCorrect`.
 */
export interface PublicQuestionOption {
  id: string;
  key: OptionKey;
  text: string;
}

/**
 * Client-safe question payload delivered during an active battle.
 * Strictly omits `correctOptionKey` and `explanation` until submission closes.
 */
export interface PublicBattleQuestion {
  id: string;
  courseId: string;
  topicId: string;
  topicName: string;
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  difficulty: QuestionDifficulty;
  options: PublicQuestionOption[];
  audioUrl: string | null;
  timeLimitSeconds: number;
}

/**
 * Topic-level accuracy breakdown used in Post-Battle Diagnosis and Practice recommendations.
 */
export interface TopicPerformanceBreakdown {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
  needsPractice: boolean;
}

/**
 * Complete Post-Battle Diagnosis payload for a participant.
 */
export interface BattleDiagnosisSummary {
  battleId: string;
  userId: string;
  isWinner: boolean;
  isDraw: boolean;
  totalScore: number;
  opponentScore: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
  topicBreakdowns: TopicPerformanceBreakdown[];
  recommendedPracticeTopicIds: string[];
  winnerAnnouncementAudioUrl: string | null;
  settlementTxSignature: string | null;
}

/**
 * Supabase Realtime broadcast event union for battle rooms (`battle:<battleId>`).
 * Realtime notifies clients; PostgreSQL via Drizzle remains the source of truth.
 */
export type BattleRealtimeEvent =
  | {
      type: "player_joined";
      battleId: string;
      userId: string;
      displayName: string;
      timestamp: string;
    }
  | {
      type: "player_ready";
      battleId: string;
      userId: string;
      isReady: boolean;
      timestamp: string;
    }
  | {
      type: "battle_started";
      battleId: string;
      startedAt: string;
    }
  | {
      type: "participant_progress";
      battleId: string;
      userId: string;
      answeredCount: number;
      totalQuestions: number;
    }
  | {
      type: "battle_completed";
      battleId: string;
      winnerUserId: string | null;
      isDraw: boolean;
      completedAt: string;
    };
