# Database & Drizzle ORM Rules (`packages/db`)

## Rule 4: Database and Drizzle Development Rules

1. **Single Authoritative Schema Layer**:
   - All PostgreSQL tables, enums, foreign keys, unique constraints, and indexes must be defined in `packages/db/src/schema/` using Drizzle ORM.
   - Use the exact same Drizzle schema and migrations (`packages/db/drizzle/`) against both **local Docker PostgreSQL** and **production Supabase PostgreSQL**.
2. **Core Domain Modeling & Constraints**:
   - Enforce relational integrity across `users/profiles`, `universities`, `departments`, `courses`, `topics`, `content_sources`, `ingestion_jobs`, `questions`, `question_options`, `audio_assets`, `battles`, `battle_participants`, `answer_submissions`, `battle_results`, `wallet_links`, and `reward_transactions`.
   - Add unique constraints to prevent race conditions: e.g., unique `(battle_id, user_id)` on participants, unique `(battle_id, user_id, question_id)` on answer submissions, and unique `wallet_address` on linked wallets.
   - Index high-frequency lookup columns (`battle_id`, `course_id`, `topic_id`, `status`, `user_id`).
3. **Connection & Transaction Management**:
   - Export a singleton Drizzle database client from `packages/db/src/client.ts` (and re-export via `src/index.ts`) configured for serverless compatibility (using `globalThis` caching in development and Supabase connection pooler compatibility in production).
   - Wrap multi-step state mutations (joining a battle, recording final answers + computing battle results, approving generated questions) in `db.transaction(...)`.
4. **Explicit Ownership Authorization**:
   - Because Drizzle queries use the server's database connection rather than end-user RLS JWTs, callers must always pass and filter by the server-verified `userId` and validate resource ownership before mutating records.
