// Database Postgres in memoria (PGlite) con tutte le migrazioni applicate.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { pgError } from "@/lib/pg-error";

export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });
  const pgliteDb = drizzle(client, { schema });
  await migrate(pgliteDb, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  // Stessa API di query di node-postgres: il cast evita di propagare il tipo del driver.
  const db = pgliteDb as unknown as Db;
  return { db, client, close: () => client.close() };
}

/** Nome del vincolo violato da un errore Postgres. */
export function pgConstraint(e: unknown): string | undefined {
  return pgError(e)?.constraint;
}
