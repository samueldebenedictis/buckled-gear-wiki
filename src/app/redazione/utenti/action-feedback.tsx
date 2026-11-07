import type { AdminActionState } from "@/app/actions/redazione-utenti";

export function ActionFeedback({ state }: { state: AdminActionState }) {
  if (state.tempPassword) {
    return (
      <div role="status" className="border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950">
        <p>
          Password temporanea per <strong>{state.tempPassword.email}</strong>:
        </p>
        <p className="my-1 font-mono text-base select-all">{state.tempPassword.password}</p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Comunicala a mano: non verrà mostrata di nuovo. Al primo accesso l&apos;utente dovrà cambiarla.
        </p>
      </div>
    );
  }
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {state.ok}
      </p>
    );
  }
  return null;
}
