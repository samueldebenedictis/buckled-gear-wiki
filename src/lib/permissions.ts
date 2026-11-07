// Regole di accesso pure (senza Next), testabili in isolamento.
// Il punto unico di controllo nell'app è src/lib/session.ts, che le applica.
import type { Role } from "@/db/schema/enums";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  banned: boolean;
};

export type Requirement = "utente" | "redattore";

export type AccessResult = "ok" | "login" | "change-password" | "forbidden";

export function checkAccess(
  user: SessionUser | null,
  need: Requirement,
  opts: { allowPendingPasswordChange?: boolean } = {},
): AccessResult {
  if (!user || user.banned) return "login";
  if (user.mustChangePassword && !opts.allowPendingPasswordChange) return "change-password";
  if (need === "redattore" && user.role !== "redattore") return "forbidden";
  return "ok";
}

export function isRole(value: unknown): value is Role {
  return value === "utente" || value === "redattore";
}
