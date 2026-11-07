"use client";

import type { FormState } from "@/lib/form-state";
import { useFormAction } from "./use-form-action";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Publish / Unpublish direttamente da una lista della redazione (catalogo, guide).
 * `fields`: campi nascosti che portano id e nuovo stato all'azione.
 */
export function PublishToggle({
  action,
  fields,
  published,
  name,
}: {
  action: Action;
  fields: Record<string, string>;
  published: boolean;
  name: string;
}) {
  const { state, onSubmit, pending } = useFormAction(
    action,
    published ? `Unpublish ${name}? Sparisce dalle pagine pubbliche.` : undefined,
  );
  return (
    <form onSubmit={onSubmit} className="flex shrink-0 flex-col items-end gap-1">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-label={`${published ? "Unpublish" : "Publish"} ${name}`}
        className={`w-[92px] border px-2 py-1 max-sm:w-[80px] text-[11px] font-black tracking-wide uppercase disabled:opacity-50 ${
          published
            ? "border-white/60 bg-black text-white hover:border-white hover:bg-zinc-800"
            : "border-buckled-yellow bg-buckled-yellow text-black hover:bg-buckled-orange"
        }`}
      >
        {pending ? "…" : published ? "Unpublish" : "Publish"}
      </button>
      {state.error && <span className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
