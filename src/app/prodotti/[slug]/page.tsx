import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { Reviews } from "@/components/editorial-reviews";
import { CorrectLink } from "@/components/correct-link";
import { ProductHeader } from "@/components/product-header";
import { db } from "@/db";
import { getPublicProduct, type PublicProduct } from "@/lib/catalog";
import { attributeDefs, formatAttribute } from "@/lib/categories";
import { guidesForProduct } from "@/lib/guides";
import { PAGE_NARROW } from "@/components/page";

type Props = PageProps<"/prodotti/[slug]">;

async function load(slug: string) {
  "use cache";
  cacheTag("catalog");
  cacheTag("guides");
  cacheLife("hours");
  const p = await getPublicProduct(db, slug);
  return p ? { ...p, mentions: await guidesForProduct(db, p.product.id) } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Prodotto non trovato" };
  return {
    title: p.product.displayName,
    description: `${p.product.displayName}: caratteristiche e giudizio della redazione di Buckled.`,
  };
}

export default function ProductPage({ params }: Props) {
  return (
    <main className={PAGE_NARROW}>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const p = await load((await params).slug);
  if (!p || p.product.status !== "pubblicato") notFound();
  // Le scarpe hanno la loro pagina, con le statistiche della community.
  if (p.category === "scarpe") permanentRedirect(`/scarpe/${p.product.slug}`);

  return (
    <>
      <ProductHeader p={p} />
      <Attributes p={p} />
      <CorrectLink productId={p.product.id} />
      <Reviews p={p} mentions={p.mentions} />
    </>
  );
}

function Attributes({ p }: { p: PublicProduct }) {
  const rows = attributeDefs(p.category)
    .filter((d) => p.product.attributes[d.key] !== undefined)
    .map((d) => [d.label, formatAttribute(d, p.product.attributes[d.key])] as const);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Caratteristiche</h2>
      {rows.length ? (
        <dl className="grid grid-cols-[11rem_1fr] gap-x-4 gap-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-zinc-500">Caratteristiche non ancora inserite.</p>
      )}
    </section>
  );
}
