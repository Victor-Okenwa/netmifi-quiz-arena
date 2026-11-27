# Netmifi Quiz Arena — Sequential Development Milestones

> **Purpose of this Document**  
> This file is our living roadmap and persistent progress memory for building **Netmifi Quiz Arena** (Dev3pack Solana Hackathon).  
> We build **strictly one milestone at a time**. Before starting any implementation work, check the **Milestone Status Dashboard** below to see where we are, confirm the active milestone with the team, and update checklists and status markers (`COMPLETED`, `IN PROGRESS`, `NEXT UP`, `PENDING`) as each goal is verified.

---

## 📊 Milestone Status Dashboard

| # | Milestone | Key Workspace Areas | Status |
|---|---|---|---|
| **M0** | Foundation, Brand Identity & Persistent Engineering Rules | `apps/web`, `AGENTS.md` | ✅ **COMPLETED** |
| **M1** | Monorepo Plumbing, Shared Packages & Environment Config | `package.json`, `packages/*`, `.env.example` | ✅ **COMPLETED** |
| **M2** | Local Docker PostgreSQL & Drizzle Database Architecture | `infrastructure/docker`, `packages/db` | ✅ **COMPLETED** |
| **M3** | Student Authentication & Academic Onboarding (Supabase Auth) | `apps/web`, `packages/db` | ✅ **COMPLETED** |
| **M4** | Academic Catalog, Dashboard & Arena Lobby UI | `apps/web` | ✅ **COMPLETED** |
| **M5** | Core Battle Engine & Real-Time Multiplayer Sync | `apps/web`, `packages/db` | ✅ **COMPLETED** |
| **M6** | Post-Battle Diagnosis, Targeted Practice & Rematch Loop | `apps/web`, `packages/db` | ✅ **COMPLETED** |
| **M7** | ElevenLabs Voice-Enabled Quiz & Winner Announcements | `packages/integrations/elevenlabs`, `apps/web` | ✅ **COMPLETED** |
| **M8** | Firecrawl Question Factory & Human Review Pipeline | `packages/integrations/firecrawl`, `apps/web` | ⏳ **NEXT UP** |
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
**Status:** ✅ **COMPLETED**

### Goal
Wire up the empty workspace package directories (`packages/db`, `packages/types`, `packages/validators`, `packages/solana`, `packages/integrations/firecrawl`, `packages/integrations/elevenlabs`) with clean TypeScript/Bun configurations and establish type-safe environment variable validation before writing domain code.

### Scope & Deliverables
- [x] **Workspace Discovery & TypeScript Alignment**:
  - Updated root `package.json` `"workspaces"` array to include nested integrations (`["apps/*", "packages/*", "packages/integrations/*"]`).
  - Aligned TypeScript versions (`^5.9.3`) across root and workspace packages so `bun run check-types` runs without version drift.
  - Removed the unused boilerplate `apps/docs` app so builds focus on `apps/web` and shared packages.
- [x] **Initialize Shared Package Manifests (`package.json`, `tsconfig.json`, `src/index.ts`)**:
  - `@repo/types` (`packages/types`): Shared domain interfaces (battle states, diagnosis models, question DTOs, realtime event payloads).
  - `@repo/validators` (`packages/validators`): Shared Zod schemas for API inputs, battle configuration, answer submission, SSRF-safe URL ingestion, and wallet link verification.
  - `@repo/db` (`packages/db`): Package skeleton ready for Drizzle ORM and `postgres` driver.
  - `@repo/solana` (`packages/solana`): Package skeleton ready for Anchor IDL and Solana web3 client helpers.
  - `@repo/firecrawl` & `@repo/elevenlabs` (`packages/integrations/*`): Server-only integration package skeletons.
- [x] **Environment Variable Templates & Validation**:
  - Created root `.env.example` documenting all required variables (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID`, `FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`).
  - Created server/client environment validation helper (`apps/web/lib/env.ts`) so missing or misconfigured variables fail fast with clear error messages.

### Acceptance Criteria
- `bun run check-types` succeeds across the entire monorepo with 0 errors.
- `apps/web` can import types and Zod schemas from `@repo/types` and `@repo/validators`.

---

## Milestone 2: Local Docker PostgreSQL & Drizzle Database Architecture
**Status:** ✅ **COMPLETED**

### Goal
Stand up the local Docker PostgreSQL environment and implement the complete, production-ready Drizzle ORM relational schema, migration workflow, and academic seed data in `packages/db`.

### Scope & Deliverables
- [x] **Local Docker PostgreSQL (`infrastructure/docker/docker-compose.yml`)**:
  - Configured PostgreSQL 16 (`postgres:16-alpine`) container with persistent named volume, healthcheck, local port binding (`127.0.0.1:5432:5432`), and environment-driven credentials matching `.env.example`.
- [x] **Drizzle Client & Config (`packages/db`)**:
  - Configured `packages/db/drizzle.config.ts`.
  - Implemented singleton database connection in `packages/db/src/client.ts` compatible with both local Docker PostgreSQL and production Supabase PostgreSQL connection pooling (`prepare: false`).
- [x] **Complete Relational Schema (`packages/db/src/schema/`)**:
  - **Identity & Academic Hierarchy**:
    - `profiles` (linked to Supabase Auth `user.id`, display name, avatar, university/department references, XP, rating).
    - `universities`, `departments`, `courses`, `topics` (structured academic catalog for Nigerian universities).
  - **Question Factory & Voice Assets**:
    - `content_sources` (submitted URL, title, university/course/topic metadata, permissions, submitted by).
    - `ingestion_jobs` (status enum: `pending`, `crawling`, `processing`, `generating`, `review_required`, `completed`, `failed`, error logs, timestamps).
    - `questions` (course/topic foreign keys, question text, difficulty, explanation, approval status `draft | approved | rejected`, source attribution, reviewer metadata).
    - `question_options` (options A–D, server-only `correctOptionKey` on `questions`).
    - `audio_assets` (question/battle reference, Supabase Storage path, voice ID, content SHA-256 hash, duration, status).
  - **Battle Engine & Learning Loop**:
    - `battles` (status enum: `WAITING`, `READY`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `EXPIRED`; mode `free | reward`; course/topic IDs; question count; time per question; stake amount; on-chain battle PDA address).
    - `battle_participants` (unique `(battle_id, user_id)`, ready state, current score, total time ms, deposit tx signature).
    - `battle_questions` (ordered question set assigned to a battle).
    - `answer_submissions` (unique `(battle_id, user_id, question_id)`, selected option, `is_correct`, response time ms, awarded points, submitted at).
    - `battle_results` (winner user ID, draw flag, per-participant topic accuracy breakdown & recommended practice topic IDs).
  - **Solana Wallet & Escrow Tracking**:
    - `wallet_links` (unique `user_id` and unique `wallet_address`, verified timestamp) & `wallet_nonces` (expiring challenge nonces).
    - `reward_transactions` (battle ID, tx type `deposit | settle | cancel | refund`, tx signature, amount, status).
- [x] **Migrations & Academic Seed Script (`db:generate`, `db:push`, `db:seed`)**:
  - Seed script (`packages/db/src/seed.ts`) populating 6 Nigerian universities (UNILAG, UI, OAU, UNN, FUTO, ABU), Computer Science departments, 3 core courses (`CSC 201`, `CSC 305`, `CSC 309`), 10 topics, and 22 approved battle-ready multiple-choice questions.

### Acceptance Criteria
- Docker PostgreSQL container starts cleanly and passes healthchecks.
- Drizzle migrations push/apply cleanly and `bun run db:seed` populates the academic catalog and starter question bank idempotently.

---

## Milestone 3: Student Authentication & Academic Onboarding (Supabase Auth)
**Status:** ✅ **COMPLETED**

### Goal
Enable students to register, log in, and set up their academic profile (University, Department, Courses) using **Supabase Auth** and **Drizzle**, with zero cryptocurrency wallet requirement.

### Scope & Deliverables
- [x] **Supabase Auth Integration (`apps/web/lib/supabase/`)**:
  - Server client (`server.ts`), browser client (`client.ts`), admin service-role helper, and Next.js middleware (`apps/web/middleware.ts`) for session refresh using `@supabase/ssr`.
  - Server-side authentication guards (`getCurrentAuthContext()`, `requireAuthUser()`, `requireOnboardedStudent()`) in `apps/web/lib/supabase/auth.ts` that call `supabase.auth.getUser()` and load/sync the student's Drizzle `profile`.
- [x] **Auth Pages & Flows (`apps/web/app/(auth)/` & `apps/web/app/api/auth/`)**:
  - Registration (`/register` & `POST /api/auth/register`), Login (`/login` & `POST /api/auth/login`), Logout (`POST /api/auth/logout`), and Auth Callback (`/auth/callback`) supporting Email/Password and Google OAuth.
- [x] **Academic Onboarding Flow (`/onboarding` & `POST /api/onboarding`)**:
  - Step-by-step selection of the student's Nigerian University (`UNILAG`, `UI`, `OAU`, `UNN`, `FUTO`, `ABU`), Department (`Computer Science`), Academic Level (`100L`–`500L`), Display Name, and unique `@username`.
  - Persists profile to PostgreSQL via Drizzle and redirects to the authenticated Arena Hub (`/arena`).

### Acceptance Criteria
- A new student can sign up with email/password, complete academic onboarding without connecting a wallet, and have their profile persisted in PostgreSQL.
- Unauthenticated requests to protected routes or API endpoints are rejected on the server.

---

## Milestone 4: Academic Catalog, Student Dashboard & Arena Lobby UI
**Status:** ✅ **COMPLETED**

### Goal
Build the primary student-facing Arena Dashboard, Course/Topic Explorer, and Battle Creation / Matchmaking Lobby in `apps/web` using the NetMifi design system.

### Scope & Deliverables
- [x] **Shared Arena Navigation Bar (`apps/web/components/arena/arena-navbar.tsx`)**:
  - Top navbar with Arena Lobby (`/arena`), New Battle (`/arena/new`), Leaderboard (`/leaderboard`), student university/level badge, `<ProfileAvatar />` (`1`–`5` fallback + `avatarUrl`), and Sign Out button.
- [x] **Arena Dashboard & Matchmaking Lobby (`/arena`)**:
  - Displays student's academic profile, `<ProfileAvatar />`, XP, battles played, victories, win rate, recent battles, Quick-Join by Invite Code card (`quick-join-card.tsx`), Open Challenges feed, and Courses & Battle Topics Explorer.
- [x] **Course & Topic Battle Configurator (`/arena/new` & `POST /api/battles`)**:
  - Filter by University Course and specific Topic (or All Course Topics), with URL query pre-selection (`?courseId=...&topicId=...`).
  - Select Battle Mode (**Standard Battle** or **Reward Battle**), Question Count (`3`, `5`, `10`), Timer per Question (`10s`, `15s`, `20s`, `30s`), and Visibility (*Open Lobby* vs. *Private Friend Invite*).
  - Creates the battle, assigns approved questions, generates an 8-character invite code, and opens `/arena/battle/[battleId]`.
- [x] **Leaderboard View (`/leaderboard`)**:
  - Inter-University Standings (`UNILAG`, `UI`, `OAU`, `UNN`, `FUTO`, `ABU`) and Top Student Rankings by XP and victories.

### Acceptance Criteria
- Authenticated students can browse courses/topics, configure a new battle, generate a shareable challenge code/link, join by invite code, view open battles in the lobby, and inspect the leaderboard.

---

## Milestone 5: Core Battle Engine & Real-Time Multiplayer Synchronization
**Status:** ✅ **COMPLETED**

### Goal
Implement the server-authoritative quiz battle engine and real-time multiplayer synchronization using **Drizzle transactions** (source of truth) and **Supabase Realtime** (event broadcast & presence).

### Scope & Deliverables
- [x] **Server-Authoritative Battle Service (`apps/web/lib/battle-engine/engine.ts` & `apps/web/lib/battle-join.ts`)**:
  - Strict state machine transitions: `WAITING → READY → ACTIVE → COMPLETED` (plus `CANCELLED` and `EXPIRED`).
  - `createBattle` (`POST /api/battles`): Validates course/topic availability, selects balanced approved questions, creates battle record.
  - `joinBattleAsOpponent` & `toggle_ready` (`POST /api/battles/[battleId]`): Enforces participant limits (1v1), records join in a database transaction, manages the green Ready toggle, starts a synchronized 20-second 3D turning-box countdown when both players are ready, locks ready/leave controls at `<= 10s`, and transitions battle to `ACTIVE` at `00s`.
  - `getSanitizedBattleArenaState` (`GET /api/battles/[battleId]/arena`): Returns ordered questions, options A–D, timer metadata, and participant progress—**strictly stripping `correctOptionKey` and `explanation`**.
  - `submitParticipantAnswer` (`POST /api/battles/[battleId]/answer`): Server validates participant membership, active battle status, and duplicate submission constraint `(battle_id, user_id, question_id)`. Computes correctness and speed-adjusted score (`100`/`120`/`150` base + up to `+50` speed bonus) server-side.
  - Atomic finalization: Triggered when both participants complete all questions; atomically computes winner/draw (with response-time tie-breaker), awards student XP (`+150` win, `+100` draw, `+60` challenger), and records per-topic performance breakdowns in `battle_results`.
- [x] **Supabase Realtime Multiplayer Sync**:
  - Room channels (`battle-lobby:<battleId>` and `battle-arena:<battleId>`) broadcasting ready toggles, join/leave events, and live question progress (`answeredCount / totalQuestions`), paired with authoritative server polling.
- [x] **Live Battle Arena Room UI (`apps/web/components/arena/live-battle-quiz.tsx`)**:
  - Head-to-head live scoreboard with `<ProfileAvatar />`, points, and answered progress bars.
  - Per-question countdown bar with automatic timeout submission (`0 pts`) so neither player ever stalls.
  - Interactive `A / B / C / D` option cards, waiting-for-opponent completion screen, and final Victory/Draw/Diagnosis summary banner.

### Acceptance Criteria
- Two students in separate browser sessions can create/join a battle, ready up through the 20s 3D countdown, answer timed questions simultaneously with real-time progress updates, and reach a server-verified winner announcement without any answer key exposure in network payloads.

---

## Milestone 6: Post-Battle Diagnosis, Targeted Practice & Rematch Loop
**Status:** ✅ **COMPLETED**

### Goal
Complete the core product loop (**`BATTLE → DIAGNOSIS → PRACTICE → REMATCH`**) so every battle turns competition into measurable academic improvement.

### Scope & Deliverables
- [x] **Post-Battle Diagnosis Engine & UI (`/arena/battle/[battleId]` & `/arena/battle/[battleId]/results`)**:
  - **Winner & Score Summary**: Final scores, accuracy percentage, and average response time comparison with per-participant shadcn Tabs (`Slot 1` & `Slot 2`).
  - **Topic-by-Topic Breakdown**: Visual accuracy cards per topic (`Strong` vs. `Review`) with direct **"Practice Weak Topic"** links.
  - **Question Review List**: Every battle question with the student's selected answer, the verified correct answer, and the full academic explanation.
- [x] **Targeted Practice Mode (`/arena/practice` & `POST /api/practice/complete`)**:
  - Generates a personalized practice drill targeting the weak topic(s) identified in the battle diagnosis (or any selected course/topic).
  - Immediate explanation feedback after each practice question, accuracy tracking, and XP rewards (`+25` to `+50 XP`).
- [x] **One-Click Rematch Flow (`POST /api/battles/[battleId]/rematch`)**:
  - "Challenge Opponent to Rematch" button on the diagnosis and practice completion screens that spawns a new battle in the same course/topic and notifies the opponent via Supabase Realtime (`rematch_offered` broadcast banner).

### Acceptance Criteria
- After completing a battle, both the winner and loser see their topic-level diagnosis, can launch a targeted practice session on their weakest topic, and can initiate a rematch in one click.

---

## Milestone 7: ElevenLabs Voice-Enabled Quiz & Winner Announcements
**Status:** ✅ **COMPLETED**

### Goal
Integrate **ElevenLabs Text-to-Speech** with **Supabase Storage** caching so questions can be read aloud during battles and battle outcomes are announced by an AI quiz host without duplicate generation calls.

### Scope & Deliverables
- [x] **ElevenLabs Integration Module (`packages/integrations/elevenlabs`)**:
  - Server-only TTS client using `ELEVENLABS_API_KEY`.
  - Deterministic content hash computation: `sha256(normalizedText + voiceId + modelId)`.
- [x] **Supabase Storage Caching & Audio Pipeline (`apps/web/lib/audio/tts-cache.ts`, `POST /api/audio/question`, `POST /api/audio/winner`)**:
  - Check `audio_assets` table by content hash before calling ElevenLabs.
  - On cache miss: generate MP3 buffer via ElevenLabs → upload to Supabase Storage (`quiz-audio` bucket) → save storage reference and metadata in `audio_assets` → return signed/public URL.
- [x] **In-Battle Question Audio & Winner Announcement UI (`apps/web/components/arena/voice-audio-button.tsx`)**:
  - Optional "Read Aloud" speaker toggle on active battle and practice questions (plays verbatim question text without blocking the timer).
  - Spoken winner announcement on the Battle Diagnosis screen (e.g., *"Congratulations! Chidi has won the Data Structures battle with 850 points against 720!"*) with automatic Web Speech / text fallback if TTS is disabled or offline.

### Acceptance Criteria
- Opening a question or battle result plays the ElevenLabs voice audio; subsequent plays of the same question reuse the cached Supabase Storage audio file with zero duplicate ElevenLabs API requests.
- If `ELEVENLABS_API_KEY` is absent or an API error occurs, the battle and results page function normally with text fallback.

---

## Milestone 8: Firecrawl Question Factory & Human Review Pipeline
**Status:** ⏳ **NEXT UP**

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
