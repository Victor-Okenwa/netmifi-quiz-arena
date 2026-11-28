# TypeScript, Next.js & UI Rules (`apps/web`)

## Rule 2: TypeScript and Next.js Development Rules

1. **Strict TypeScript**:
   - Never use `any`. Use explicit interfaces, generics, discriminated unions, or `unknown` narrowed with Zod/type guards.
   - Respect `noUncheckedIndexedAccess` and strict null checks.
2. **UI & Design System Location**:
   - All UI components (`components/ui/*`), feature components (`components/*`), fonts (`assets/fonts/*`), brand logos (`assets/netmifi/*`), and theme tokens (`app/globals.css`) reside in `apps/web`.
   - Maintain the NetMifi design system: **Lexend** (`--font-sans`) as primary font, **Orbitron** (`--font-game`) for competitive/arcade headings, and NetMifi oklch color tokens.
   - Never import from or add components to `@repo/ui` (`packages/ui`).
   - **Production UI Copy Only (No Infrastructure or Meta Placeholders)**: Never include badges, footers, tips, or text in the UI that talk about the app's internal infrastructure, fonts, auth provider, or architecture (e.g., never write _"Powered by Lexend & Orbitron"_, _"Secured by Supabase Auth"_, _"No Crypto Wallet Required"_, or similar meta tips). All UI copy must be natural, student-facing product language.
3. **Server vs. Client Component Architecture**:
   - Default to **React Server Components (RSC)** for pages, layouts, and initial data loading.
   - Add `"use client"` only at the smallest leaf component requiring interactivity, hooks (`useState`, `useEffect`), Supabase Realtime subscriptions, audio playback, or Solana wallet adapter hooks.
   - Keep business logic (scoring, battle state transitions, DB queries, integration calls) out of React components; place it in server modules/actions or workspace packages (`@repo/db`, `@repo/solana`, `@repo/integrations`).
4. **API Route Handlers & Server Boundary**:
   - Validate all incoming request bodies, query params, and headers with **Zod**.
   - Authenticate requests on the server using Supabase Auth (`getUser()`) before executing database operations.
   - Import the shared Drizzle client from `@repo/db`; never instantiate separate database pools inside `apps/web`.
   - Strip sensitive fields (such as `correctOption` / `correctAnswer` on active battle questions) before serializing responses to the client.
