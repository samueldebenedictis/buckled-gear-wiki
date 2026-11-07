"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import * as admin from "@/lib/admin-users";
import { auth } from "@/lib/auth";
import { requireRedattore } from "@/lib/session";
import {
  createUserSchema,
  setBannedSchema,
  setRoleSchema,
  userIdSchema,
} from "@/lib/validation/admin-users";

export type AdminActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Password temporanea da comunicare all'utente: mostrata una volta sola. */
  tempPassword?: { email: string; password: string };
  ok?: string;
};

async function context(): Promise<admin.AdminContext> {
  const actor = await requireRedattore();
  return { auth, db, headers: await headers(), actorId: actor.id };
}

/** Converte gli errori previsti in messaggi per la UI; rilancia gli altri. */
function toState(e: unknown): AdminActionState {
  if (e instanceof admin.AdminError) return { error: e.message };
  if (e instanceof APIError) return { error: `Operazione non riuscita: ${e.message}` };
  throw e;
}

export async function createUserAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await context();
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    const { password } = await admin.createUser(ctx, parsed.data);
    refresh();
    return { tempPassword: { email: parsed.data.email, password } };
  } catch (e) {
    return toState(e);
  }
}

export async function resetPasswordAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await context();
  const { userId } = userIdSchema.parse(Object.fromEntries(formData));
  try {
    const { password } = await admin.resetPassword(ctx, userId);
    refresh();
    return { tempPassword: { email: String(formData.get("email") ?? ""), password } };
  } catch (e) {
    return toState(e);
  }
}

export async function setBannedAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await context();
  const { userId, banned } = setBannedSchema.parse(Object.fromEntries(formData));
  try {
    await admin.setBanned(ctx, userId, banned === "true");
    refresh();
    return { ok: banned === "true" ? "Utente sospeso." : "Utente riattivato." };
  } catch (e) {
    return toState(e);
  }
}

export async function setRoleAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await context();
  const { userId, role } = setRoleSchema.parse(Object.fromEntries(formData));
  try {
    await admin.setRole(ctx, userId, role);
    refresh();
    return { ok: role === "redattore" ? "Promosso a redattore." : "Ora è un utente." };
  } catch (e) {
    return toState(e);
  }
}

export async function deleteUserAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const ctx = await context();
  const { userId } = userIdSchema.parse(Object.fromEntries(formData));
  try {
    await admin.deleteUser(ctx, userId);
    refresh();
    return { ok: "Utente eliminato." };
  } catch (e) {
    return toState(e);
  }
}
