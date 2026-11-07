// Gestione utenti da parte della redazione. Senza dipendenze da Next, così si
// testa con PGlite. I permessi li verifica anche Better Auth (plugin admin) sugli
// header della sessione del redattore; qui aggiungiamo le regole dell'app.
import { randomInt } from "node:crypto";
import { asc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { user } from "@/db/schema";
import type { Role } from "@/db/schema/enums";
import type { Auth } from "./auth-config";

export type AdminContext = { auth: Auth; db: Db; headers: Headers; actorId: string };

export class AdminError extends Error {}

// Niente caratteri ambigui (0/O, 1/l/I): la password si detta o si scrive a mano.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Password temporanea leggibile, es. "k7wd-m3pq-xh2r" (≈ 59 bit). */
export function generateTempPassword(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return [group(), group(), group()].join("-");
}

/** Pattern ILIKE "contiene", con % e _ trattati come testo. */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

/** `q`: filtro facoltativo su nickname o email (contiene, senza maiuscole). */
export async function listUsers(db: Db, q?: string) {
  // Solo dati dell'account: equipaggiamenti e feedback non sono mai visibili alla redazione.
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(q ? or(ilike(user.name, contains(q)), ilike(user.email, contains(q))) : undefined)
    .orderBy(asc(user.name));
}

function notSelf(ctx: AdminContext, userId: string, what: string) {
  if (userId === ctx.actorId) throw new AdminError(`Non puoi ${what} il tuo account.`);
}

export async function createUser(
  ctx: AdminContext,
  input: { name: string; email: string; role: Role },
) {
  const [existing] = await ctx.db.select({ id: user.id }).from(user).where(eq(user.email, input.email));
  if (existing) throw new AdminError("Esiste già un utente con questa email.");

  const password = generateTempPassword();
  const res = await ctx.auth.api.createUser({
    headers: ctx.headers,
    body: { ...input, password },
  });
  return { userId: res.user.id, password };
}

/** Nuova password temporanea: l'utente dovrà cambiarla e viene disconnesso ovunque. */
export async function resetPassword(ctx: AdminContext, userId: string) {
  notSelf(ctx, userId, "reimpostare la password del");
  const password = generateTempPassword();
  await ctx.auth.api.setUserPassword({ headers: ctx.headers, body: { userId, newPassword: password } });
  await ctx.db.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
  await ctx.auth.api.revokeUserSessions({ headers: ctx.headers, body: { userId } });
  return { password };
}

export async function setBanned(ctx: AdminContext, userId: string, banned: boolean) {
  notSelf(ctx, userId, "sospendere");
  if (banned) {
    // banUser revoca anche tutte le sessioni dell'utente.
    await ctx.auth.api.banUser({ headers: ctx.headers, body: { userId } });
  } else {
    await ctx.auth.api.unbanUser({ headers: ctx.headers, body: { userId } });
  }
}

export async function setRole(ctx: AdminContext, userId: string, role: Role) {
  // Impedisce anche di restare senza redattori: chi agisce resta sempre redattore.
  notSelf(ctx, userId, "cambiare il ruolo del");
  await ctx.auth.api.setRole({ headers: ctx.headers, body: { userId, role } });
}

/** Elimina l'utente con equipaggiamento, feedback e proposte (cascade). Irreversibile. */
export async function deleteUser(ctx: AdminContext, userId: string) {
  notSelf(ctx, userId, "eliminare");
  await ctx.auth.api.removeUser({ headers: ctx.headers, body: { userId } });
}
