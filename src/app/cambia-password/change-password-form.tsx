"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { buttonClass, Field, FormError } from "@/components/field";
import type { FormState } from "@/lib/form-state";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field
        label="Password attuale"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.currentPassword}
      />
      <Field
        label="Nuova password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.newPassword}
      />
      <Field
        label="Ripeti la nuova password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Salvataggio…" : "Cambia password"}
      </button>
    </form>
  );
}
