import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import {
  CatalogFilterBar,
  hrefWith,
  PANEL_PARAM,
  ViewSwitch,
} from "@/components/catalog-filters";
import { ProductCard, ProductRow } from "@/components/product-card";
import { db } from "@/db";
import { listBrandsForFilter, listCatalog } from "@/lib/catalog";
import { PRIVACY_K } from "@/lib/config";
import type { Category } from "@/db/enum-values";
import {
  ATTR_PARAM,
  parseCatalogFilters,
  type CatalogFilters,
} from "@/lib/validation/catalog-filters";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main
      id="catalogo"
      className="mx-auto flex w-full max-w-[1180px] scroll-mt-4 flex-col gap-6 px-4 py-10"
    >
      <h1 className="text-center text-3xl sm:text-4xl">Catalogo</h1>
      <Suspense fallback={<p className="text-center">Caricamento…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Barra di ricerca: tiene categoria e filtri attivi, così la ricerca li restringe. */
function SearchForm({ filters }: { filters: CatalogFilters }) {
  const keep = Object.entries(filters).filter(
    ([k, v]) => k !== "q" && k !== "attrs" && v,
  );
  return (
    <form action="/#catalogo" role="search" className="flex gap-2">
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      {Object.entries(filters.attrs ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={ATTR_PARAM + k} value={v} />
      ))}
      <input
        name="q"
        type="search"
        defaultValue={filters.q}
        placeholder="Cerca: sg7, prodigio, adv skin, julbo…"
        aria-label="Cerca nel catalogo"
        className="min-w-0 flex-1 border border-black bg-white px-3 py-2 text-black placeholder:text-zinc-500 focus:outline-2 focus:outline-buckled-yellow"
      />
      <button
        type="submit"
        className="border border-black bg-white px-4 py-2 text-[13px] font-black tracking-wide text-black uppercase hover:bg-buckled-paper"
      >
        Cerca
      </button>
    </form>
  );
}

async function loadCatalog(filters: CatalogFilters) {
  "use cache";
  cacheTag("catalog");
  cacheTag("stats"); // il filtro distanza usa anche i feedback della community
  cacheLife("hours");
  return listCatalog(db, filters);
}

async function loadBrands(category?: Category) {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return listBrandsForFilter(db, category);
}

const SPEC_FILTERS = [
  "terreno",
  "drop",
  "peso",
  "piastra",
  "impermeabile",
] as const;

async function Catalog({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const filters = parseCatalogFilters(sp);
  const { vista, ...query } = filters; // la vista non cambia i risultati: stessa cache
  const panelOpen = sp[PANEL_PARAM] === "1";
  const [items, brands] = await Promise.all([
    loadCatalog(query),
    loadBrands(filters.tipo),
  ]);
  const specFilter = SPEC_FILTERS.some((k) => filters[k]);

  return (
    <>
      <SearchForm key={filters.q ?? ""} filters={filters} />
      <CatalogFilterBar
        filters={filters}
        brands={brands}
        panelOpen={panelOpen}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex-1 text-[13px] text-zinc-600">
          {items.length === 1 ? "1 prodotto" : `${items.length} prodotti`}
          {filters.q && (
            <>
              {" per «"}
              {filters.q}
              {"» · "}
              <Link
                href={hrefWith({ ...filters, q: undefined }, null, false)}
                scroll={false}
                className="font-bold underline"
              >
                togli la ricerca
              </Link>
            </>
          )}
          {filters.distanza &&
            ` consigliate per ${filters.distanza} dalla redazione o da almeno metà dei runner (minimo ${PRIVACY_K})`}
          .
          {(specFilter || filters.attrs) &&
            " I prodotti senza caratteristiche inserite non compaiono con i filtri tecnici."}
        </p>
        <ViewSwitch filters={filters} panelOpen={panelOpen} />
      </div>
      {items.length === 0 ? null : vista === "lista" ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 pt-px md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {items.map((item) => (
            <ProductRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
      {items.length === 0 && (
        <p className="card p-4 text-center text-zinc-600">
          Nessun prodotto trovato.{" "}
          <Link href="/proposte" className="font-bold underline">
            Proponilo alla redazione
          </Link>
          .
        </p>
      )}
    </>
  );
}
