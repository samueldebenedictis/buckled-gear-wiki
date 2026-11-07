"use client";

import { updateProfileAction } from "@/app/actions/utente";
import { buttonClass, Field, FormMessage } from "@/components/field";
import { useFormAction } from "@/components/use-form-action";

export function ProfileForm({ profile }: { profile: { name: string } }) {
  const { state, onSubmit, pending } = useFormAction(updateProfileAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Nickname" name="name" defaultValue={profile.name} errors={e?.name} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
