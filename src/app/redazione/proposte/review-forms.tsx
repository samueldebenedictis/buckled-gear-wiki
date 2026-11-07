"use client";

import {
  applyCorrectionAction,
  approveNewProductAction,
  markCorrectionAppliedAction,
  mergeProposalAction,
  rejectProposalAction,
} from "@/app/actions/redazione-proposte";
import {
  buttonClass,
  dangerButtonClass,
  Field,
  FormMessage,
  secondaryButtonClass,
  SelectField,
} from "@/components/field";
import { ProductSelect, type SelectableProduct } from "@/components/product-select";
import { priceStr } from "@/components/product-fields";
import { useFormAction } from "@/components/use-form-action";
import { CATEGORY_LABELS, entries } from "@/lib/labels";
import type { NewProductPayload } from "@/lib/validation/proposal";

export function NewProductReview({
  proposalId,
  payload,
  products,
}: {
  proposalId: string;
  payload: NewProductPayload;
  products: SelectableProduct[];
}) {
  const approve = useFormAction(approveNewProductAction);
  const merge = useFormAction(mergeProposalAction);
  const reject = useFormAction(rejectProposalAction, "Rifiutare la proposta?");
  const e = approve.state.fieldErrors;
  return (
    <div className="flex flex-col gap-4">
      <details className="card p-3">
        <summary className="cursor-pointer font-medium">Accetta e crea la bozza</summary>
        <p className="mt-2 text-xs text-zinc-500">
          Correggi qui i dati generali se serve. Specifiche e caratteristiche proposte passano nella bozza, che poi controlli e
          pubblichi dalla sua scheda.
        </p>
        <form onSubmit={approve.onSubmit} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="proposalId" value={proposalId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField label="Tipo" name="category" options={entries(CATEGORY_LABELS)} defaultValue={payload.category ?? "scarpe"} errors={e?.category} />
            <Field label="Brand" name="brand" defaultValue={payload.brand} errors={e?.brand} />
            <Field label="Modello" name="model" defaultValue={payload.model} errors={e?.model} />
            <Field label="Versione" name="version" required={false} defaultValue={payload.version} errors={e?.version} />
            <Field label="Nome mostrato" name="displayName" required={false} errors={e?.displayName} hint="Vuoto = brand + modello + versione" />
            <Field label="Anno" name="releaseYear" type="number" required={false} defaultValue={payload.releaseYear ?? ""} errors={e?.releaseYear} />
            <Field label="Prezzo (€)" name="priceEur" inputMode="decimal" required={false} defaultValue={priceStr(payload.priceEur)} errors={e?.priceEur} />
          </div>
          <FormMessage state={approve.state} />
          <button type="submit" disabled={approve.pending} className={`${buttonClass} self-start`}>
            Accetta: crea la bozza
          </button>
        </form>
      </details>
      <details className="card p-3">
        <summary className="cursor-pointer font-medium">Unisci a un prodotto esistente</summary>
        <form onSubmit={merge.onSubmit} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="proposalId" value={proposalId} />
          <ProductSelect name="targetProductId" label="È in realtà" products={products} errors={merge.state.fieldErrors?.targetProductId} />
          <p className="text-xs text-zinc-500">Il nome proposto diventa un alias, così la ricerca lo troverà.</p>
          <FormMessage state={merge.state} />
          <button type="submit" disabled={merge.pending} className={`${secondaryButtonClass} self-start`}>
            Unisci
          </button>
        </form>
      </details>
      <RejectForm proposalId={proposalId} form={reject} />
    </div>
  );
}

/**
 * `structured`: la correzione ha campi da applicare con un clic. Per modificarli prima,
 * si corregge a mano nel catalogo e si segna come applicata.
 */
export function CorrectionReview({ proposalId, structured }: { proposalId: string; structured: boolean }) {
  const apply = useFormAction(applyCorrectionAction);
  const applied = useFormAction(markCorrectionAppliedAction);
  const reject = useFormAction(rejectProposalAction, "Rifiutare la correzione?");
  return (
    <div className="flex flex-col gap-3">
      {structured && (
        <form onSubmit={apply.onSubmit} className="flex flex-col gap-3 card p-3">
          <input type="hidden" name="proposalId" value={proposalId} />
          <FormMessage state={apply.state} />
          <button type="submit" disabled={apply.pending} className={`${buttonClass} self-start`}>
            Applica le modifiche
          </button>
        </form>
      )}
      <details className="card p-3" open={!structured}>
        <summary className="cursor-pointer font-medium">Corretta a mano nel catalogo</summary>
        <form onSubmit={applied.onSubmit} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="proposalId" value={proposalId} />
          <FormMessage state={applied.state} />
          <button type="submit" disabled={applied.pending} className={`${secondaryButtonClass} self-start`}>
            Segna come applicata
          </button>
        </form>
      </details>
      <RejectForm proposalId={proposalId} form={reject} />
    </div>
  );
}

function RejectForm({ proposalId, form }: { proposalId: string; form: ReturnType<typeof useFormAction> }) {
  return (
    <form onSubmit={form.onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <FormMessage state={form.state} />
      <button type="submit" disabled={form.pending} className={`${dangerButtonClass} self-start`}>
        Rifiuta ed elimina
      </button>
    </form>
  );
}
