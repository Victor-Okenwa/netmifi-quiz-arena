CREATE TYPE "public"."audio_asset_type" AS ENUM('question', 'winner_announcement');--> statement-breakpoint
CREATE TYPE "public"."audio_generation_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."battle_mode" AS ENUM('free', 'reward');--> statement-breakpoint
CREATE TYPE "public"."battle_status" AS ENUM('WAITING', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_job_status" AS ENUM('pending', 'crawling', 'processing', 'generating', 'review_required', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."option_key" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."question_approval_status" AS ENUM('draft', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."question_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."reward_tx_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reward_tx_type" AS ENUM('deposit', 'settle', 'cancel', 'refund');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin', 'reviewer');--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"academic_level" text DEFAULT '200L' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"university_id" uuid,
	"department_id" uuid,
	"academic_level" text DEFAULT '200L',
	"xp" integer DEFAULT 0 NOT NULL,
	"battles_played" integer DEFAULT 0 NOT NULL,
	"battles_won" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"order_index" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_code" text NOT NULL,
	"country" text DEFAULT 'Nigeria' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" "audio_asset_type" NOT NULL,
	"content_hash" text NOT NULL,
	"voice_id" text NOT NULL,
	"model_id" text DEFAULT 'eleven_multilingual_v2' NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"duration_ms" integer,
	"status" "audio_generation_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"raw_markdown" text,
	"normalized_sections" jsonb,
	"license_notes" text,
	"submitted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "ingestion_job_status" DEFAULT 'pending' NOT NULL,
	"questions_generated_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_key" "option_key" NOT NULL,
	"option_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"source_id" uuid,
	"question_text" text NOT NULL,
	"difficulty" "question_difficulty" DEFAULT 'medium' NOT NULL,
	"correct_option_key" "option_key" NOT NULL,
	"explanation" text NOT NULL,
	"approval_status" "question_approval_status" DEFAULT 'draft' NOT NULL,
	"audio_asset_id" uuid,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_key" "option_key" NOT NULL,
	"is_correct" boolean NOT NULL,
	"response_time_ms" integer NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"correct_answers_count" integer DEFAULT 0 NOT NULL,
	"total_response_time_ms" integer DEFAULT 0 NOT NULL,
	"deposit_confirmed" boolean DEFAULT false NOT NULL,
	"deposit_tx_signature" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "battle_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"time_limit_seconds" integer DEFAULT 15 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"winner_user_id" uuid,
	"is_draw" boolean DEFAULT false NOT NULL,
	"creator_score" integer DEFAULT 0 NOT NULL,
	"opponent_score" integer DEFAULT 0 NOT NULL,
	"participant_diagnoses" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_code" text NOT NULL,
	"course_id" uuid NOT NULL,
	"topic_id" uuid,
	"creator_user_id" uuid NOT NULL,
	"status" "battle_status" DEFAULT 'WAITING' NOT NULL,
	"mode" "battle_mode" DEFAULT 'free' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"time_per_question_seconds" integer DEFAULT 15 NOT NULL,
	"stake_amount_lamports" bigint DEFAULT 0 NOT NULL,
	"token_mint_address" text,
	"on_chain_battle_pda" text,
	"winner_user_id" uuid,
	"is_draw" boolean DEFAULT false NOT NULL,
	"winner_announcement_audio_id" uuid,
	"settlement_tx_signature" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"user_id" uuid,
	"wallet_address" text NOT NULL,
	"tx_type" "reward_tx_type" NOT NULL,
	"tx_signature" text NOT NULL,
	"amount_lamports" bigint NOT NULL,
	"status" "reward_tx_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"nonce" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_sources" ADD CONSTRAINT "content_sources_submitted_by_user_id_profiles_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_user_id_profiles_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_submissions" ADD CONSTRAINT "answer_submissions_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_submissions" ADD CONSTRAINT "answer_submissions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_submissions" ADD CONSTRAINT "answer_submissions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_questions" ADD CONSTRAINT "battle_questions_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_questions" ADD CONSTRAINT "battle_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_results" ADD CONSTRAINT "battle_results_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_results" ADD CONSTRAINT "battle_results_winner_user_id_profiles_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_creator_user_id_profiles_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_user_id_profiles_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_announcement_audio_id_audio_assets_id_fk" FOREIGN KEY ("winner_announcement_audio_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_battle_id_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_links" ADD CONSTRAINT "wallet_links_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_nonces" ADD CONSTRAINT "wallet_nonces_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_idx" ON "courses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "courses_department_id_idx" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "departments_university_id_idx" ON "departments" USING btree ("university_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_uni_code_idx" ON "departments" USING btree ("university_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profiles_university_id_idx" ON "profiles" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "profiles_xp_idx" ON "profiles" USING btree ("xp");--> statement-breakpoint
CREATE INDEX "topics_course_id_idx" ON "topics" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_course_slug_idx" ON "topics" USING btree ("course_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "universities_short_code_idx" ON "universities" USING btree ("short_code");--> statement-breakpoint
CREATE UNIQUE INDEX "audio_assets_content_hash_idx" ON "audio_assets" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "content_sources_course_topic_idx" ON "content_sources" USING btree ("course_id","topic_id");--> statement-breakpoint
CREATE INDEX "ingestion_jobs_source_id_idx" ON "ingestion_jobs" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "ingestion_jobs_status_idx" ON "ingestion_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "question_options_question_id_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_question_key_idx" ON "question_options" USING btree ("question_id","option_key");--> statement-breakpoint
CREATE INDEX "questions_course_topic_status_idx" ON "questions" USING btree ("course_id","topic_id","approval_status");--> statement-breakpoint
CREATE INDEX "questions_approval_status_idx" ON "questions" USING btree ("approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "answer_submissions_battle_user_question_idx" ON "answer_submissions" USING btree ("battle_id","user_id","question_id");--> statement-breakpoint
CREATE INDEX "answer_submissions_battle_user_idx" ON "answer_submissions" USING btree ("battle_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_participants_battle_user_idx" ON "battle_participants" USING btree ("battle_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_participants_battle_slot_idx" ON "battle_participants" USING btree ("battle_id","slot_index");--> statement-breakpoint
CREATE INDEX "battle_participants_user_id_idx" ON "battle_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_questions_battle_question_idx" ON "battle_questions" USING btree ("battle_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_questions_battle_order_idx" ON "battle_questions" USING btree ("battle_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "battle_results_battle_id_idx" ON "battle_results" USING btree ("battle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "battles_invite_code_idx" ON "battles" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "battles_status_mode_idx" ON "battles" USING btree ("status","mode");--> statement-breakpoint
CREATE INDEX "battles_course_topic_idx" ON "battles" USING btree ("course_id","topic_id");--> statement-breakpoint
CREATE INDEX "battles_creator_user_id_idx" ON "battles" USING btree ("creator_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_transactions_tx_signature_idx" ON "reward_transactions" USING btree ("tx_signature");--> statement-breakpoint
CREATE INDEX "reward_transactions_battle_id_idx" ON "reward_transactions" USING btree ("battle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_links_user_id_idx" ON "wallet_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_links_wallet_address_idx" ON "wallet_links" USING btree ("wallet_address");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_nonces_nonce_idx" ON "wallet_nonces" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "wallet_nonces_user_id_idx" ON "wallet_nonces" USING btree ("user_id");