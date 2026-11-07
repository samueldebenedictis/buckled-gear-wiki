import "server-only";
import { createDb, type Db } from "./client";

const globalForDb = globalThis as unknown as { db?: Db };

// In dev l'HMR ricarica i moduli: riusa la connessione invece di aprirne una nuova ogni volta.
export const db: Db = globalForDb.db ?? createDb(process.env.DATABASE_URL!).db;
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type { Db };
