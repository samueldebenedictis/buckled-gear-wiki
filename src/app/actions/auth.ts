"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { requireUserPendingPasswordChange } from "@/lib/session";
import { changePasswordSchema, loginSchema } from "@/lib/validation/auth";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let mustChangePassword: boolean;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    mustChangePassword = res.user.mustChangePassword ?? true;
  } catch (e) {
    if (e instanceof APIError) {
      // Non distinguere "utente inesistente" da "password errata".
      if (e.status === "FORBIDDEN") return { error: "Account sospeso. Contatta la redazione." };
      return { error: "Email o password non corretti." };
    }
    throw e;
  }
  redirect(mustChangePassword ? "/cambia-password" : "/");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await requireUserPendingPasswordChange();

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) return { error: "Password attuale non corretta." };
    throw e;
  }

  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, current.id));
  redirect("/");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
