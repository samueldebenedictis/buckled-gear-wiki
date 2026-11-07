"use client";

import { useActionState } from "react";
import {
  deleteUserAction,
  resetPasswordAction,
  setBannedAction,
  setRoleAction,
  type AdminActionState,
} from "@/app/actions/redazione-utenti";
import { dangerButtonClass, secondaryButtonClass } from "@/components/field";
import type { Role } from "@/db/schema/enums";
import { ActionFeedback } from "./action-feedback";

type Action = (
  prev: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

function ActionButton({
  action,
  label,
  fields,
  confirm,
  danger,
}: {
  action: Action;
  label: string;
  fields: Record<string, string>;
  confirm?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    {} as AdminActionState,
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        className={danger ? dangerButtonClass : secondaryButtonClass}
      >
        {pending ? "…" : label}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function UserActions({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    banned: boolean;
  };
}) {
  const id = { userId: user.id };
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionButton
        action={resetPasswordAction}
        label="Reimposta password"
        fields={{ ...id, email: user.email }}
        confirm={`Generare una nuova password temporanea per ${user.name}? Verrà disconnesso.`}
      />
      <ActionButton
        action={setRoleAction}
        label={
          user.role === "redattore" ? "Rendi utente" : "Promuovi a redattore"
        }
        fields={{
          ...id,
          role: user.role === "redattore" ? "utente" : "redattore",
        }}
        confirm={
          user.role === "redattore"
            ? `Togliere a ${user.name} i poteri di redazione?`
            : `Dare a ${user.name} tutti i poteri di redazione, compresa la gestione degli utenti?`
        }
      />
      <ActionButton
        action={setBannedAction}
        label={user.banned ? "Riattiva" : "Sospendi"}
        fields={{ ...id, banned: user.banned ? "false" : "true" }}
        confirm={
          user.banned
            ? undefined
            : `Sospendere ${user.name}? Verrà disconnesso subito.`
        }
      />
      <ActionButton
        action={deleteUserAction}
        label="Elimina"
        fields={id}
        danger
        confirm={`Eliminare definitivamente ${user.name} con equipaggiamento, feedback e proposte? Non si può annullare.`}
      />
    </div>
  );
}
