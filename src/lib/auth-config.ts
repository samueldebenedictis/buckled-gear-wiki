// Config di Better Auth come factory, senza "server-only", così la usano
// anche script di seed e test (con PGlite). L'app usa l'istanza in ./auth.ts.
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { ac, roles } from "./roles";

export const MIN_PASSWORD_LENGTH = 10;

/** Con la password temporanea si può solo entrare, uscire, leggere la sessione e cambiarla. */
const ALLOWED_WITH_TEMP_PASSWORD = new Set(["/sign-in/email", "/sign-out", "/get-session", "/change-password"]);

/**
 * Origini accettate oltre a BETTER_AUTH_URL: elenco facoltativo separato da virgole
 * (BETTER_AUTH_TRUSTED_ORIGINS) e, sulle anteprime Vercel, l'URL del deploy.
 */
function trustedOrigins() {
  const list = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.VERCEL_ENV === "preview") {
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) if (host) list.push(`https://${host}`);
  }
  return list;
}

export function createAuth(db: Db, opts: { secret?: string; baseURL?: string; nextCookies?: boolean } = {}) {
  return betterAuth({
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Niente registrazione: gli account li crea la redazione.
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        mustChangePassword: { type: "boolean", required: false, defaultValue: true, input: false },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ALLOWED_WITH_TEMP_PASSWORD.has(ctx.path)) return;
        const session = await getSessionFromCtx(ctx);
        if ((session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword) {
          throw new APIError("FORBIDDEN", { message: "Cambia prima la password temporanea." });
        }
      }),
    },
    plugins: [
      admin({ ac, roles, defaultRole: "utente", adminRoles: ["redattore"] }),
      // Deve restare l'ultimo: imposta i cookie quando si chiama auth.api da una Server Action.
      ...(opts.nextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
