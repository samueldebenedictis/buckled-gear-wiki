import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { secondaryButtonClass } from "@/components/field";
import { ProductSelect } from "@/components/product-select";
import { ProposalSummary } from "@/components/proposal-summary";
import { db } from "@/db";
import { listAllProducts } from "@/lib/gear";
import { currentValues, listOwnProposals } from "@/lib/proposals";
import { requireUser } from "@/lib/session";
import { CorrectionForm, type CorrectionTarget, NewProductProposalForm } from "./proposal-forms";
import { PAGE_NARROW, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Proposte" };

export default function ProposalsPage({ searchParams }: PageProps<"/proposte">) {
  return (
    <main className={PAGE_NARROW}>
      <h1 className={pageTitleClass}>Proposte</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Il catalogo lo cura la redazione, così non nascono doppioni. Proponi un prodotto mancante o correggi una scheda:
        qui trovi quelle in attesa. Quando la redazione decide, la proposta sparisce e il catalogo si aggiorna.
      </p>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function correctionTarget(id: string | undefined, products: { id: string; name: string }[]) {
  if (!id || !z.uuid().safeParse(id).success) return null;
  const listed = products.find((p) => p.id === id);
  if (!listed) return null; // solo prodotti pubblicati
  const v = await currentValues(db, id);
  if (!v) return null;
  return {
    id,
    name: listed.name,
    category: v.category,
    product: v.product,
    specs: v.specs as CorrectionTarget["specs"],
    attributes: v.attributes,
  } satisfies CorrectionTarget;
}

async function Content({ searchParams }: { searchParams: PageProps<"/proposte">["searchParams"] }) {
  const me = await requireUser();
  const sp = await searchParams;
  const correggi = typeof sp.correggi === "string" ? sp.correggi : undefined;
  const [own, products] = await Promise.all([listOwnProposals(db, me.id), listAllProducts(db)]);
  const target = await correctionTarget(correggi, products);

  return (
    <>
      <section className="flex flex-col gap-4 card p-4">
        <h2 className="text-lg font-semibold">Prodotto mancante</h2>
        <NewProductProposalForm />
      </section>
      <section id="correzione" className="flex flex-col gap-4 card p-4">
        <h2 className="text-lg font-semibold">Correggi o completa una scheda</h2>
        {/* Si sceglie il prodotto, poi si apre la sua scheda precompilata. */}
        <form action="/proposte#correzione" className="flex flex-wrap items-end gap-2">
          <div className="min-w-64 flex-1">
            <ProductSelect name="correggi" label="Prodotto" products={products} defaultValue={target?.id ?? ""} required />
          </div>
          <button type="submit" className={secondaryButtonClass}>
            Apri la scheda
          </button>
        </form>
        {correggi && !target && <p className="text-sm text-red-600">Prodotto non trovato.</p>}
        {target && (
          <>
            <CorrectionForm key={target.id} target={target} />
            <Link href="/proposte#correzione" className="self-start text-sm underline">
              Annulla
            </Link>
          </>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Le tue proposte in attesa</h2>
        {own.length ? (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {own.map((row) => (
              <li key={row.proposal.id} className="py-3">
                <ProposalSummary row={row} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">Nessuna proposta in attesa.</p>
        )}
      </section>
    </>
  );
}
