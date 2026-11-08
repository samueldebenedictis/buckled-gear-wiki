import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Markdown from "react-markdown";
import { Award, Badges, markdownClass } from "@/components/guide-mentions";
import { ProductCard } from "@/components/product-card";
import { db } from "@/db";
import { listCatalog } from "@/lib/catalog";
import { getPublishedGuide } from "@/lib/guides";
import { CATEGORY_LABELS } from "@/lib/labels";
import { PAGE_WIDE } from "@/components/page";

type Props = PageProps<"/guide/[slug]">;

async function load(slug: string) {
  "use cache";
  cacheTag("guides");
  cacheTag("catalog");
  cacheLife("hours");
  const g = await getPublishedGuide(db, slug);
  if (!g) return null;
  // Dati completi per le schede, come nel catalogo.
  const cards = new Map((await listCatalog(db, {}, { ids: g.items.map((i) => i.productId) })).map((c) => [c.id, c]));
  return { ...g, cards };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load((await params).slug);
  return g ? { title: g.title } : { title: "Guida non trovata" };
}

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

export default function GuidePage({ params }: Props) {
  return (
    <main className={PAGE_WIDE}>
      <Link href="/guide" className="text-sm underline">
        ← Guide
      </Link>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: Pick<Props, "params">) {
  const g = await load((await params).slug);
  if (!g) notFound();
  // Raggruppa per categoria, nell'ordine della guida.
  const groups = new Map<string, typeof g.items>();
  for (const it of g.items) groups.set(it.category, [...(groups.get(it.category) ?? []), it]);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight sm:text-5xl">{g.title}</h1>
        <p className="text-sm text-zinc-500">
          {g.updatedOn && `Aggiornata a ${monthFmt.format(new Date(g.updatedOn))}`}
          {g.sourceUrl && (
            <>
              {" · "}
              <a href={g.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
                versione originale su buckled.it
              </a>
            </>
          )}
        </p>
        {g.introMd && (
          <div className={markdownClass}>
            <Markdown>{g.introMd}</Markdown>
          </div>
        )}
        {/* Come su buckled.it: "the why" in un riquadro apribile, aperto all'arrivo. */}
        {g.whyMd && (
          <details open className="group mt-2 card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display text-lg font-black lowercase [&::-webkit-details-marker]:hidden">
              <span>
                the <i>why</i>
              </span>
              <span aria-hidden className="text-xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className={`border-t border-black px-4 py-3 ${markdownClass}`}>
              <Markdown>{g.whyMd}</Markdown>
            </div>
          </details>
        )}
      </header>
      {[...groups].map(([category, items]) => (
        <section key={category} className="flex flex-col gap-4">
          {groups.size > 1 && <h2 className="text-xl font-semibold">{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</h2>}
          <div data-reveal className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const card = g.cards.get(it.productId);
              if (!card) return null;
              return (
                <ProductCard key={it.productId} item={card}>
                  {it.award && (
                    <div>
                      <Award award={it.award} />
                    </div>
                  )}
                  <Badges badges={it.badges} />
                  {it.noteMd && (
                    <div className={`text-sm ${markdownClass}`}>
                      <Markdown>{it.noteMd}</Markdown>
                    </div>
                  )}
                </ProductCard>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
