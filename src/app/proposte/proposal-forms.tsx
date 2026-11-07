"use client";

import { useState } from "react";
import { proposeCorrectionAction, proposeNewProductAction } from "@/app/actions/utente";
import { buttonClass, Field, FormMessage, SelectField } from "@/components/field";
import { AttributeFields, GeneralFields, SpecsFields, type SpecsValues } from "@/components/product-fields";
import { useFormAction } from "@/components/use-form-action";
import type { Category } from "@/db/enum-values";
import { CATEGORY_LABELS, entries } from "@/lib/labels";

const textareaClass = "border border-black bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function Details({ category, specs, attributes, errors }: {
  category: Category;
  specs?: SpecsValues | null;
  attributes?: Record<string, unknown>;
  errors: Record<string, string[] | undefined> | undefined;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-sm font-bold uppercase">{category === "scarpe" ? "Specifiche" : "Caratteristiche"}</legend>
      {category === "scarpe" ? (
        <SpecsFields values={specs} errors={errors} />
      ) : (
        <AttributeFields category={category} values={attributes} errors={errors} />
      )}
    </fieldset>
  );
}

export function NewProductProposalForm() {
  const { state, onSubmit, pending } = useFormAction(proposeNewProductAction);
  const [category, setCategory] = useState<Category>("scarpe");
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Compila quello che sai, i campi oltre a brand e modello sono facoltativi. La redazione controlla i dati: se accetta,
        il prodotto entra nel catalogo.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Tipo"
          name="category"
          options={entries(CATEGORY_LABELS)}
          value={category}
          onChange={(ev) => setCategory(ev.target.value as Category)}
          errors={e?.category}
        />
        <Field label="Brand" name="brand" errors={e?.brand} placeholder="Hoka" />
        <Field label="Modello" name="model" errors={e?.model} placeholder="Speedgoat" />
        <Field label="Versione" name="version" required={false} errors={e?.version} placeholder="8" />
        <GeneralFields errors={e} />
      </div>
      {/* key: cambiando tipo si riparte da campi vuoti. */}
      <Details key={category} category={category} errors={e} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Note per la redazione</span>
        <textarea name="note" rows={2} className={textareaClass} placeholder="Link alla scheda del produttore, dettagli…" />
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Invio…" : "Proponi"}
      </button>
    </form>
  );
}

export type CorrectionTarget = {
  id: string;
  name: string;
  category: Category;
  product: { releaseYear: number | null; priceEur: number | null };
  specs: SpecsValues | null;
  attributes: Record<string, unknown>;
};

/** Scheda precompilata con i valori attuali: si cambia solo ciò che è sbagliato o manca. */
export function CorrectionForm({ target }: { target: CorrectionTarget }) {
  const { state, onSubmit, pending } = useFormAction(proposeCorrectionAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="productId" value={target.id} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        I campi mostrano la scheda attuale di <strong>{target.name}</strong>. Cambia o completa quelli che conosci: alla
        redazione arrivano solo le differenze.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <GeneralFields values={target.product} errors={e} />
      </div>
      <Details category={target.category} specs={target.specs} attributes={target.attributes} errors={e} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Nota (facoltativa)</span>
        <textarea name="note" rows={3} aria-invalid={e?.note ? true : undefined} className={textareaClass} placeholder="Fonte del dato, o cosa correggere se non c'è un campo" />
        {e?.note?.map((m) => <span key={m} className="text-sm text-red-600">{m}</span>)}
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Invio…" : "Invia correzione"}
      </button>
    </form>
  );
}
