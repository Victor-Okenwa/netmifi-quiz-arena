import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://netmifi:netmifi_local_password@127.0.0.1:5432/netmifi_quiz_arena";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  sqlClient?: postgres.Sql;
  drizzleDb?: Database;
};

/**
 * Returns the singleton Drizzle ORM instance.
 * Configured with `prepare: false` for compatibility with both local Docker PostgreSQL
 * and Supabase's Transaction Pooler (port 6543).
 */
export function getDb(connectionString?: string): Database {
  const url =
    connectionString ??
    process.env.DATABASE_URL ??
    DEFAULT_LOCAL_DATABASE_URL;

  if (!globalForDb.drizzleDb) {
    const sqlClient = postgres(url, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 5 : 10,
      idle_timeout: 20,
    });
    globalForDb.sqlClient = sqlClient;
    globalForDb.drizzleDb = drizzle(sqlClient, { schema });
  }

  return globalForDb.drizzleDb;
}

export const db = getDb();

export async function closeDb(): Promise<void> {
  if (globalForDb.sqlClient) {
    await globalForDb.sqlClient.end();
    globalForDb.sqlClient = undefined;
    globalForDb.drizzleDb = undefined;
  }
}
