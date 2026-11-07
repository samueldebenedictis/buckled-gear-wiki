"use client";

import { createProductAction } from "@/app/actions/redazione-catalogo";
import { buttonClass, Field, FormMessage, SelectField } from "@/components/field";
import { useFormAction } from "@/components/use-form-action";
import { CATEGORY_LABELS, entries } from "@/lib/labels";

export function CreateProductForm({ brands, models }: { brands: string[]; models: string[] }) {
  const { state, onSubmit, pending } = useFormAction(createProductAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Brand e modello si riusano se esistono già (anche scritti con maiuscole diverse). Per una nuova versione
        di un modello esistente, scrivi lo stesso modello e cambia la versione.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Categoria" name="category" options={entries(CATEGORY_LABELS)} defaultValue="scarpe" errors={e?.category} />
        <Field label="Prezzo (€)" name="priceEur" inputMode="decimal" required={false} errors={e?.priceEur} placeholder="149,90" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Brand" name="brand" list="brand-list" autoComplete="off" errors={e?.brand} placeholder="Hoka" />
        <Field label="Modello" name="model" list="model-list" autoComplete="off" errors={e?.model} placeholder="Speedgoat" />
        <Field label="Versione" name="version" required={false} autoComplete="off" errors={e?.version} placeholder="7" hint="Vuota se il modello non ha versioni" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome mostrato" name="displayName" required={false} errors={e?.displayName} hint="Vuoto = brand + modello + versione" />
        <Field label="Anno" name="releaseYear" type="number" inputMode="numeric" required={false} errors={e?.releaseYear} />
      </div>
      <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Creazione…" : "Crea prodotto"}
      </button>
    </form>
  );
}
