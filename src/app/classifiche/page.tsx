import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { db } from "@/db";
import { PRIVACY_K } from "@/lib/config";
import { ProductCard } from "@/components/product-card";
import { listCatalog, type CatalogItem } from "@/lib/catalog";
import { rankings } from "@/lib/stats";
import { PAGE_WIDE, pageTitleClass } from "@/components/page";

export const metadata: Metadata = {
  title: "Classifiche",
  description: "Le scarpe più usate, preferite e durevoli secondo i runner della community Buckled.",
};

export default function RankingsPage() {
  return (
    <main className={PAGE_WIDE}>
      <h1 className={pageTitleClass}>Classifiche</h1>
      <p className="-mt-2 text-sm text-zinc-600">
        Dati aggregati dall&apos;equipaggiamento dei runner. Una scarpa entra in classifica quando la usano almeno {PRIVACY_K} runner.
      </p>
      <Rankings />
    </main>
  );
}

async function Rankings() {
  "use cache";
  cacheTag("stats");
  cacheTag("catalog");
  cacheLife("minutes");

  const r = await rankings(db, 5);
  // Dati completi della scheda per i primi classificati.
  const firsts = [r.mostUsed[0], r.favorites[0], r.durable[0]].filter(Boolean).map((p) => p.id);
  const cards = new Map((await listCatalog(db, {}, { ids: firsts })).map((c) => [c.id, c]));
  const fmt = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });

  const boards: Board[] = [
    { title: "Più usate", items: r.mostUsed.map((p) => ({ ...p, value: `${p.users} runner` })) },
    { title: "Preferite", items: r.favorites.map((p) => ({ ...p, value: `${fmt(p.score)}/5` })) },
    { title: "Più durevoli", items: r.durable.map((p) => ({ ...p, value: `${fmt(p.km)} km` })) },
  ];

  return (
    <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((b) => (
        <Ranking key={b.title} board={b} first={b.items[0] ? cards.get(b.items[0].id) : undefined} />
      ))}
    </div>
  );
}

type Board = { title: string; items: { id: string; name: string; slug: string; value: string }[] };

function Ranking({ board, first }: { board: Board; first?: CatalogItem }) {
  const [top, ...rest] = board.items;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl sm:text-3xl">{board.title}</h2>
      {!top || !first ? (
        <p className="card p-4 text-sm text-zinc-600">
          Dati insufficienti: servono almeno {PRIVACY_K} runner per scarpa.
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            <p className="self-start bg-buckled-yellow px-3 py-1 font-display text-[13px] font-black text-buckled-green uppercase">
              1° · {top.value}
            </p>
            <ProductCard item={first} />
          </div>
          {rest.length > 0 && (
            <ol start={2} className="flex flex-col gap-3">
              {rest.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/scarpe/${p.slug}`}
                    className="flex items-center gap-3 border border-black bg-white px-3 py-2 shadow-[3px_3px_0_0_#000] transition-shadow hover:shadow-[3px_3px_0_0_var(--color-buckled-orange)]"
                  >
                    <span className="w-7 shrink-0 font-display text-lg font-black text-black">{i + 2}°</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-black">{p.name}</span>
                    <span className="shrink-0 text-[13px] font-bold text-black tabular-nums">{p.value}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
