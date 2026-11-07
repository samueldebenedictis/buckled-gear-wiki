import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { db } from "@/db";
import { listPublishedGuides } from "@/lib/guides";
import { PAGE_WIDE, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Guide", description: "Le guide all'attrezzatura curate dalla redazione di Buckled." };

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function GuidesPage() {
  "use cache";
  cacheTag("guides");
  cacheLife("hours");
  const list = await listPublishedGuides(db);
  return (
    <main className={PAGE_WIDE}>
      <h1 className={pageTitleClass}>Guide</h1>
      <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guide/${g.slug}`}
              className="flex h-full flex-col gap-2 border border-black bg-white p-5 shadow-[5px_5px_0_0_#000] transition-shadow hover:shadow-[5px_5px_0_0_var(--color-buckled-orange)]"
            >
              <span className="font-display text-[22px] leading-tight font-semibold">{g.title}</span>
              <span className="text-sm text-zinc-500">
                {g.items} prodotti
                {g.updatedOn && ` · aggiornata a ${monthFmt.format(new Date(g.updatedOn))}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
