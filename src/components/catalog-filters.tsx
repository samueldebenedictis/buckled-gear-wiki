// Filtri del catalogo con i pulsanti della guida attrezzatura di buckled.it
// (plugin buckled-guide-controls, .bgc-guide__filter): riga con il pulsante
// "Filtra" e le categorie, poi un pannello con una riga di pulsanti per filtro.
// Ogni pulsante è un link: un clic attiva o toglie il filtro, senza JavaScript.
import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORIES, DISTANCE_BANDS, type Category } from "@/db/enum-values";
import { filterableAttributes } from "@/lib/categories";
import {
  CATEGORY_LABELS,
  DROP_RANGE_LABELS,
  entries,
  PLATE_LABELS,
  TERRAIN_LABELS,
  WEIGHT_RANGE_LABELS,
} from "@/lib/labels";
import { ATTR_PARAM, type CatalogFilters } from "@/lib/validation/catalog-filters";

/** Parametro URL che tiene aperto il pannello dei filtri. */
export const PANEL_PARAM = "filtri";

type Simple = Exclude<keyof CatalogFilters, "attrs">;

/** URL del catalogo con i filtri attuali, cambiando solo quello indicato. */
export function hrefWith(
  f: CatalogFilters,
  change: { key: Simple | `${typeof ATTR_PARAM}${string}`; value?: string } | null,
  panel: boolean,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (k !== "attrs" && v) params.set(k, String(v));
  for (const [k, v] of Object.entries(f.attrs ?? {})) params.set(ATTR_PARAM + k, v);
  if (change) {
    if (change.value) params.set(change.key, change.value);
    else params.delete(change.key);
  }
  if (panel) params.set(PANEL_PARAM, "1");
  const qs = params.toString();
  return `/${qs ? `?${qs}` : ""}#catalogo`;
}

const buttonBase =
  "inline-flex items-center justify-center border border-black px-4 py-2 text-[13px] leading-[21px] font-medium text-black capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

/** Pulsante filtro: bianco, grigio al passaggio, #E7EDED se attivo. */
export function FilterButton({ href, pressed, children }: { href: string; pressed: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={pressed}
      className={`${buttonBase} ${pressed ? "bg-buckled-mist" : "bg-white hover:bg-buckled-paper"}`}
    >
      {children}
    </Link>
  );
}

/** Categorie in ordine alfabetico, come sul sito. */
export const CATEGORY_ORDER = [...CATEGORIES].sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b], "it"));

/** Quanti filtri di dettaglio sono attivi (la categoria ha la sua riga). */
export function countDetailFilters(f: CatalogFilters) {
  const keys = ["marca", "distanza", "terreno", "drop", "peso", "piastra", "impermeabile"] as const;
  return keys.filter((k) => f[k]).length + Object.keys(f.attrs ?? {}).length;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-3">
      <span className="pt-2 text-[13px] font-bold text-black uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5 md:gap-2">{children}</div>
    </div>
  );
}

/** Schede o lista compatta, come lo switch di buckled.it/reviews (versione su fondo chiaro). */
export function ViewSwitch({ filters, panelOpen }: { filters: CatalogFilters; panelOpen: boolean }) {
  const list = filters.vista === "lista";
  const btn = (active: boolean) =>
    `inline-flex size-[42px] items-center justify-center border p-[9px] transition-colors -ml-px first:ml-0 ${
      active ? "border-black bg-black text-white" : "border-black/55 bg-white text-black hover:border-black hover:bg-black hover:text-white"
    }`;
  return (
    <nav aria-label="Visualizzazione del catalogo" className="flex">
      <Link
        href={hrefWith(filters, { key: "vista" }, panelOpen)}
        scroll={false}
        aria-current={!list ? "true" : undefined}
        title="Vista estesa"
        className={btn(!list)}
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="currentColor" aria-hidden>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className="sr-only">Vista estesa</span>
      </Link>
      <Link
        href={hrefWith(filters, { key: "vista", value: "lista" }, panelOpen)}
        scroll={false}
        aria-current={list ? "true" : undefined}
        title="Vista compatta"
        className={btn(list)}
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
          <g fill="currentColor">
            <rect x="3" y="4" width="4" height="4" />
            <rect x="3" y="10" width="4" height="4" />
            <rect x="3" y="16" width="4" height="4" />
          </g>
          <path d="M10 6h11M10 12h11M10 18h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>
        <span className="sr-only">Vista compatta</span>
      </Link>
    </nav>
  );
}

export function CatalogFilterBar({
  filters,
  brands,
  panelOpen,
}: {
  filters: CatalogFilters;
  brands: { slug: string; name: string }[];
  panelOpen: boolean;
}) {
  const active = countDetailFilters(filters);
  // Il pannello lo apre e chiude solo il pulsante Filtra (parametro ?filtri=1).
  const open = panelOpen;
  const shoes = filters.tipo === "scarpe";

  // Una riga di pulsanti per un filtro semplice: clic su quello attivo = toglie il filtro.
  const optionRow = (label: string, key: Simple, options: readonly (readonly [string, string])[]) => (
    <Row key={key} label={label}>
      {options.map(([value, text]) => {
        const pressed = filters[key] === value;
        return (
          <FilterButton key={value} pressed={pressed} href={hrefWith(filters, { key, value: pressed ? undefined : value }, true)}>
            {text}
          </FilterButton>
        );
      })}
    </Row>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[max-content_minmax(0,1fr)]">
        {/* Apre e chiude il pannello, come il pulsante di visualizzazione della guida. */}
        <Link
          href={hrefWith(filters, null, !open)}
          scroll={false}
          aria-expanded={open}
          className={`inline-flex w-fit items-center gap-2 border border-black px-3 py-2 text-[13px] leading-[21px] font-medium text-black ${open ? "bg-buckled-mist" : "bg-white hover:bg-buckled-paper"}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filtra
          {active > 0 && <span className="bg-black px-1.5 text-[11px] leading-[18px] text-white">{active}</span>}
        </Link>
        <nav aria-label="Categorie" className="flex flex-wrap gap-1.5 md:gap-2">
          <FilterButton pressed={!filters.tipo} href={hrefWith({ q: filters.q, vista: filters.vista }, null, open)}>
            Tutti
          </FilterButton>
          {CATEGORY_ORDER.map((c: Category) => (
            // Cambiare categoria azzera i filtri di dettaglio, che dipendono dalla categoria.
            <FilterButton key={c} pressed={filters.tipo === c} href={hrefWith({ q: filters.q, vista: filters.vista, tipo: filters.tipo === c ? undefined : c }, null, open)}>
              {CATEGORY_LABELS[c]}
            </FilterButton>
          ))}
        </nav>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border border-black bg-white p-4 shadow-[5px_5px_0_0_#000]">
          {optionRow("Marca", "marca", brands.map((b) => [b.slug, b.name] as const))}
          {shoes && (
            <>
              {optionRow("Distanza", "distanza", DISTANCE_BANDS.map((d) => [d, d] as const))}
              {optionRow("Terreno", "terreno", entries(TERRAIN_LABELS))}
              {optionRow("Drop", "drop", entries(DROP_RANGE_LABELS))}
              {optionRow("Peso", "peso", entries(WEIGHT_RANGE_LABELS))}
              {optionRow("Piastra", "piastra", entries(PLATE_LABELS))}
              {optionRow("Impermeabile", "impermeabile", [["si", "Sì"], ["no", "No"]])}
            </>
          )}
          {filters.tipo &&
            !shoes &&
            filterableAttributes(filters.tipo).map(({ def, options }) => (
              <Row key={def.key} label={def.label}>
                {options.map(([value, text]) => {
                  const pressed = filters.attrs?.[def.key] === value;
                  return (
                    <FilterButton
                      key={value}
                      pressed={pressed}
                      href={hrefWith(filters, { key: `${ATTR_PARAM}${def.key}`, value: pressed ? undefined : value }, true)}
                    >
                      {text}
                    </FilterButton>
                  );
                })}
              </Row>
            ))}
          {!filters.tipo && (
            <p className="text-[13px] text-zinc-600">Scegli una categoria per vedere i suoi filtri.</p>
          )}
          {active > 0 && (
            <Link
              href={hrefWith({ q: filters.q, vista: filters.vista, tipo: filters.tipo }, null, true)}
              scroll={false}
              className="self-start text-[13px] font-bold text-black underline"
            >
              Azzera filtri
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
