import { z } from "zod";

/**
 * Public client-safe environment schema (`NEXT_PUBLIC_*`).
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SOLANA_NETWORK: z
    .enum(["devnet", "localnet", "testnet", "mainnet-beta"])
    .default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z
    .string()
    .url()
    .default("https://api.devnet.solana.com"),
  NEXT_PUBLIC_SOLANA_PROGRAM_ID: z
    .string()
    .min(32)
    .default("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"),
});

/**
 * Server-only environment schema.
 * Never import or call `getServerEnv()` inside Client Components.
 */
const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      "postgresql://netmifi:netmifi_local_password@127.0.0.1:5432/netmifi_quiz_arena",
    ),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SOLANA_PROGRAM_ID: z
    .string()
    .min(32)
    .default("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"),
  SOLANA_AUTHORITY_SECRET_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_DEFAULT_VOICE_ID: z
    .string()
    .min(1)
    .default("JBFqnCBsd6RMkjVDRZzb"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and returns public `NEXT_PUBLIC_*` environment variables.
 */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_PROGRAM_ID: process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID,
  });
}

/**
 * Validates and returns server-side environment variables.
 * Throws if invoked in a browser context.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() must only be called on the server, never in client code.",
    );
  }

  return serverEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_PROGRAM_ID: process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    SOLANA_PROGRAM_ID: process.env.SOLANA_PROGRAM_ID,
    SOLANA_AUTHORITY_SECRET_KEY:
      process.env.SOLANA_AUTHORITY_SECRET_KEY || undefined,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || undefined,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || undefined,
    ELEVENLABS_DEFAULT_VOICE_ID: process.env.ELEVENLABS_DEFAULT_VOICE_ID,
  });
}
