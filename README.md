# Netmifi Quiz Arena

> **Netmifi doesn't just tell students who won. It shows them what they need to learn to win next time.**  
> **Learn. Compete. Improve. Earn.**

**Netmifi Quiz Arena** is a real-time competitive academic quiz platform designed for university students within the broader **Netmifi** learning ecosystem. Built for the **Dev3pack Solana Hackathon**, it transforms independent exam preparation into an interactive, measurable, and social competition with optional Solana-powered reward battles.

---

## 🎯 The Core Product Loop

Traditional study tools deliver static materials without helping students test their mastery against peers in real time or diagnose specific topic weaknesses. Netmifi Quiz Arena is built around a closed learning feedback loop:

```text
BATTLE ──► DIAGNOSIS ──► PRACTICE ──► REMATCH
```

1. **Battle**: Students select their university, department, course, and topic to compete in timed, head-to-head academic quiz battles with questions of matched difficulty.
2. **Diagnosis**: Every completed battle generates a structured performance breakdown—accuracy by topic, response time, question-by-question explanations, and weak-area identification.
3. **Practice**: The platform recommends targeted practice drills focused specifically on the topics where the student struggled (e.g., drilling *Recursion* after missing recursion questions in *Data Structures & Algorithms*).
4. **Rematch**: Students challenge their friend or opponent again to measure real academic improvement over time.

---

## ⚔️ Free Battles vs. Optional Reward Battles

Netmifi Quiz Arena is an **academic product first**, not a wallet-gated crypto app:

- **Free Academic Battles (Core Experience)**:
  - **No cryptocurrency wallet required.** Students sign up with email/password or Google via **Supabase Auth**.
  - Compete for XP, course and campus leaderboard rankings, achievements, and post-battle learning diagnoses.
- **Optional Reward Battles (Solana Devnet Escrow)**:
  - Students who choose to link and verify a Solana wallet can participate in optional staked battles using a Devnet SPL token.
  - A custom **Rust + Anchor** smart contract holds both players' deposits in a program-controlled PDA escrow vault and settles the reward to the verified winner upon battle finalization.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| **Monorepo & Runtime** | Turborepo + Bun (`1.3.2`) | Workspace orchestration, package management, and task caching |
| **Web Application** | Next.js 16 (App Router) + React 19 | UI, Server Components, API Route Handlers, and server-side battle engine |
| **Styling & Design** | Tailwind CSS v4 + shadcn/ui | NetMifi design system (`Lexend` primary font, `Orbitron` display font, `oklch` tokens) |
| **Database & ORM** | PostgreSQL + Drizzle ORM | Single authoritative relational schema and type-safe query/transaction layer |
| **Local Database** | Docker Compose | Reproducible local PostgreSQL development database |
| **Production Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime) | Managed production DB, student identity, cached audio storage, and live multiplayer sync |
| **Question Factory** | Firecrawl + AI Generation + Human Review | Automated academic source extraction, normalization, draft question generation, and reviewer approval |
| **Voice Experience** | ElevenLabs + Supabase Storage | Hash-cached TTS for reading quiz questions aloud and spoken battle winner announcements |
| **Smart Contracts** | Rust + Anchor (Solana Devnet) | Trust-minimized reward-battle deposit escrow, settlement, draw split, and timeout refunds |

### Architectural Boundaries & Trust Model

- **PostgreSQL (via Drizzle) is the single source of truth** for persistent application and battle state.
- **Supabase Realtime** handles low-latency multiplayer presence and broadcast notifications (`player_joined`, `player_ready`, `battle_started`, `participant_progress`, `battle_completed`).
- **Server-Controlled Assessment**: Correct answers and explanations never leave the server during an active battle. Scoring and deadlines are validated exclusively on the backend.
- **Hybrid On-Chain Settlement**: Quiz delivery and grading happen off-chain; an authorized backend authority signer submits the verified battle outcome to the Solana Anchor program on Devnet to release escrowed funds.

---

## 📂 Monorepo Structure

```text
netmifi-quiz-arena/
├── apps/
│   └── web/                          # Next.js App Router app, NetMifi UI/shadcn components, assets & routes
├── programs/                         # Rust + Anchor Solana smart contracts (reward-battle escrow)
├── packages/
│   ├── db/                           # (@repo/db) Drizzle ORM schemas, migrations, seed scripts & DB client
│   ├── solana/                       # (@repo/solana) TypeScript SDK, Anchor IDL bindings & PDA helpers
│   ├── integrations/
│   │   ├── firecrawl/                # (@repo/firecrawl) Academic URL extraction & content normalization
│   │   └── elevenlabs/               # (@repo/elevenlabs) Server-side TTS synthesis & content-hash helpers
│   ├── types/                        # (@repo/types) Shared domain interfaces & Realtime event unions
│   ├── validators/                   # (@repo/validators) Shared Zod validation schemas & SSRF guards
│   ├── eslint-config/                # (@repo/eslint-config) Shared ESLint configurations
│   └── typescript-config/            # (@repo/typescript-config) Shared tsconfig bases
├── infrastructure/
│   └── docker/                       # Local Docker Compose PostgreSQL setup
├── milestones.md                     # Sequential development roadmap & live progress tracker (M0–M11)
├── AGENTS.md                         # Persistent workspace engineering rules
└── .env.example                      # Documented environment variable template
```

*(Note: All UI components, theme tokens, and brand assets live inside `apps/web`; `packages/ui` is intentionally kept as an empty placeholder.)*

---

## 🚀 Getting Started

### 1. Prerequisites
- **Bun** `1.3.2`
- **Node.js** `>=24`
- **Docker** (for local PostgreSQL)
- **Rust, Cargo, Solana CLI & Anchor CLI** (for building/testing the Solana program in `programs/`)

### 2. Environment Setup
Copy the root environment template to `apps/web/.env.local`:

```bash
cp .env.example apps/web/.env.local
```

Populate the required keys in `apps/web/.env.local`:
- `DATABASE_URL` (defaults to local Docker PostgreSQL)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SOLANA_NETWORK=devnet`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `SOLANA_PROGRAM_ID`
- `FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`

### 3. Install & Run

```bash
# Install workspace dependencies
bun install

# Start the development server (http://localhost:3000)
bun run dev

# Run TypeScript typechecking across all workspaces
bun run check-types

# Build all applications and packages
bun run build

# Lint the monorepo
bun run lint
```

---

## 🗺️ Roadmap & Engineering Standards

- **Development Milestones**: See **[milestones.md](./milestones.md)** for the sequential milestone roadmap (`M0` through `M11`) and current status dashboard.
- **Engineering Rules**: See **[AGENTS.md](./AGENTS.md)** (and scoped rules in [`apps/web/AGENTS.md`](./apps/web/AGENTS.md), [`programs/AGENTS.md`](./programs/AGENTS.md), [`packages/solana/AGENTS.md`](./packages/solana/AGENTS.md), [`packages/db/AGENTS.md`](./packages/db/AGENTS.md), and [`packages/integrations/AGENTS.md`](./packages/integrations/AGENTS.md)).
