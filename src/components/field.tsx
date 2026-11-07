import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { FormState } from "@/lib/form-state";

export const inputClass =
  "border border-black bg-white px-3 py-2 text-buckled-green focus:outline-2 focus:outline-buckled-yellow dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 aria-invalid:border-red-600";

function Errors({ errors }: { errors?: string[] }) {
  return errors?.map((e) => (
    <span key={e} className="text-sm text-red-600">
      {e}
    </span>
  ));
}

export function Field({
  label,
  errors,
  hint,
  required = true,
  type = "text",
  ...input
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        required={required}
        aria-invalid={errors ? true : undefined}
        className={inputClass}
        {...input}
      />
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      <Errors errors={errors} />
    </label>
  );
}

export function SelectField({
  label,
  errors,
  options,
  emptyLabel,
  ...select
}: {
  label: string;
  name: string;
  errors?: string[];
  options: readonly (readonly [value: string, label: string])[];
  /** Se presente, aggiunge un'opzione vuota (valore non impostato). */
  emptyLabel?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <select aria-invalid={errors ? true : undefined} className={inputClass} {...select}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <Errors errors={errors} />
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  );
}

/** Errore o conferma restituiti da una Server Action. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.error) return <FormError message={state.error} />;
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {state.ok}
      </p>
    );
  }
  return null;
}

// Pulsanti come su buckled.it: angoli vivi, DM Sans 900 maiuscolo.
export const buttonClass =
  "bg-buckled-green px-4 py-2 text-[13px] font-black tracking-wide text-white uppercase hover:bg-buckled-teal disabled:opacity-50 dark:bg-buckled-yellow dark:text-buckled-green dark:hover:bg-buckled-orange";

// Nel tema scuro (redazione) sfondo nero pieno: sopra la dot grid un pulsante
// trasparente non si legge.
export const secondaryButtonClass =
  "border border-black bg-white px-3 py-1.5 text-[13px] font-bold text-buckled-green hover:bg-buckled-paper disabled:opacity-50 dark:border-white/60 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-zinc-800";

export const dangerButtonClass =
  "border border-red-700 bg-white px-3 py-1.5 text-[13px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:bg-black dark:text-red-400 dark:hover:bg-red-950";
