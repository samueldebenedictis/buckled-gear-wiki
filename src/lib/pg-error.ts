/** Codice e vincolo di un errore Postgres, anche se avvolto da Drizzle (in `cause`). */
export function pgError(e: unknown): { code?: string; constraint?: string } | undefined {
  let cur: unknown = e;
  while (cur && typeof cur === "object") {
    const c = cur as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof c.code === "string" && /^[0-9A-Z]{5}$/.test(c.code)) {
      return { code: c.code, constraint: typeof c.constraint === "string" ? c.constraint : undefined };
    }
    cur = c.cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FK_VIOLATION = "23503";
/** Chiave esterna con ON DELETE RESTRICT. */
export const PG_RESTRICT_VIOLATION = "23001";

export function isReferencedError(e: unknown) {
  const code = pgError(e)?.code;
  return code === PG_FK_VIOLATION || code === PG_RESTRICT_VIOLATION;
}
