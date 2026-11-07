import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { db } from "@/db";
import { listAllProducts } from "@/lib/gear";
import { getGuideAdmin } from "@/lib/guides";
import { requireRedattore } from "@/lib/session";
import { BADGE_SUGGESTIONS } from "@/db/seed/guides";
import { AddGuideItem, DeleteGuide, GuideForm, GuideItemEditor } from "../guide-forms";
import { PAGE_NARROW, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Guida · Redazione" };

export default function GuideAdminPage({ params }: PageProps<"/redazione/guide/[id]">) {
  return (
    <main className={PAGE_NARROW}>
      <Link href="/redazione/guide" className="text-sm underline">
        ← Guide
      </Link>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await requireRedattore();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [g, products] = await Promise.all([getGuideAdmin(db, id), listAllProducts(db)]);
  if (!g) notFound();
  const inGuide = new Set(g.items.map((i) => i.productId));

  return (
    <>
      <h1 className={pageTitleClass}>{g.title}</h1>
      {g.published && (
        <Link href={`/guide/${g.slug}`} className="-mt-4 self-start text-sm underline">
          Vedi la pagina pubblica
        </Link>
      )}
      <GuideForm key={g.updatedAt.getTime()} guide={g} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Prodotti ({g.items.length})</h2>
        <ol className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {g.items.map((item, i) => (
            <GuideItemEditor
              key={`${item.productId}-${item.award}-${item.badges.join()}-${item.noteMd.length}`}
              guideId={g.id}
              item={item}
              first={i === 0}
              last={i === g.items.length - 1}
            />
          ))}
        </ol>
      </section>
      <AddGuideItem guideId={g.id} products={products.filter((p) => !inGuide.has(p.id))} badges={BADGE_SUGGESTIONS} />
      <DeleteGuide guideId={g.id} title={g.title} />
    </>
  );
}
