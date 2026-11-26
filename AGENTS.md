<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Netmifi Quiz Arena — Workspace Engineering Rules

## Scoped Rule Index

Domain-specific rules are co-located in their respective workspace directories and loaded automatically when working inside them:
- **Rule 2 (TypeScript, Next.js & UI)**: [`apps/web/AGENTS.md`](./apps/web/AGENTS.md)
- **Rule 3 (Solana & Anchor Smart Contracts)**: [`programs/AGENTS.md`](./programs/AGENTS.md) and [`packages/solana/AGENTS.md`](./packages/solana/AGENTS.md)
- **Rule 4 (Database & Drizzle ORM)**: [`packages/db/AGENTS.md`](./packages/db/AGENTS.md)
- **Rule 6 (Firecrawl & ElevenLabs Integrations)**: [`packages/integrations/AGENTS.md`](./packages/integrations/AGENTS.md)

---

## Rule 1: General Project Engineering Rules

1. **Workspace Preservation**:
   - The monorepo is `netmifi-quiz-arena` managed with **Turborepo** and **Bun** (`bun@1.3.2`).
   - Never recreate the workspace, replace Turborepo, introduce `pnpm`/`yarn`/`npm` lockfiles, or scaffold a new Next.js app over `apps/web`.
   - Treat the neighboring `/home/morse-code/projects/netmifi-mono` workspace as **strictly read-only reference material**. Never modify or move files in `netmifi-mono`.
2. **Package & Directory Boundaries**:
   - `apps/web`: Next.js App Router application, ALL UI/shadcn components (`apps/web/components/ui`), brand assets (`apps/web/assets`), API routes, and server orchestration.
   - `packages/ui`: **Must remain empty** (only a minimal `package.json` shell so workspace resolution succeeds). Never place components or styles in `packages/ui`.
   - `programs/`: Rust + Anchor Solana smart contracts for reward-battle escrow and settlement.
   - `packages/db`: Drizzle ORM schemas, migrations, and singleton PostgreSQL client.
   - `packages/solana`: TypeScript SDK/client and IDL bindings for the Anchor program.
   - `packages/integrations/firecrawl`: Server-side academic content extraction and normalization.
   - `packages/integrations/elevenlabs`: Server-side TTS audio generation for questions and winner announcements.
   - `packages/types` & `packages/validators`: Shared TypeScript interfaces and Zod schemas (`workspaces` in root `package.json` must include nested packages if sub-packages have their own `package.json`).
   - `infrastructure/docker`: Local PostgreSQL Docker Compose setup.
3. **Code Organization, Naming & Dependencies**:
   - Use `kebab-case` for file and directory names, `PascalCase` for React components and TypeScript types/interfaces, and `camelCase` for functions and variables.
   - Reuse existing utilities (`@/lib/utils`, shared validators/types) before writing new helpers or adding dependencies.
   - Use structured error handling with clear domain error codes; never swallow exceptions or log sensitive tokens/keys.
4. **Environment Variables**:
   - Local web secrets live in `apps/web/.env.local`; required keys are documented in root `.env.example`.
   - Validate environment variables through a dedicated config module using Zod. Never expose server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`, `DATABASE_URL`, backend signer keys) via `NEXT_PUBLIC_*`.

---

## Rule 5: Supabase Development Rules

1. **Four Distinct Responsibilities**:
   - **Supabase Auth**: Primary student identity and session provider (Email/Password, Google OAuth). Students must never be required to connect a Solana wallet to register, log in, or play free battles.
   - **Supabase PostgreSQL**: Production relational database accessed exclusively via **Drizzle ORM** for application queries.
   - **Supabase Storage**: Object storage for generated ElevenLabs audio files and assets. Store only storage paths and metadata in PostgreSQL, never binary audio blobs.
   - **Supabase Realtime**: Broadcast and Presence notification layer for multiplayer lobby join, ready-state, start events, question progression, and completion notifications.
2. **Source of Truth & Authorization**:
   - **PostgreSQL (via Drizzle) is the single authoritative source of truth** for battle state, scores, and profiles—never Supabase Realtime payloads or client state.
   - Because Drizzle connects via a privileged PostgreSQL connection that bypasses Supabase RLS context, **every server action and route handler must explicitly verify the user's Supabase Auth session (`supabase.auth.getUser()`) and enforce resource/battle ownership in server code** before running Drizzle queries.
   - Never trust `supabase.auth.getSession()` alone on the server for security-critical checks; use `supabase.auth.getUser()` to revalidate the token.
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` to client bundles.

---

## Rule 7: Security and Testing Rules

1. **Assessment & Battle Integrity**:
   - **Never send `correctAnswer` or answer explanations to the client before the question submission phase is closed.**
   - All battle timers, submission deadlines, state transitions (`WAITING → READY → ACTIVE → COMPLETED / CANCELLED / EXPIRED`), and score calculations must be enforced and computed on the server.
   - Prevent duplicate answer submissions using database unique constraints (`(battle_id, participant_id, question_id)`) and atomic transactions.
2. **Wallet Linking & Escrow Security**:
   - Link Solana wallets to authenticated Supabase accounts via server-generated, expiring cryptographic nonces and ed25519 signature verification.
   - Never request, accept, log, or store user private keys or seed phrases.
   - Prevent a single wallet public key from linking to multiple user accounts.
3. **External Input & SSRF Protection**:
   - Validate all user inputs and route payloads with Zod.
   - Sanitize and restrict URLs submitted to Firecrawl (HTTPS only, block private/loopback/link-local IP ranges `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `localhost`) to prevent SSRF.
4. **Testing Standards**:
   - Write unit tests for battle scoring, state machine transitions, and diagnosis calculations.
   - Write Anchor integration tests covering deposit escrow, authorized settlement, draw/refund flows, and unauthorized/duplicate settlement rejection.

---

## Rule 8: Product and Scope Rules

1. **Core Product Identity & Loop**:
   - Netmifi Quiz Arena is a **real-time competitive academic learning platform** for university students within the broader Netmifi ecosystem.
   - Every feature must reinforce the fundamental product loop:
     **`BATTLE → DIAGNOSIS → PRACTICE → REMATCH`**
   - Winning/losing is only step one: every completed battle must produce a **Diagnosis** (accuracy by topic, weak areas, response time, question breakdown) and actionable **Practice Recommendations** leading to a **Rematch**.
2. **Free Battles vs. Optional Reward Battles**:
   - **Free Battles**: Core educational experience (XP, leaderboards, performance diagnosis, practice). No Solana wallet required.
   - **Reward Battles**: Optional Devnet SPL-token escrow battles where both players deposit an agreed stake and the Anchor program settles payout to the verified winner.
3. **Dev3pack Hackathon Priorities & Anti-Scope**:
   - Prioritize an end-to-end working vertical slice: Supabase Auth → Course/Topic Selection → Battle Creation/Joining → Server-Controlled Quiz & Realtime Sync → Scoring & Diagnosis → ElevenLabs Voice Readout/Announcement → Firecrawl Question Factory with Human Review → Devnet Solana Escrow Settlement.
   - **Out of Scope**: Full social network, full LMS, custom tokenomics, staking, DAO governance, mainnet financial operations, or microservices.
