// Factory del client senza "server-only": usata da app, script e test.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema }), pool };
}

/** Qualsiasi istanza Drizzle Postgres con lo schema dell'app (node-postgres, PGlite, Neon). */
export type Db = ReturnType<typeof createDb>["db"];
