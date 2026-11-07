import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { db?: Db };

function connect() {
  // Su Vercel poche connessioni per istanza (DATABASE_URL è già quella pooled di Neon).
  const { db, pool } = createDb(process.env.DATABASE_URL!, { max: process.env.VERCEL ? 5 : 10 });
  // Su Vercel chiude le connessioni inattive prima che l'istanza venga sospesa. Fuori da Vercel non fa niente.
  attachDatabasePool(pool);
  return db;
}

// In dev l'HMR ricarica i moduli: riusa la connessione invece di aprirne una nuova ogni volta.
export const db: Db = globalForDb.db ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type { Db };
