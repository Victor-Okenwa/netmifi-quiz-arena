# Netmifi Quiz Arena — Sequential Development Milestones

> **Purpose of this Document**  
> This file is our living roadmap and persistent progress memory for building **Netmifi Quiz Arena** (Dev3pack Solana Hackathon).  
> We build **strictly one milestone at a time**. Before starting any implementation work, check the **Milestone Status Dashboard** below to see where we are, confirm the active milestone with the team, and update checklists and status markers (`COMPLETED`, `IN PROGRESS`, `NEXT UP`, `PENDING`) as each goal is verified.

---

## 📊 Milestone Status Dashboard

| # | Milestone | Key Workspace Areas | Status |
|---|---|---|---|
| **M0** | Foundation, Brand Identity & Persistent Engineering Rules | `apps/web`, `AGENTS.md` | ✅ **COMPLETED** |
| **M1** | Monorepo Plumbing, Shared Packages & Environment Config | `package.json`, `packages/*`, `.env.example` | ⏳ **NEXT UP** |
| **M2** | Local Docker PostgreSQL & Drizzle Database Architecture | `infrastructure/docker`, `packages/db` | ⬜ **PENDING** |
| **M3** | Student Authentication & Academic Onboarding (Supabase Auth) | `apps/web`, `packages/db` | ⬜ **PENDING** |
| **M4** | Academic Catalog, Dashboard & Arena Lobby UI | `apps/web` | ⬜ **PENDING** |
| **M5** | Core Battle Engine & Real-Time Multiplayer Sync | `apps/web`, `packages/db` | ⬜ **PENDING** |
| **M6** | Post-Battle Diagnosis, Targeted Practice & Rematch Loop | `apps/web`, `packages/db` | ⬜ **PENDING** |
| **M7** | ElevenLabs Voice-Enabled Quiz & Winner Announcements | `packages/integrations/elevenlabs`, `apps/web` | ⬜ **PENDING** |
| **M8** | Firecrawl Question Factory & Human Review Pipeline | `packages/integrations/firecrawl`, `apps/web` | ⬜ **PENDING** |
| **M9** | Solana Anchor Reward Escrow Program (Devnet) | `programs/`, `packages/solana` | ⬜ **PENDING** |
| **M10** | Wallet Linking & End-to-End Reward Battle Settlement | `packages/solana`, `apps/web` | ⬜ **PENDING** |
| **M11** | End-to-End QA, Devnet/Vercel Deployment & Hackathon Demo | Entire Monorepo | ⬜ **PENDING** |

---

## Milestone 0: Foundation, Brand Identity & Persistent Engineering Rules
**Status:** ✅ **COMPLETED**

### Goal
Establish the monorepo foundation, port the official NetMifi brand identity and design tokens into `apps/web`, ensure `packages/ui` remains unused/empty, and persist the 8 engineering rule categories across the workspace.

### Completed Deliverables
- [x] Initialized `netmifi-quiz-arena` with Bun (`1.3.2`) and Turborepo (`^2.11.13`).
- [x] Migrated official NetMifi `favicon.ico`, `LogoIcon`, `MascotIcon`, and local `Lexend` (`--font-sans`) + `Orbitron` (`--font-game`) fonts into `apps/web`.
- [x] Configured Tailwind CSS v4 with NetMifi `oklch` light/dark color tokens and shadcn/ui in `apps/web` (`components.json`, `lib/utils.ts`, core UI primitives).
- [x] Emptied `packages/ui/src` so all design and UI components live exclusively in `apps/web`.
- [x] Created hierarchical `AGENTS.md` files covering all 8 required rule categories (Root, `apps/web`, `programs`, `packages/solana`, `packages/db`, `packages/integrations`).

---

## Milestone 1: Monorepo Plumbing, Shared Packages & Environment Config
**Status:** ⏳ **NEXT UP**

### Goal
Wire up the empty workspace package directories (`packages/db`, `packages/types`, `packages/validators`, `packages/solana`, `packages/integrations/firecrawl`, `packages/integrations/elevenlabs`) with clean TypeScript/Bun configurations and establish type-safe environment variable validation before writing domain code.

### Scope & Deliverables
- [ ] **Workspace Discovery & TypeScript Alignment**:
  - Update root `package.json` `"workspaces"` array to include nested integrations (`["apps/*", "packages/*", "packages/integrations/*"]`) or unify package exports cleanly.
  - Align TypeScript versions across root and workspace packages so `bun run check-types` runs without version drift.
  - Decide whether to remove or ignore the unused boilerplate `apps/docs` app so builds focus on `apps/web` and shared packages.
- [ ] **Initialize Shared Package Manifests (`package.json`, `tsconfig.json`, `src/index.ts`)**:
  - `@repo/types` (`packages/types`): Shared domain interfaces (battle states, diagnosis models, question DTOs, realtime event payloads).
  - `@repo/validators` (`packages/validators`): Shared Zod schemas for API inputs, battle configuration, answer submission, URL ingestion, and env validation.
  - `@repo/db` (`packages/db`): Package skeleton ready for Drizzle ORM and `postgres` driver.
  - `@repo/solana` (`packages/solana`): Package skeleton ready for Anchor IDL and Solana web3 client helpers.
  - `@repo/firecrawl` & `@repo/elevenlabs` (`packages/integrations/*`): Server-only integration package skeletons.
- [ ] **Environment Variable Templates & Validation**:
  - Create root `.env.example` documenting all required variables (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID`, `FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`).
  - Create server/client environment validation helper so missing or misconfigured variables fail fast with clear error messages.

### Acceptance Criteria
- `bun install` and `bun run check-types` succeed across the entire monorepo with 0 errors.
- `apps/web` can import types and Zod schemas from `@repo/types` and `@repo/validators`.

---

## Milestone 2: Local Docker PostgreSQL & Drizzle Database Architecture
**Status:** ⬜ **PENDING**

### Goal
Stand up the local Docker PostgreSQL environment and implement the complete, production-ready Drizzle ORM relational schema, migration workflow, and academic seed data in `packages/db`.

### Scope & Deliverables
- [ ] **Local Docker PostgreSQL (`infrastructure/docker/docker-compose.yml`)**:
  - Configure PostgreSQL 16+ container with persistent named volume, healthcheck, local port binding (`127.0.0.1:5432:5432`), and environment-driven credentials matching `.env.example`.
- [ ] **Drizzle Client & Config (`packages/db`)**:
  - Configure `packages/db/drizzle.config.ts`.
  - Implement singleton database connection in `packages/db/src/client.ts` compatible with both local Docker PostgreSQL and production Supabase PostgreSQL connection pooling.
- [ ] **Complete Relational Schema (`packages/db/src/schema/`)**:
  - **Identity & Academic Hierarchy**:
    - `profiles` (linked to Supabase Auth `user.id`, display name, avatar, university/department references, XP, rating).
    - `universities`, `departments`, `courses`, `topics` (structured academic catalog for Nigerian universities).
  - **Question Factory & Voice Assets**:
    - `content_sources` (submitted URL, title, university/course/topic metadata, permissions, submitted by).
    - `ingestion_jobs` (status enum: `pending`, `crawling`, `processing`, `generating`, `review_required`, `completed`, `failed`, error logs, timestamps).
    - `questions` (course/topic foreign keys, question text, difficulty, explanation, approval status `draft | approved | rejected`, source attribution, reviewer metadata).
    - `question_options` (options A–D, `is_correct` server-only boolean or structured JSONB options with server-only answer key).
    - `audio_assets` (question/battle reference, Supabase Storage path, voice ID, content SHA-256 hash, duration, status).
  - **Battle Engine & Learning Loop**:
    - `battles` (status enum: `WAITING`, `READY`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED`; mode `free | reward`; course/topic IDs; question count; time per question; stake amount; on-chain battle PDA address).
    - `battle_participants` (unique `(battle_id, user_id)`, ready state, current score, total time ms, deposit tx signature).
    - `battle_questions` (ordered question set assigned to a battle).
    - `answer_submissions` (unique `(battle_id, user_id, question_id)`, selected option, `is_correct`, response time ms, awarded points, submitted at).
    - `battle_results` & `topic_performance` (winner user ID, draw flag, per-topic accuracy breakdown, recommended practice topic IDs, winner announcement audio reference).
  - **Solana Wallet & Escrow Tracking**:
    - `wallet_links` (unique `user_id` and unique `wallet_address`, verified timestamp) & `wallet_nonces` (expiring challenge nonces).
    - `reward_transactions` (battle ID, tx type `deposit | settle | cancel | refund`, tx signature, amount, status).
- [ ] **Migrations & Academic Seed Script (`db:generate`, `db:push`, `db:seed`)**:
  - Seed script populating starter Nigerian universities (e.g., UNILAG, UI, OAU, UNN, FUTO, ABU), Computer Science / Engineering / Science courses, core topics (e.g., Data Structures & Algorithms, Database Systems, Operating Systems), and a curated set of approved multiple-choice questions for immediate battle testing.

### Acceptance Criteria
- Docker PostgreSQL container starts cleanly and passes healthchecks.
- Drizzle migrations push/apply cleanly and `bun run db:seed` populates the academic catalog and starter question bank idempotently.

---

## Milestone 3: Student Authentication & Academic Onboarding (Supabase Auth)
**Status:** ⬜ **PENDING**

### Goal
Enable students to register, log in, and set up their academic profile (University, Department, Courses) using **Supabase Auth** and **Drizzle**, with zero cryptocurrency wallet requirement.

### Scope & Deliverables
- [ ] **Supabase Auth Integration (`apps/web/lib/supabase/`)**:
  - Server client (`server.ts`), browser client (`client.ts`), and Next.js middleware for session refresh using `@supabase/ssr`.
  - Server-side authentication guard (`requireAuthUser()`) that calls `supabase.auth.getUser()` and loads/syncs the student's Drizzle `profile`.
- [ ] **Auth Pages & Flows (`apps/web/app/(auth)/`)**:
  - Registration (`/register`), Login (`/login`), and Auth Callback (`/auth/callback`) supporting Email/Password (and Google OAuth when configured).
- [ ] **Academic Onboarding Flow (`/onboarding`)**:
  - Step-by-step selection of the student's University, Department, Academic Level, and primary Courses.
  - Persists profile to PostgreSQL via Drizzle and redirects to the Arena Dashboard.

### Acceptance Criteria
- A new student can sign up with email/password, complete academic onboarding without connecting a wallet, and have their profile persisted in PostgreSQL.
- Unauthenticated requests to protected routes or API endpoints are rejected on the server.

---

## Milestone 4: Academic Catalog, Student Dashboard & Arena Lobby UI
**Status:** ⬜ **PENDING**

### Goal
Build the primary student-facing Arena Dashboard, Course/Topic Explorer, and Battle Creation / Matchmaking Lobby in `apps/web` using the NetMifi design system.

### Scope & Deliverables
- [ ] **Arena Dashboard (`/dashboard` or `/arena`)**:
  - Displays student's academic profile, XP, win/loss record, recent battle diagnoses, and recommended practice topics.
  - Lists open challenges in the student's courses and a quick-join invite code input.
- [ ] **Course & Topic Battle Configurator (`/arena/new`)**:
  - Filter by University Course and specific Topic(s).
  - Select Battle Mode: **Free Academic Battle** (default, no wallet needed) or **Reward Battle** (shows wallet requirement badge).
  - Configure question count (e.g., 5 or 10 questions), timer per question (e.g., 15s / 20s), and visibility (Open Matchmaking vs. Private Friend Challenge Link/Code).
- [ ] **Leaderboard View (`/leaderboard`)**:
  - Course-specific and university-wide XP and accuracy rankings.

### Acceptance Criteria
- Authenticated students can browse courses/topics, configure a new battle, generate a shareable challenge code/link, and view open battles in the lobby.

---

## Milestone 5: Core Battle Engine & Real-Time Multiplayer Synchronization
**Status:** ⬜ **PENDING**

### Goal
Implement the server-authoritative quiz battle engine and real-time multiplayer synchronization using **Drizzle transactions** (source of truth) and **Supabase Realtime** (event broadcast & presence).

### Scope & Deliverables
- [ ] **Server-Authoritative Battle Service (`apps/web/lib/battle-engine/`)**:
  - Strict state machine transitions: `WAITING → READY → ACTIVE → COMPLETED` (plus `CANCELLED` and `EXPIRED`).
  - `createBattle`: Validates course/topic availability, selects balanced approved questions of comparable difficulty, creates battle record.
  - `joinBattle` & `setPlayerReady`: Enforces participant limits (1v1), records join in a database transaction, and transitions battle to `READY` / `ACTIVE` when both players are ready.
  - `getSanitizedBattleState`: Returns current question text, options, timer metadata, and participant progress—**strictly stripping `correctAnswer` and `explanation`**.
  - `submitAnswer`: Server validates participant membership, active battle status, question deadline (with grace window), and duplicate submission constraint `(battle_id, user_id, question_id)`. Computes correctness and speed-adjusted score server-side.
  - `finalizeBattle`: Triggered when both participants complete all questions or timer expires; atomically computes winner/draw, updates XP, and records `battle_results`.
- [ ] **Supabase Realtime Multiplayer Sync**:
  - Room channel (`battle:<battleId>`) broadcasting `player_joined`, `player_ready`, `battle_started`, `opponent_answered` (progress indicator only, never the chosen option), and `battle_completed`.
  - Automatic authoritative state re-fetch on reconnect or page reload.
- [ ] **Live Battle Arena Room UI (`/arena/battle/[battleId]`)**:
  - Pre-battle Waiting/Ready Lobby with opponent presence indicator and shareable invite code.
  - Active Question Arena with synchronized countdown bar, interactive option cards, opponent progress badge, and instant transition to the final result screen upon completion.

### Acceptance Criteria
- Two students in separate browser sessions can create/join a battle, ready up, answer timed questions simultaneously with real-time progress updates, and reach a server-verified winner announcement without any answer key exposure in network payloads.

---

## Milestone 6: Post-Battle Diagnosis, Targeted Practice & Rematch Loop
**Status:** ⬜ **PENDING**

### Goal
Complete the core product loop (**`BATTLE → DIAGNOSIS → PRACTICE → REMATCH`**) so every battle turns competition into measurable academic improvement.

### Scope & Deliverables
- [ ] **Post-Battle Diagnosis Engine & UI (`/arena/battle/[battleId]/results`)**:
  - **Winner & Score Summary**: Final scores, accuracy percentage, and average response time comparison.
  - **Topic-by-Topic Breakdown**: Visual accuracy cards per topic (e.g., *Arrays: 100% Strong*, *Recursion: 25% Needs Practice*).
  - **Question Review Accordion**: Every battle question with the student's selected answer, the verified correct answer, and the full academic explanation.
- [ ] **Targeted Practice Mode (`/arena/practice`)**:
  - Automatically generates a personalized practice drill targeting the weak topic(s) identified in the battle diagnosis.
  - Immediate explanation feedback after each practice question and tracking of accuracy improvement.
- [ ] **One-Click Rematch Flow**:
  - "Challenge Opponent to Rematch" button on the diagnosis/practice completion screen that spawns a new battle in the same course/topic and notifies the opponent via Supabase Realtime.

### Acceptance Criteria
- After completing a battle, both the winner and loser see their topic-level diagnosis, can launch a targeted practice session on their weakest topic, and can initiate a rematch in one click.

---

## Milestone 7: ElevenLabs Voice-Enabled Quiz & Winner Announcements
**Status:** ⬜ **PENDING**

### Goal
Integrate **ElevenLabs Text-to-Speech** with **Supabase Storage** caching so questions can be read aloud during battles and battle outcomes are announced by an AI quiz host without duplicate generation calls.

### Scope & Deliverables
- [ ] **ElevenLabs Integration Module (`packages/integrations/elevenlabs`)**:
  - Server-only TTS client using `ELEVENLABS_API_KEY`.
  - Deterministic content hash computation: `sha256(normalizedText + voiceId + modelId)`.
- [ ] **Supabase Storage Caching & Audio Pipeline**:
  - Check `audio_assets` table by content hash before calling ElevenLabs.
  - On cache miss: generate MP3 buffer via ElevenLabs → upload to Supabase Storage (`quiz-audio` bucket) → save storage reference and metadata in `audio_assets` → return signed/public URL.
- [ ] **In-Battle Question Audio & Winner Announcement UI**:
  - Optional "Read Aloud" speaker toggle on active battle questions (plays verbatim question text without blocking the timer).
  - Spoken winner announcement on the Battle Diagnosis screen (e.g., *"Congratulations! Chidi has won the Data Structures battle with 850 points against 720!"*) with automatic text fallback if TTS is disabled or offline.

### Acceptance Criteria
- Opening a question or battle result plays the ElevenLabs voice audio; subsequent plays of the same question reuse the cached Supabase Storage audio file with zero duplicate ElevenLabs API requests.
- If `ELEVENLABS_API_KEY` is absent or an API error occurs, the battle and results page function normally with text fallback.

---

## Milestone 8: Firecrawl Question Factory & Human Review Pipeline
**Status:** ⬜ **PENDING**

### Goal
Build the **Question Factory** (`SOURCE URL → FIRECRAWL → NORMALIZATION → AI QUESTION GENERATION → HUMAN REVIEW → APPROVED QUESTION BANK`) to scale course-specific question banks safely.

### Scope & Deliverables
- [ ] **Firecrawl Extraction & Normalization Module (`packages/integrations/firecrawl`)**:
  - Server-only Firecrawl client using `FIRECRAWL_API_KEY`.
  - Strict URL validation and SSRF protection (HTTPS only, block private/loopback/link-local IPs, enforce page/depth limits).
  - Markdown normalization pipeline: strips boilerplate navigation, splits by academic headings, and preserves source attribution.
- [ ] **Asynchronous Ingestion Job & AI Draft Question Generator**:
  - Job state machine persisted in `ingestion_jobs` (`pending → crawling → processing → generating → review_required → completed / failed`).
  - Grounded question generation service producing structured multiple-choice drafts (question text, 4 options, 1 verified correct option, detailed explanation, difficulty, topic tag).
- [ ] **Admin Human Review & Approval Studio (`/admin/question-factory`)**:
  - Submit an academic URL bound to a University Course & Topic.
  - View job progress and inspect generated draft questions side-by-side with the extracted source snippet.
  - Edit question text, options, explanation, difficulty, or topic, and click **Approve** (publishes to live battle pool) or **Reject**.

### Acceptance Criteria
- An authorized reviewer can submit an educational URL, see extracted content turned into draft questions (`review_required`), edit and approve a question, and immediately use that approved question in a live battle.
- Unreviewed (`draft`) or `rejected` questions are never served in battles.

---

## Milestone 9: Solana Anchor Reward Escrow Program (Devnet)
**Status:** ⬜ **PENDING**

### Goal
Build, test, and verify the custom Rust + Anchor smart contract in `programs/` and its TypeScript SDK in `packages/solana` for trust-minimized Devnet reward-battle escrow and settlement.

### Scope & Deliverables
- [ ] **Solana / Anchor Toolchain & Workspace Setup (`programs/`)**:
  - Ensure `solana` CLI and `anchor` CLI are available in the environment and configure `Anchor.toml` targeting Solana **Devnet**.
- [ ] **Anchor Escrow Smart Contract (`programs/quiz-arena-escrow/src/lib.rs`)**:
  - **PDA Accounts**:
    - `BattleEscrowState` PDA seeded by `[b"battle", battle_id.as_bytes()]` storing creator, opponent, mint, stake amount, authority signer pubkey, status (`Created`, `Funded`, `Settled`, `Cancelled`, `Refunded`), winner, timestamps, and canonical bump.
    - Program-controlled SPL Token Vault PDA for holding participant deposits.
  - **Instructions**:
    - `create_battle(battle_id, stake_amount, expiry_ts)`: Initializes PDA and transfers creator's stake into the escrow vault.
    - `join_battle()`: Validates opponent, transfers matching stake into the escrow vault, and marks battle `Funded`.
    - `finalize_battle(outcome, winner)`: Requires the authorized backend settlement authority `Signer`; transfers full pot to winner (or splits 50/50 on draw) and marks `Settled`.
    - `cancel_battle()` / `refund_battle()`: Allows creator to reclaim deposit if opponent never joined before expiry, or refunds participants if an active battle timed out without settlement.
  - **Safety Invariants**: Checked arithmetic, strict token mint/authority constraints, duplicate settlement prevention, and Anchor `emit!` events.
- [ ] **TypeScript Client & IDL Package (`packages/solana`)**:
  - Export Anchor IDL, program client factory, deterministic PDA derivation helpers, and transaction builders for client deposits and server-side authority settlement.

### Acceptance Criteria
- Anchor unit/integration tests verify the happy path (create → join → finalize payout), draw split, creator cancellation refund, and rejection of unauthorized signers or double-settlement attempts.

---

## Milestone 10: Wallet Linking & End-to-End Reward Battle Settlement
**Status:** ⬜ **PENDING**

### Goal
Connect the Next.js application to the Solana Devnet escrow program so students who want optional financial stakes can link a verified wallet, fund a reward battle, and receive automatic on-chain settlement upon battle completion.

### Scope & Deliverables
- [ ] **Cryptographic Wallet Linking (`/settings/wallet` & Battle Lobby)**:
  - Solana Wallet Adapter integration (`@solana/wallet-adapter-react`) in `apps/web`.
  - Server endpoint generating an expiring challenge nonce (`wallet_nonces`), wallet message signing (`signMessage`), server ed25519 signature verification, and 1:1 persistence in `wallet_links`.
- [ ] **Reward Battle Escrow Flow in Arena UI**:
  - When creating or joining a **Reward Battle**, prompt the linked wallet to sign the `create_battle` or `join_battle` Devnet deposit transaction.
  - Verify on-chain escrow funding state on the backend before transitioning the reward battle to `ACTIVE`.
- [ ] **Automated Backend Settlement on Battle Finalization**:
  - When `finalizeBattle` completes a reward battle off-chain, the backend authority signer submits `finalize_battle` to the Solana Devnet program, records the settlement transaction signature in `reward_transactions`, and displays the Solana Explorer Devnet transaction link on the Battle Diagnosis screen.

### Acceptance Criteria
- Free battles continue to work with zero wallet connection.
- Two wallet-linked students can deposit Devnet test tokens into a Reward Battle, play the quiz battle, and see the on-chain escrow automatically settled to the winner with a verifiable Devnet transaction signature.

---

## Milestone 11: End-to-End QA, Deployment & Dev3pack Hackathon Demo
**Status:** ⬜ **PENDING**

### Goal
Verify all security and quality invariants, deploy the application and database to production (Supabase + Vercel + Solana Devnet), and prepare a crisp end-to-end hackathon demonstration walkthrough.

### Scope & Deliverables
- [ ] **Critical-Path Test Suite**:
  - Automated unit/integration tests for battle scoring, answer-key stripping, diagnosis calculations, URL SSRF validation, and Anchor escrow state transitions.
- [ ] **Deployment & Environment Verification**:
  - Apply Drizzle migrations and seed data to production **Supabase PostgreSQL**.
  - Verify **Supabase Auth**, **Supabase Storage** (`quiz-audio` bucket), and **Supabase Realtime** in production mode.
  - Confirm **Solana Devnet** program deployment and `SOLANA_PROGRAM_ID` alignment.
  - Verify production build (`bun run build`, `bun run check-types`, `bun run lint`) for **Vercel** deployment.
- [ ] **Demo Readiness Checklist**:
  - Pre-seeded Nigerian university courses/topics, cached ElevenLabs audio for demo questions, sample Firecrawl source ready for live Question Factory demo, and funded Devnet test wallets for live Reward Battle settlement.
