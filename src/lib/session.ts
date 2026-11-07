// Data Access Layer per l'autenticazione: ogni pagina protetta, Server Action e
// Route Handler passa da requireUser() / requireRedattore().
import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "./auth";
import { checkAccess, isRole, type Requirement, type SessionUser } from "./permissions";

/** Utente della sessione corrente, o null. Deduplicato per richiesta. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Better Auth confronta la scadenza con l'ora attuale: va calcolato a ogni richiesta,
  // non nel prerender (Cache Components lo segnala come valore instabile).
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: isRole(u.role) ? u.role : "utente",
    mustChangePassword: u.mustChangePassword ?? true,
    banned: u.banned ?? false,
  };
});

async function requireAccess(need: Requirement, allowPendingPasswordChange = false) {
  const user = await getCurrentUser();
  const result = checkAccess(user, need, { allowPendingPasswordChange });
  if (result === "login") redirect("/login");
  if (result === "change-password") redirect("/cambia-password");
  if (result === "forbidden") forbidden();
  return user!;
}

export const requireUser = () => requireAccess("utente");
export const requireRedattore = () => requireAccess("redattore");
/** Solo per la pagina di cambio password: accetta utenti con mustChangePassword. */
export const requireUserPendingPasswordChange = () => requireAccess("utente", true);
