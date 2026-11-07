"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { setStatusManyAction } from "@/app/actions/redazione-catalogo";
import type { FormState } from "@/lib/form-state";

export const BULK_FORM = "bulk-status";

const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM}"][name="ids"]`)];

/**
 * Selezione multipla: le caselle delle righe appartengono a questo form tramite
 * l'attributo `form`, così ogni riga può avere anche il suo form Publish/Unpublish.
 */
export function BulkBar() {
  const [state, dispatch, pending] = useActionState(setStatusManyAction, {} as FormState);
  const [selected, setSelected] = useState(0);
  const [total, setTotal] = useState(0);

  const recount = () => {
    const all = boxes();
    setSelected(all.filter((b) => b.checked).length);
    setTotal(all.length);
  };
  // Le caselle sono nelle righe (server): si ascoltano i loro cambi sul documento.
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e.target as HTMLElement).getAttribute("form") !== BULK_FORM) return;
      const all = boxes();
      setSelected(all.filter((b) => b.checked).length);
      setTotal(all.length);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  const toggleAll = (on: boolean) => {
    for (const b of boxes()) b.checked = on;
    recount();
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(e.currentTarget, submitter);
    if (formData.get("status") === "bozza" && !window.confirm(`Unpublish ${selected} prodotti? Spariscono dal catalogo pubblico.`)) return;
    startTransition(() => dispatch(formData));
    toggleAll(false);
  };

  const btn = "border px-3 py-1 text-[11px] font-black tracking-wide uppercase disabled:opacity-40";
  return (
    <form id={BULK_FORM} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2 pl-3">
        <input
          type="checkbox"
          className="size-4 accent-buckled-yellow"
          checked={selected > 0 && selected === total}
          onChange={(e) => toggleAll(e.target.checked)}
          aria-label="Seleziona tutti"
        />
        <span className="text-zinc-400">{selected ? `${selected} selezionati` : "Seleziona"}</span>
      </label>
      <button type="submit" name="status" value="pubblicato" disabled={!selected || pending} className={`${btn} border-buckled-yellow bg-buckled-yellow text-black hover:bg-buckled-orange`}>
        Publish
      </button>
      <button type="submit" name="status" value="bozza" disabled={!selected || pending} className={`${btn} border-white/60 bg-black text-white hover:bg-zinc-800`}>
        Unpublish
      </button>
      {state.error && <span className="text-xs text-red-400">{state.error}</span>}
      {state.ok && <span className="text-xs text-zinc-400">{state.ok}</span>}
    </form>
  );
}
