"use client";

import { useActionState } from "react";
import { createUserAction, type AdminActionState } from "@/app/actions/redazione-utenti";
import { buttonClass, Field, inputClass } from "@/components/field";
import { ActionFeedback } from "./action-feedback";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {} as AdminActionState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nickname" name="name" autoComplete="off" errors={state.fieldErrors?.name} />
        <Field label="Email" name="email" type="email" autoComplete="off" errors={state.fieldErrors?.email} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Ruolo</span>
        <select
          name="role"
          defaultValue="utente"
          className={inputClass}
        >
          <option value="utente">Utente</option>
          <option value="redattore">Redattore</option>
        </select>
      </label>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        La password temporanea viene generata e mostrata qui sotto una sola volta.
      </p>
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Creazione…" : "Crea utente"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
