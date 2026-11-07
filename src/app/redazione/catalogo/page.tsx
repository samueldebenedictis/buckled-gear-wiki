import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { setStatusAction } from "@/app/actions/redazione-catalogo";
import { AdminHeader, adminRowClass, AdminTag, Completeness, CompletenessLegend, StatusTabs } from "@/components/admin-list";
import { CATEGORY_ORDER } from "@/components/catalog-filters";
import { inputClass } from "@/components/field";
import { PublishToggle } from "@/components/publish-toggle";
import { db } from "@/db";
import { CATEGORIES, type Category } from "@/db/enum-values";
import {
  ADMIN_STATI,
  countByStato,
  filterByStato,
  listBrandsAndModels,
  listProductsAdmin,
  type AdminCatalogFilters,
  type AdminProductRow,
  type AdminStato,
} from "@/lib/admin-catalog";
import { CATEGORY_LABELS } from "@/lib/labels";
import { requireRedattore } from "@/lib/session";
import { BULK_FORM, BulkBar } from "./bulk-bar";
import { CatalogTransfer } from "./catalog-transfer";
import { CreateProductForm } from "./create-product-form";
import { PAGE_WIDE } from "@/components/page";

export const metadata: Metadata = { title: "Catalogo · Redazione" };

type Props = PageProps<"/redazione/catalogo">;

export default function CatalogAdminPage({ searchParams }: Props) {
  return (
    <main className={PAGE_WIDE}>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const STATO_LABELS: Record<AdminStato, string> = { pubblicati: "Pubblicati", bozze: "Bozze", incompleti: "Incompleti" };
const CHECKS = ["foto", "caratteristiche", "prezzo", "recensione"];

type Filters = AdminCatalogFilters & { nuovo?: boolean };

function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const q = one("q");
  const tipo = one("tipo");
  const stato = one("stato");
  return {
    q: q && q.length >= 2 ? q.slice(0, 60) : undefined,
    tipo: (CATEGORIES as readonly string[]).includes(tipo ?? "") ? (tipo as Category) : undefined,
    stato: (ADMIN_STATI as readonly string[]).includes(stato ?? "") ? (stato as AdminStato) : undefined,
    nuovo: one("nuovo") === "1",
  };
}

function href(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.stato) p.set("stato", f.stato);
  if (f.nuovo) p.set("nuovo", "1");
  const qs = p.toString();
  return `/redazione/catalogo${qs ? `?${qs}` : ""}`;
}

async function Content({ searchParams }: Pick<Props, "searchParams">) {
  await requireRedattore();
  const f = parseFilters(await searchParams);
  // Conteggi delle schede sugli stessi filtri di ricerca e categoria; lo stato filtra dopo.
  const [all, suggestions] = await Promise.all([
    listProductsAdmin(db, { q: f.q, tipo: f.tipo }),
    f.nuovo ? listBrandsAndModels(db) : null,
  ]);
  const items = f.stato ? filterByStato(all, f.stato) : all;
  const counts = countByStato(all);

  return (
    <>
      <AdminHeader
        title="Catalogo"
        newLabel="Nuovo prodotto"
        open={!!f.nuovo}
        openHref={href({ ...f, nuovo: true })}
        closeHref={href({ ...f, nuovo: false })}
      >
        {suggestions && <CreateProductForm brands={suggestions.brands} models={suggestions.models} />}
      </AdminHeader>

      <CatalogTransfer />

      {/* Ricerca e categoria in una riga; GET con next/form, senza ricaricare la pagina. */}
      <Form action="/redazione/catalogo" scroll={false} role="search" className="flex flex-wrap gap-2">
        {f.stato && <input type="hidden" name="stato" value={f.stato} />}
        <input
          key={`q-${f.q ?? ""}`}
          name="q"
          type="search"
          defaultValue={f.q}
          placeholder="Cerca: sg7, prodigio, adv skin, julbo…"
          aria-label="Cerca nel catalogo"
          className={`${inputClass} min-w-0 flex-[2_1_14rem]`}
        />
        <select key={`tipo-${f.tipo ?? ""}`} name="tipo" defaultValue={f.tipo ?? ""} aria-label="Categoria" className={`${inputClass} flex-[1_1_10rem]`}>
          <option value="">Tutte le categorie</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="border border-buckled-yellow bg-buckled-yellow px-4 py-2 text-[13px] font-black tracking-wide text-black uppercase hover:bg-buckled-orange"
        >
          Cerca
        </button>
        {(f.q || f.tipo) && (
          <Link href={href({ stato: f.stato })} scroll={false} className="self-center text-sm text-zinc-400 underline">
            togli filtri
          </Link>
        )}
      </Form>

      <StatusTabs
        tabs={[
          { label: "Tutti", count: counts.tutti, href: href({ ...f, stato: undefined, nuovo: false }), active: !f.stato },
          ...ADMIN_STATI.map((s) => ({
            label: STATO_LABELS[s],
            count: counts[s],
            href: href({ ...f, stato: s, nuovo: false }),
            active: f.stato === s,
          })),
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <BulkBar key={href({ ...f, nuovo: false })} />
        <CompletenessLegend labels={CHECKS} />
      </div>

      {items.length ? (
        <ul className="flex flex-col pt-px">
          {items.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </ul>
      ) : (
        <p className="text-zinc-400">Nessun prodotto{f.q && ` per «${f.q}»`}.</p>
      )}
    </>
  );
}

/** Riga scura: nome, categoria, indicatori di completezza (foto compresa) e stato. */
function Row({ item: i }: { item: AdminProductRow }) {
  const url = `/redazione/catalogo/${i.id}`;
  const name = i.name.startsWith(i.brand) ? i.name.slice(i.brand.length).trim() : i.name;
  return (
    <li className={`${adminRowClass} pr-3`}>
      <input
        type="checkbox"
        name="ids"
        value={i.id}
        form={BULK_FORM}
        aria-label={`Seleziona ${i.name}`}
        className="ml-3 size-4 shrink-0 accent-buckled-yellow"
      />
      <Link href={url} className="flex min-w-0 flex-1 flex-col gap-1 py-3 hover:underline">
        <span className="font-display text-[12px] leading-tight text-zinc-400 lowercase">{i.brand}</span>
        <span className="font-display text-[13px] leading-tight font-semibold break-words uppercase">{name}</span>
        <span className="flex flex-wrap gap-1">
          <AdminTag>{CATEGORY_LABELS[i.category]}</AdminTag>
          {i.status === "bozza" && <AdminTag tone="amber">bozza</AdminTag>}
          {i.aliases > 0 && <AdminTag>{i.aliases === 1 ? "1 alias" : `${i.aliases} alias`}</AdminTag>}
        </span>
      </Link>
      {/* Su mobile indicatori e tasto uno sopra l'altro, per lasciare spazio al nome. */}
      <div className="flex shrink-0 items-center gap-3 max-sm:flex-col max-sm:items-end max-sm:gap-2">
        <Completeness
          checks={[
            ["foto", i.hasPhoto],
            ["caratteristiche", i.hasSpecs],
            ["prezzo", i.hasPrice],
            ["recensione", i.hasReview],
          ]}
        />
        <PublishToggle
          action={setStatusAction}
          fields={{ productId: i.id, status: i.status === "bozza" ? "pubblicato" : "bozza" }}
          published={i.status === "pubblicato"}
          name={i.name}
        />
      </div>
    </li>
  );
}
