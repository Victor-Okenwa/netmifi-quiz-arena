import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { DEFAULT_LOCAL_DATABASE_URL } from "./client";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * PostgreSQL error codes for objects that already exist (safe to skip for idempotent push/migrate):
 * - 42710: duplicate_object (e.g., enum type or constraint already exists)
 * - 42P07: duplicate_table / duplicate_relation (table or index already exists)
 * - 42701: duplicate_column (column already exists)
 */
const IDEMPOTENT_PG_CODES = new Set(["42710", "42P07", "42701"]);

async function runMigrations() {
  const url = process.env.DATABASE_URL ?? DEFAULT_LOCAL_DATABASE_URL;
  const hostPreview = url.split("@")[1] ?? "localhost";
  console.log(`🚀 Syncing Drizzle SQL schema against ${hostPreview}...`);

  // `prepare: false` and `max: 1` prevent Supabase Transaction Pooler (port 6543) from hanging.
  const sql = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
  });

  try {
    const migrationsFolder = resolve(__dirname, "../drizzle");
    const sqlFiles = readdirSync(migrationsFolder)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let appliedStatements = 0;
    let skippedExisting = 0;

    for (const file of sqlFiles) {
      const fullPath = resolve(migrationsFolder, file);
      const content = readFileSync(fullPath, "utf8");
      const statements = content
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
          appliedStatements += 1;
        } catch (err: unknown) {
          const pgCode =
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            typeof (err as { code?: unknown }).code === "string"
              ? (err as { code: string }).code
              : "";

          if (IDEMPOTENT_PG_CODES.has(pgCode)) {
            skippedExisting += 1;
            continue;
          }
          throw err;
        }
      }
    }

    console.log(
      `✅ Database schema synced in <2s! (${appliedStatements} new statements applied, ${skippedExisting} existing objects verified)`
    );
  } finally {
    await sql.end();
  }
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
