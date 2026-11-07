"use client";

import {
  addGuideItemAction,
  createGuideAction,
  deleteGuideAction,
  moveGuideItemAction,
  removeGuideItemAction,
  updateGuideAction,
  updateGuideItemAction,
} from "@/app/actions/redazione-guide";
import {
  buttonClass,
  dangerButtonClass,
  Field,
  FormMessage,
  secondaryButtonClass,
  inputClass,
} from "@/components/field";
import { ProductSelect, type SelectableProduct } from "@/components/product-select";
import { useFormAction } from "@/components/use-form-action";

const box = "flex flex-col gap-4 card p-4";
const textarea = `${inputClass} font-mono text-sm`;

type Guide = {
  id: string;
  title: string;
  introMd: string;
  whyMd: string;
  sourceUrl: string | null;
  updatedOn: string | null;
  published: boolean;
};

export function GuideForm({ guide }: { guide?: Guide }) {
  const { state, onSubmit, pending } = useFormAction(guide ? updateGuideAction : createGuideAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className={guide ? box : "flex flex-col gap-4"}>
      {guide && <h2 className="text-lg font-semibold">Dati della guida</h2>}
      {guide && <input type="hidden" name="guideId" value={guide.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titolo" name="title" defaultValue={guide?.title ?? ""} errors={e?.title} />
        <Field label="Aggiornata il" name="updatedOn" type="date" required={false} defaultValue={guide?.updatedOn ?? ""} errors={e?.updatedOn} />
        <Field label="Pagina originale su buckled.it" name="sourceUrl" type="url" required={false} defaultValue={guide?.sourceUrl ?? ""} errors={e?.sourceUrl} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Introduzione (Markdown)</span>
        <textarea name="introMd" rows={4} defaultValue={guide?.introMd ?? ""} className={textarea} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">The why (Markdown, facoltativo)</span>
        <textarea name="whyMd" rows={6} defaultValue={guide?.whyMd ?? ""} className={textarea} />
        <span className="text-xs text-zinc-500">Perché esiste la guida e come leggerla. Nella pagina è un riquadro apribile.</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={guide?.published ?? false} />
        Pubblicata (visibile a tutti)
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : guide ? "Salva" : "Crea guida"}
      </button>
    </form>
  );
}

export function DeleteGuide({ guideId, title }: { guideId: string; title: string }) {
  const { onSubmit, pending } = useFormAction(deleteGuideAction, `Eliminare la guida "${title}"? I prodotti restano nel catalogo.`);
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="guideId" value={guideId} />
      <button type="submit" disabled={pending} className={dangerButtonClass}>
        Elimina guida
      </button>
    </form>
  );
}

type Item = { productId: string; name: string; status: "bozza" | "pubblicato"; award: string | null; badges: string[]; noteMd: string };

function ItemFields({ item, errors }: { item?: Item; errors?: Record<string, string[] | undefined> }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Premio" name="award" required={false} defaultValue={item?.award ?? ""} errors={errors?.award} placeholder="Jack of all trades" />
        <Field
          label="Badge"
          name="badges"
          required={false}
          defaultValue={item?.badges.join(", ") ?? ""}
          errors={errors?.badges}
          hint="Separati da virgola, es. el cheapo, king of stamina"
          list="badge-list"
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Nota della redazione (Markdown)</span>
        <textarea name="noteMd" rows={3} defaultValue={item?.noteMd ?? ""} className={textarea} />
      </label>
    </>
  );
}

export function GuideItemEditor({ guideId, item, first, last }: { guideId: string; item: Item; first: boolean; last: boolean }) {
  const save = useFormAction(updateGuideItemAction);
  const remove = useFormAction(removeGuideItemAction, `Togliere ${item.name} dalla guida?`);
  const move = useFormAction(moveGuideItemAction);
  const ids = (
    <>
      <input type="hidden" name="guideId" value={guideId} />
      <input type="hidden" name="productId" value={item.productId} />
    </>
  );
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={item.status === "bozza" ? "text-zinc-400" : "font-medium"}>{item.name}</span>
        {item.status === "bozza" && <span className="text-xs text-zinc-500">(bozza: non compare in pubblico)</span>}
        <span className="ml-auto flex gap-1">
          {(["up", "down"] as const).map((dir) => (
            <form key={dir} onSubmit={move.onSubmit}>
              {ids}
              <input type="hidden" name="direction" value={dir} />
              <button
                type="submit"
                disabled={move.pending || (dir === "up" ? first : last)}
                aria-label={dir === "up" ? "Sposta su" : "Sposta giù"}
                className={secondaryButtonClass}
              >
                {dir === "up" ? "↑" : "↓"}
              </button>
            </form>
          ))}
          <form onSubmit={remove.onSubmit}>
            {ids}
            <button type="submit" disabled={remove.pending} className={dangerButtonClass}>
              Togli
            </button>
          </form>
        </span>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400">
          {[item.award && `Premio: ${item.award}`, item.badges.length && item.badges.join(", ")].filter(Boolean).join(" · ") ||
            "Premio, badge, nota"}
        </summary>
        <form onSubmit={save.onSubmit} className="mt-3 flex flex-col gap-3">
          {ids}
          <ItemFields item={item} errors={save.state.fieldErrors} />
          <FormMessage state={save.state} />
          <button type="submit" disabled={save.pending} className={`${secondaryButtonClass} self-start`}>
            Salva
          </button>
        </form>
      </details>
    </li>
  );
}

export function AddGuideItem({ guideId, products, badges }: { guideId: string; products: SelectableProduct[]; badges: string[] }) {
  const { state, onSubmit, pending } = useFormAction(addGuideItemAction);
  return (
    <form onSubmit={onSubmit} className={box}>
      <h2 className="text-lg font-semibold">Aggiungi un prodotto</h2>
      <input type="hidden" name="guideId" value={guideId} />
      <ProductSelect name="productId" label="Prodotto" products={products} errors={state.fieldErrors?.productId} />
      <ItemFields errors={state.fieldErrors} />
      <datalist id="badge-list">
        {badges.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        Aggiungi
      </button>
    </form>
  );
}
