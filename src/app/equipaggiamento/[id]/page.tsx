import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { db } from "@/db";
import { getGear, listSelectableProducts } from "@/lib/gear";
import { requireUser } from "@/lib/session";
import { DeleteGear, FeedbackForm, GearForm } from "../gear-form";
import { PAGE_NARROW, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Equipaggiamento" };

export default function GearItemPage({ params }: PageProps<"/equipaggiamento/[id]">) {
  return (
    <main className={PAGE_NARROW}>
      <Link href="/equipaggiamento" className="text-sm underline">
        ← Equipaggiamento
      </Link>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [row, products] = await Promise.all([getGear(db, me.id, id), listSelectableProducts(db)]);
  // Pezzo di un altro utente o inesistente: stessa risposta.
  if (!row) notFound();
  const { gear, product, feedback } = row;
  // Un prodotto tornato in bozza resta selezionato.
  const options = products.some((p) => p.id === product.id)
    ? products
    : [{ id: product.id, name: product.name, brand: "Non più in catalogo" }, ...products];

  return (
    <>
      <h1 className={pageTitleClass}>
        <Link href={`/scarpe/${product.slug}`} className="hover:underline">
          {product.name}
        </Link>
      </h1>
      {gear.nickname && <p className="-mt-4 text-lg italic">“{gear.nickname}”</p>}
      <section className="flex flex-col gap-4 card p-4">
        <h2 className="text-lg font-semibold">Il tuo paio</h2>
        <GearForm key={gear.updatedAt.getTime()} products={options} gear={gear} />
      </section>
      <section className="flex flex-col gap-4 card p-4">
        <h2 className="text-lg font-semibold">Feedback</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tutti i campi sono facoltativi. Contribuisce alle statistiche della scarpa solo in forma aggregata.
        </p>
        <FeedbackForm gearId={gear.id} feedback={feedback} />
      </section>
      <DeleteGear gearId={gear.id} name={gear.nickname ? `${product.name} “${gear.nickname}”` : product.name} />
    </>
  );
}
