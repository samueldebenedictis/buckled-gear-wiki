import Link from "next/link";
import type { Category } from "@/db/enum-values";
import type { proposals } from "@/db/schema";
import { attributeDefs, formatAttribute, productUrl } from "@/lib/categories";
import { type ChangeRow, describeChanges, hasChanges } from "@/lib/correction";
import { formatPrice } from "./product-card";
import { CATEGORY_LABELS, PROPOSAL_KIND_LABELS } from "@/lib/labels";
import type { CorrectionPayload, NewProductPayload } from "@/lib/validation/proposal";

type Row = {
  proposal: typeof proposals.$inferSelect;
  productName: string | null;
  productSlug: string | null;
  productStatus: "bozza" | "pubblicato" | null;
  productCategory: Category | null;
};

type Current = Parameters<typeof describeChanges>[2];

const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

/** Riepilogo leggibile di una proposta in attesa, per utente e redazione. */
/**
 * `admin`: nella coda della redazione i link aprono la scheda modificabile del catalogo
 * e la ricerca del catalogo della redazione; per i runner restano le pagine pubbliche.
 */
export function ProposalSummary({
  row,
  proposer,
  admin = false,
  current,
}: {
  row: Row;
  proposer?: string;
  admin?: boolean;
  /** Valori attuali della scheda, per mostrare "da → a" nelle correzioni. */
  current?: Current;
}) {
  const p = row.proposal;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{PROPOSAL_KIND_LABELS[p.kind]}</span>
        <span className="bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">In attesa</span>
        <span className="text-xs text-zinc-500">
          {dateFmt.format(p.createdAt)}
          {proposer && ` · da ${proposer}`}
        </span>
      </div>
      {p.kind === "nuovo_prodotto" ? (
        <NewProduct payload={p.payload as NewProductPayload} />
      ) : (
        <Correction row={row} current={current} />
      )}
      {/* Prodotto da correggere. */}
      {row.productSlug && row.productCategory && p.productId && (admin || row.productStatus === "pubblicato") && (
        <Link
          href={admin ? `/redazione/catalogo/${p.productId}` : productUrl(row.productCategory, row.productSlug)}
          className="self-start text-sm font-bold underline"
        >
          {admin
            ? "Apri nel catalogo per correggere"
            : "Vai alla pagina del prodotto"}
          {": "}
          {row.productName} ↗
        </Link>
      )}
      {/* Nuovo prodotto non ancora deciso: controlla se esiste già. */}
      {p.kind === "nuovo_prodotto" && (
        <Link
          href={`${admin ? "/redazione/catalogo" : "/"}?q=${encodeURIComponent(
            [(p.payload as NewProductPayload).brand, (p.payload as NewProductPayload).model].join(" "),
          )}${admin ? "" : "#catalogo"}`}
          className="self-start text-sm font-bold underline"
        >
          Cerca nel catalogo ↗
        </Link>
      )}
    </div>
  );
}

function NewProduct({ payload }: { payload: NewProductPayload }) {
  const category = payload.category ?? "scarpe";
  const extra = [
    CATEGORY_LABELS[category],
    payload.releaseYear,
    payload.priceEur != null && formatPrice(payload.priceEur),
  ].filter(Boolean);
  const details = detailRows(category, payload);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        {payload.brand} {payload.model} {payload.version}
        {extra.length > 0 && <span className="text-zinc-500"> · {extra.join(" · ")}</span>}
      </p>
      {details.length > 0 && <Rows rows={details} />}
      {payload.note && <p className="text-zinc-600 dark:text-zinc-400">{payload.note}</p>}
    </div>
  );
}

/** Specifiche o caratteristiche proposte, come righe "Campo: valore". */
function detailRows(category: Category, payload: NewProductPayload): ChangeRow[] {
  if (category === "scarpe") {
    if (!payload.specs) return [];
    const specs = Object.fromEntries(
      Object.entries(payload.specs).filter(([, v]) => v !== null && !(Array.isArray(v) && !v.length)),
    );
    return describeChanges(category, { specs: specs as never });
  }
  return attributeDefs(category)
    .filter((d) => payload.attributes?.[d.key] !== undefined)
    .map((d) => ({ label: d.label, to: formatAttribute(d, payload.attributes![d.key]) }));
}

function Correction({ row, current }: { row: Row; current?: Current }) {
  const payload = row.proposal.payload as CorrectionPayload;
  const rows = row.productCategory && hasChanges(payload.changes) ? describeChanges(row.productCategory, payload.changes!, current) : [];
  return (
    <div className="flex flex-col gap-1 text-sm">
      {row.productName && <p className="font-medium">{row.productName}</p>}
      {rows.length > 0 && <Rows rows={rows} />}
      {payload.note && <p>{payload.note}</p>}
    </div>
  );
}

function Rows({ rows }: { rows: ChangeRow[] }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-zinc-500">{r.label}</dt>
          <dd>
            {r.from !== undefined && (
              <>
                <span className="text-zinc-500 line-through">{r.from}</span> →{" "}
              </>
            )}
            <span className="font-medium">{r.to}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
