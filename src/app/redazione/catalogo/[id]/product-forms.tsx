"use client";

import {
  addAliasAction,
  deleteProductAction,
  removeAliasAction,
  removeImageAction,
  renameBrandAction,
  saveAttributesAction,
  renameModelAction,
  saveSpecsAction,
  setStatusAction,
  updateProductAction,
  uploadImageAction,
} from "@/app/actions/redazione-catalogo";
import {
  buttonClass,
  dangerButtonClass,
  Field,
  FormMessage,
  secondaryButtonClass,
} from "@/components/field";
import { ProductImage } from "@/components/product-image";
import { AttributeFields, SpecsFields, str } from "@/components/product-fields";
import { useFormAction } from "@/components/use-form-action";
import type { getProductAdmin } from "@/lib/admin-catalog";

type Product = NonNullable<Awaited<ReturnType<typeof getProductAdmin>>>;

const sectionClass = "flex flex-col gap-4 card p-4";

export function ProductForm({ p }: { p: Product }) {
  const { state, onSubmit, pending } = useFormAction(updateProductAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className={sectionClass}>
      <h2 className="text-lg font-semibold">Dati prodotto</h2>
      <input type="hidden" name="productId" value={p.product.id} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {p.brand} → {p.model} · indirizzo pubblico: <code>/scarpe/{p.product.slug}</code> (non cambia)
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome mostrato" name="displayName" defaultValue={p.product.displayName} errors={e?.displayName} />
        <Field label="Versione" name="version" required={false} defaultValue={p.product.version} errors={e?.version} />
        <Field label="Anno" name="releaseYear" type="number" inputMode="numeric" required={false} defaultValue={str(p.product.releaseYear)} errors={e?.releaseYear} />
        <Field label="Prezzo (€)" name="priceEur" inputMode="decimal" required={false} defaultValue={p.product.priceEur == null ? "" : String(p.product.priceEur).replace(".", ",")} errors={e?.priceEur} />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}

export function SpecsForm({ p }: { p: Product }) {
  const { state, onSubmit, pending } = useFormAction(saveSpecsAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className={sectionClass}>
      <h2 className="text-lg font-semibold">Specifiche</h2>
      <input type="hidden" name="productId" value={p.product.id} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Tutti i campi sono facoltativi.</p>
      <SpecsFields values={p.specs} errors={e} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : "Salva specifiche"}
      </button>
    </form>
  );
}

export function AliasesSection({ p }: { p: Product }) {
  const add = useFormAction(addAliasAction);
  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-semibold">Alias</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Nomi alternativi per la ricerca, es. &quot;sg7&quot; o &quot;speedgoat VII&quot;. Ogni alias appartiene a un solo prodotto.
      </p>
      {p.aliases.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {p.aliases.map((a) => (
            <AliasChip key={a} productId={p.product.id} alias={a} />
          ))}
        </ul>
      )}
      <form onSubmit={add.onSubmit} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="productId" value={p.product.id} />
        <Field label="Nuovo alias" name="alias" autoComplete="off" errors={add.state.fieldErrors?.alias} />
        <button type="submit" disabled={add.pending} className={secondaryButtonClass}>
          Aggiungi
        </button>
      </form>
      <FormMessage state={add.state} />
    </section>
  );
}

function AliasChip({ productId, alias }: { productId: string; alias: string }) {
  const { onSubmit, pending } = useFormAction(removeAliasAction);
  return (
    <li>
      <form onSubmit={onSubmit} className="flex items-center gap-1 bg-zinc-100 py-0.5 pr-1 pl-2 text-sm dark:bg-zinc-800">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="alias" value={alias} />
        {alias}
        <button type="submit" disabled={pending} aria-label={`Rimuovi ${alias}`} className="px-1 text-zinc-500 hover:text-red-600">
          ×
        </button>
      </form>
    </li>
  );
}

/** Stato in cima alla scheda: le bozze non compaiono in pubblico. */
export function StatusBar({ p }: { p: Product }) {
  const draft = p.product.status === "bozza";
  const { state, onSubmit, pending } = useFormAction(
    setStatusAction,
    draft ? undefined : `Rimettere in bozza ${p.product.displayName}? Sparirà dal catalogo pubblico ma i dati restano.`,
  );
  return (
    <section
      className={`flex flex-wrap items-center gap-3 border border-black p-4 ${draft ? "bg-buckled-yellow text-black" : "bg-white text-black"}`}
    >
      <p className="flex-1 text-sm">
        <strong className="uppercase">{draft ? "Bozza" : "Pubblicato"}</strong>
        {" · "}
        {draft ? "visibile solo alla redazione. Controlla i dati e pubblica." : "visibile nel catalogo pubblico."}
      </p>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="productId" value={p.product.id} />
        <input type="hidden" name="status" value={draft ? "pubblicato" : "bozza"} />
        {/* Colori fissi: il riquadro è chiaro anche nel tema scuro della redazione. */}
        <button
          type="submit"
          disabled={pending}
          className={`border border-black px-4 py-2 text-[13px] font-black tracking-wide uppercase disabled:opacity-50 ${
            draft ? "bg-black text-white hover:bg-buckled-green" : "bg-white text-black hover:bg-black hover:text-white"
          }`}
        >
          {draft ? "Publish" : "Unpublish"}
        </button>
      </form>
      <div className="w-full empty:hidden">
        <FormMessage state={state} />
      </div>
    </section>
  );
}

export function DangerZone({ p }: { p: Product }) {
  const del = useFormAction(
    deleteProductAction,
    `Eliminare definitivamente ${p.product.displayName}? Non si può annullare.`,
  );
  const canDelete = p.gearCount === 0 && p.reviewCount === 0;
  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-semibold">Eliminazione</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        In {p.gearCount} {p.gearCount === 1 ? "equipaggiamento" : "equipaggiamenti"} · {p.reviewCount}{" "}
        {p.reviewCount === 1 ? "recensione" : "recensioni"}.{" "}
        {canDelete
          ? "Non è usato da nessuno: puoi eliminarlo se è stato creato per errore. Una proposta ancora aperta su questo prodotto viene rifiutata."
          : "Essendo in uso non si può eliminare: rimettilo in bozza per toglierlo dal catalogo."}
      </p>
      {canDelete && (
        <form onSubmit={del.onSubmit}>
          <input type="hidden" name="productId" value={p.product.id} />
          <button type="submit" disabled={del.pending} className={dangerButtonClass}>
            Elimina
          </button>
        </form>
      )}
      <FormMessage state={del.state} />
    </section>
  );
}

export function RenameSection({ p }: { p: Product }) {
  const brand = useFormAction(renameBrandAction);
  const model = useFormAction(renameModelAction);
  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-semibold">Brand e modello</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Valgono per tutti i prodotti dello stesso brand o modello. I nomi mostrati generati in automatico si aggiornano;
        gli indirizzi pubblici no.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <form onSubmit={brand.onSubmit} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={p.brandId} />
          <Field label="Brand" name="name" defaultValue={p.brand} errors={brand.state.fieldErrors?.name} />
          <button type="submit" disabled={brand.pending} className={`${secondaryButtonClass} self-start`}>
            Rinomina brand
          </button>
          <FormMessage state={brand.state} />
        </form>
        <form onSubmit={model.onSubmit} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={p.product.modelId} />
          <Field label="Modello" name="name" defaultValue={p.model} errors={model.state.fieldErrors?.name} />
          <button type="submit" disabled={model.pending} className={`${secondaryButtonClass} self-start`}>
            Rinomina modello
          </button>
          <FormMessage state={model.state} />
        </form>
      </div>
    </section>
  );
}

/** Caratteristiche delle categorie diverse dalle scarpe, generate da src/lib/categories.ts. */
export function AttributesForm({ p }: { p: Product }) {
  const { state, onSubmit, pending } = useFormAction(saveAttributesAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className={sectionClass}>
      <h2 className="text-lg font-semibold">Caratteristiche</h2>
      <input type="hidden" name="productId" value={p.product.id} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Tutti i campi sono facoltativi.</p>
      <AttributeFields category={p.category} values={p.product.attributes} errors={e} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : "Salva caratteristiche"}
      </button>
    </form>
  );
}

export function ImageSection({ p }: { p: Product }) {
  const upload = useFormAction(uploadImageAction);
  const remove = useFormAction(removeImageAction, "Togliere la foto dal prodotto?");
  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-semibold">Foto</h2>
      {/* Come nelle schede pubbliche: foto su fondo bianco con la griglia. */}
      <div className="max-w-md border border-white/25 bg-white bg-[url(/bg/gridme.png)] bg-center p-4">
        <ProductImage src={p.product.imagePath} alt={p.product.displayName} plain sizes="(min-width: 768px) 450px, 100vw" className="aspect-4/3 w-full" />
      </div>
      <form onSubmit={upload.onSubmit} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="productId" value={p.product.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{p.product.imagePath ? "Sostituisci" : "Carica"} (PNG, JPEG, WebP, AVIF, max 4 MB)</span>
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/avif" required
            className="text-sm text-zinc-300 file:mr-3 file:cursor-pointer file:border file:border-white/60 file:bg-black file:px-3 file:py-1.5 file:text-[13px] file:font-bold file:text-white hover:file:bg-zinc-800"
          />
          {upload.state.fieldErrors?.image?.map((m) => (
            <span key={m} className="text-red-500">{m}</span>
          ))}
        </label>
        <button type="submit" disabled={upload.pending} className={buttonClass}>
          {upload.pending ? "Caricamento…" : "Carica"}
        </button>
      </form>
      {p.product.imagePath && (
        <form onSubmit={remove.onSubmit}>
          <input type="hidden" name="productId" value={p.product.id} />
          <button type="submit" disabled={remove.pending} className={secondaryButtonClass}>
            Togli la foto
          </button>
        </form>
      )}
      <FormMessage state={upload.state} />
      <FormMessage state={remove.state} />
    </section>
  );
}
