import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { listGear, listSelectableProducts } from "@/lib/gear";
import { Accordion } from "@/components/accordion";
import { ProductImage } from "@/components/product-image";
import { formatSize } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { GearForm } from "./gear-form";
import { PAGE_WIDE, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Equipaggiamento" };

export default function GearPage() {
  return (
    <main className={PAGE_WIDE}>
      <h1 className={pageTitleClass}>Il tuo equipaggiamento</h1>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const me = await requireUser();
  const [items, products] = await Promise.all([listGear(db, me.id), listSelectableProducts(db)]);
  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Visibile solo a te. In pubblico finiscono soltanto statistiche aggregate su almeno 3 runner.
      </p>
      {items.length > 0 ? (
        (["in_uso", "dismessa"] as const).map((status) => {
          const group = items.filter((i) => i.gear.status === status);
          if (!group.length) return null;
          return (
            <section key={status} className="flex flex-col gap-4">
              <h2 className="font-display text-[15px] font-black uppercase">
                {status === "in_uso" ? "In uso" : "Dismesse"} ({group.length})
              </h2>
              <ul className="grid gap-6 sm:grid-cols-2">
                {group.map((item) => (
                  <li key={item.gear.id}>
                    <GearCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      ) : (
        <p>L&apos;equipaggiamento è vuoto: aggiungi la prima scarpa.</p>
      )}
      <Accordion title="Aggiungi una scarpa" open={items.length === 0}>
        <p className="text-sm text-zinc-600">
          Non la trovi?{" "}
          <Link href="/proposte" className="underline">
            Proponila alla redazione
          </Link>
          .
        </p>
        <GearForm products={products} />
      </Accordion>
    </>
  );
}

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric", timeZone: "UTC" });
const month = (d: string) => monthFmt.format(new Date(d));

/** Periodo d'uso: "dal mar 2025", "mar 2025 – apr 2026" o "fino a apr 2026". */
function period(from: string | null, to: string | null) {
  if (from && to) return `${month(from)} – ${month(to)}`;
  if (from) return `dal ${month(from)}`;
  if (to) return `fino a ${month(to)}`;
  return null;
}

type Item = Awaited<ReturnType<typeof listGear>>[number];

/** Mini scheda di un paio, nello stile delle schede del catalogo. */
function GearCard({ item: { gear, product, hasFeedback } }: { item: Item }) {
  const name = product.name.startsWith(product.brand) ? product.name.slice(product.brand.length).trim() : product.name;
  const when = period(gear.purchasedOn, gear.retiredOn);
  const retired = gear.status === "dismessa";
  return (
    <Link
      href={`/equipaggiamento/${gear.id}`}
      className="flex h-full border border-black bg-white shadow-[5px_5px_0_0_#000] transition-shadow hover:shadow-[5px_5px_0_0_var(--color-buckled-orange)]"
    >
      <div className="flex w-32.5 shrink-0 items-center justify-center border-r border-black bg-[url(/bg/gridme.png)] bg-center p-3 max-sm:w-25">
        <ProductImage src={product.imagePath} alt="" plain sizes="130px" className={`aspect-250/135 w-full ${retired ? "opacity-60 grayscale" : ""}`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div>
          <p className="font-display text-[12px] leading-tight font-black uppercase">{product.brand}</p>
          <h3 className="font-display text-[19px] leading-tight font-semibold wrap-break-word">{name}</h3>
          {gear.nickname && <p className="mt-0.5 text-[14px] italic">“{gear.nickname}”</p>}
        </div>
        <dl className="flex flex-col gap-0.5 text-[14px]">
          <Row k="Taglia" v={formatSize(gear.sizeSystem, gear.sizeValue)} />
          <Row k="Km" v={gear.km.toLocaleString("it-IT")} />
          {when && <Row k={retired ? "Usata" : "In uso"} v={when} />}
        </dl>
        {!hasFeedback && (
          <span className="mt-auto self-start bg-buckled-yellow px-2 py-0.5 text-[11px] font-black uppercase">
            feedback da dare
          </span>
        )}
      </div>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="font-light">{k}:</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
