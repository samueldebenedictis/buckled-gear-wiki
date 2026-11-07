"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { buttonClass, Field, FormError } from "@/components/field";
import type { FormState } from "@/lib/form-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="username" errors={state.fieldErrors?.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Accesso…" : "Accedi"}
      </button>
    </form>
  );
}
