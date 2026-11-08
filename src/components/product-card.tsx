// Scheda prodotto ricalcata sul template delle schede della guida attrezzatura di
// buckled.it (Elementor 11919): testata con brand e nome, foto su griglia a sinistra,
// specifiche a destra, divisore ondulato e link in fondo.
import Link from "next/link";
import type { ReactNode } from "react";
import type { CatalogItem } from "@/lib/catalog";
import { attributeDefs, formatAttribute, productUrl } from "@/lib/categories";
import { PLATE_LABELS, TERRAIN_LABELS } from "@/lib/labels";
import { ProductImage } from "./product-image";

export const formatPrice = (eur: number) =>
  eur.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: eur % 1 ? 2 : 0 });

type Spec = [label: string, value: string];

/** Righe principali ("Peso: 293 g") e voci secondarie (lista in minuscolo). */
export function specsOf(item: CatalogItem): { main: Spec[]; extra: Spec[] } {
  const main: Spec[] = [];
  const extra: Spec[] = [];
  if (item.category === "scarpe") {
    const s = item.specs;
    if (s?.dropMm != null) main.push(["Drop", `${s.dropMm} mm`]);
    if (s?.stackHeelMm != null && s.stackForeMm != null) main.push(["Stack", `${s.stackHeelMm}-${s.stackForeMm} mm`]);
    if (s?.weightG != null) main.push(["Peso", `${s.weightG} g`]);
    if (s?.lugMm != null) main.push(["Tasselli", `${s.lugMm} mm`]);
    if (s?.terrains.length) extra.push(["Terreni", s.terrains.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(", ")]);
    if (s?.plate) extra.push(["Piastra", PLATE_LABELS[s.plate]]);
    if (s?.waterproof != null) extra.push(["Impermeabile", s.waterproof ? "sì" : "no"]);
  } else {
    for (const d of attributeDefs(item.category)) {
      const v = item.attributes[d.key];
      if (v === undefined || d.key === "techNotes") continue;
      const row: Spec = [d.label, formatAttribute(d, v)];
      // Numeri e testi brevi in evidenza, scelte e sì/no nella lista.
      if ((d.type === "enum" || d.type === "bool") && main.length) extra.push(row);
      else if (main.length < 4) main.push(row);
      else extra.push(row);
    }
  }
  if (item.priceEur != null) main.push(["Prezzo", formatPrice(item.priceEur)]);
  return { main, extra: extra.slice(0, 3) };
}

/** `children`: contenuto extra in fondo alla scheda (premio, badge e nota nelle guide). */
export function ProductCard({ item, children }: { item: CatalogItem; children?: ReactNode }) {
  const href = productUrl(item.category, item.slug);
  const { main, extra } = specsOf(item);
  const name = item.name.startsWith(item.brand) ? item.name.slice(item.brand.length).trim() : item.name;

  return (
    <article className="flex h-full flex-col border border-black bg-white shadow-[5px_5px_0_0_#000] transition-shadow hover:shadow-[5px_5px_0_0_var(--color-buckled-orange)]">
      <header className="flex flex-col gap-1.25 border-b border-black p-5 max-md:p-7.5">
        <h3 className="font-display text-[14px] leading-5.25 font-black text-black uppercase">{item.brand}</h3>
        <h2 className="font-display text-[29px] leading-8 font-semibold tracking-normal text-black normal-case">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h2>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="flex items-center justify-center bg-[url(/bg/gridme.png)] bg-center p-5 md:w-1/2"
        >
          <ProductImage
            src={item.imagePath}
            alt=""
            plain
            sizes="(min-width: 1024px) 180px, (min-width: 768px) 25vw, 100vw"
            className="min-h-37.5 w-full"
          />
        </Link>

        <div className="flex flex-col justify-between gap-1.25 border-t border-black bg-white p-5 md:w-1/2 md:border-t-0 md:border-l">
          <div className="flex flex-col gap-1.25">
            {main.map(([k, v]) => (
              <p key={k} className="text-[14px] leading-4.5 font-semibold text-black">
                <span className="font-light">{k}: </span>
                {v}
              </p>
            ))}
            {extra.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {extra.map(([k, v]) => (
                  <li key={k} className="flex gap-1.5 text-[13px] leading-3.75 font-medium text-black lowercase">
                    <span aria-hidden className="mt-0.5 inline-block size-2.25 shrink-0 bg-buckled-yellow" />
                    {k}: {v}
                  </li>
                ))}
              </ul>
            )}
            {main.length === 0 && extra.length === 0 && (
              <p className="text-[13px] text-zinc-500">caratteristiche da completare</p>
            )}
          </div>

          <div className="flex items-end gap-2.5">
            <span aria-hidden className="h-5 flex-1 bg-[url(/bg/wave.svg)] bg-size-[20px_20px] bg-center bg-repeat-x" />
            {item.videoUrl && (
              <a
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Guarda la recensione"
                aria-label="Guarda la recensione su YouTube"
                className="text-black hover:text-buckled-orange"
              >
                <svg viewBox="0 0 24 24" className="size-5.75" fill="currentColor" aria-hidden>
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
                </svg>
              </a>
            )}
            <Link
              href={href}
              title="Scheda completa"
              aria-label={`Scheda completa di ${item.name}`}
              className="text-black hover:text-buckled-orange"
            >
              <svg viewBox="0 0 24 24" className="size-5.75" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      {children && <div className="flex flex-col gap-2 border-t border-black p-5">{children}</div>}
    </article>
  );
}

/**
 * Riga della vista compatta, ricalcata su buckled.it/reviews: foto, brand, nome, link.
 * -mt-px: il bordo di righe consecutive si sovrappone invece di raddoppiare
 * (il contenitore compensa con pt-px).
 */
export function ProductRow({ item }: { item: CatalogItem }) {
  const href = productUrl(item.category, item.slug);
  const { main } = specsOf(item);
  const name = item.name.startsWith(item.brand) ? item.name.slice(item.brand.length).trim() : item.name;
  return (
    <article className="-mt-px flex min-w-0 items-center gap-3 sm:gap-4 border border-black bg-white pr-4 transition-colors hover:bg-buckled-paper">
      <Link href={href} tabIndex={-1} aria-hidden className="w-27.5 shrink-0 p-3.75 max-sm:w-22.5">
        <ProductImage src={item.imagePath} alt="" plain sizes="110px" className="aspect-250/135 w-full" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-3">
        <p className="font-display text-[13px] leading-tight font-normal text-black lowercase">{item.brand}</p>
        <h2 className="font-display text-[13px] leading-tight font-semibold tracking-normal wrap-break-word text-black uppercase">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h2>
        {main.length > 0 && (
          <p className="truncate text-[12px] text-zinc-600">{main.slice(0, 3).map(([, v]) => v).join(" · ")}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {item.videoUrl && (
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Guarda la recensione"
            aria-label={`Recensione di ${item.name} su YouTube`}
            className="text-black hover:text-buckled-orange"
          >
            <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor" aria-hidden>
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
            </svg>
          </a>
        )}
        <Link href={href} title="Scheda completa" aria-label={`Scheda completa di ${item.name}`} className="text-black hover:text-buckled-orange">
          <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
