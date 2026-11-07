import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Form from "next/form";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { FIT_FIELDS, SCORE_FIELDS } from "@/db/enum-values";
import { db } from "@/db";
import { getPublicProduct, type PublicProduct } from "@/lib/catalog";
import { PRIVACY_K } from "@/lib/config";
import { listGear } from "@/lib/gear";
import {
  FIT_LABELS,
  fitWord,
  formatSize,
  PLATE_LABELS,
  SCORE_LABELS,
  SIZE_SYSTEM_LABELS,
  TERRAIN_LABELS,
} from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import {
  productStats,
  sizeRouting,
  sizeRoutingReferences,
  sizeRoutingRefSizes,
} from "@/lib/stats";
import { Reviews } from "@/components/editorial-reviews";
import { CorrectLink } from "@/components/correct-link";
import { buttonClass, inputClass } from "@/components/field";
import { ProductHeader } from "@/components/product-header";
import { FieldStatRow, FitStatRow, Insufficient, ShareBar, StatHeading } from "@/components/stats";
import { guidesForProduct } from "@/lib/guides";
import { PAGE_NARROW } from "@/components/page";

type Props = PageProps<"/scarpe/[slug]">;

async function loadProduct(slug: string) {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return getPublicProduct(db, slug);
}

async function loadGuides(productId: string) {
  "use cache";
  cacheTag("guides");
  cacheLife("hours");
  return guidesForProduct(db, productId);
}

async function loadStats(productId: string) {
  "use cache";
  cacheTag("stats");
  cacheLife("minutes");
  return productStats(db, productId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await loadProduct((await params).slug);
  if (!p) return { title: "Scarpa non trovata" };
  return {
    title: p.product.displayName,
    description: `${p.product.displayName}: specifiche, recensione della redazione e dati della community Buckled.`,
  };
}

export default function ShoePage({ params, searchParams }: Props) {
  return (
    <main className={PAGE_NARROW}>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const p = await loadProduct((await params).slug);
  if (!p || p.product.status !== "pubblicato") notFound();
  if (p.category !== "scarpe") permanentRedirect(`/prodotti/${p.product.slug}`);
  const sp = await searchParams;
  const mentions = await loadGuides(p.product.id);

  return (
    <>
      <ProductHeader p={p} />
      <Specs p={p} />
      <CorrectLink productId={p.product.id} />
      <Reviews p={p} mentions={mentions} />
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Dati della community</h2>
        <Suspense fallback={<p className="text-sm">Calcolo…</p>}>
          <Community productId={p.product.id} />
        </Suspense>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Che taglia prendere?</h2>
        <Suspense fallback={<p className="text-sm">Calcolo…</p>}>
          <SizeRouting p={p} rif={str(sp.rif)} taglia={str(sp.taglia)} />
        </Suspense>
      </section>
    </>
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

function Specs({ p }: { p: PublicProduct }) {
  const s = p.specs;
  const rows: [string, string][] = [];
  if (s?.dropMm != null) rows.push(["Drop", `${s.dropMm} mm`]);
  if (s?.stackHeelMm != null) rows.push(["Stack tallone", `${s.stackHeelMm} mm`]);
  if (s?.stackForeMm != null) rows.push(["Stack avampiede", `${s.stackForeMm} mm`]);
  if (s?.weightG != null) rows.push(["Peso", `${s.weightG} g${s.weightRefSize ? ` (${s.weightRefSize})` : ""}`]);
  if (s?.lugMm != null) rows.push(["Tasselli", `${s.lugMm} mm`]);
  if (s?.plate) rows.push(["Piastra", PLATE_LABELS[s.plate]]);
  if (s?.waterproof != null) rows.push(["Impermeabile", s.waterproof ? "sì" : "no"]);
  if (s?.terrains.length) rows.push(["Terreni ideali", s.terrains.map((t) => TERRAIN_LABELS[t]).join(", ")]);
  if (s?.upper) rows.push(["Tomaia", s.upper]);
  if (s?.midsole) rows.push(["Intersuola", s.midsole]);
  if (s?.outsole) rows.push(["Suola", s.outsole]);
  if (s?.fitNote) rows.push(["Vestibilità", s.fitNote]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Specifiche</h2>
      {rows.length ? (
        // Come le schede del catalogo: etichetta leggera, valore in grassetto.
        <dl className="card">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9.5rem_1fr] gap-3 border-b border-black px-5 py-2.5 text-[14px] last:border-b-0 max-sm:grid-cols-[6.5rem_1fr] max-sm:px-4 max-sm:py-2">
              <dt className="font-light">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-zinc-500">Specifiche non ancora inserite.</p>
      )}
    </section>
  );
}

async function Community({ productId }: { productId: string }) {
  const s = await loadStats(productId);
  if (!s) {
    return (
      <p className="text-zinc-500">
        Dati insufficienti: servono almeno {PRIVACY_K} runner che usano questa
        scarpa.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6 card p-5">
      <p className="text-sm text-zinc-600">
        {s.users} runner la usano o l&apos;hanno usata. Separato dalla recensione della redazione.
      </p>
      <div className="flex flex-col gap-1.5">
        <StatHeading>Voti</StatHeading>
        {SCORE_FIELDS.map((k) => (
          <FieldStatRow key={k} label={SCORE_LABELS[k]} stat={s.scores[k]} />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <StatHeading>Fit rispetto alla taglia</StatHeading>
        {FIT_FIELDS.map((k) => (
          <FitStatRow key={k} label={FIT_LABELS[k]} field={k} stat={s.fit[k]} />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <StatHeading>Distanze consigliate</StatHeading>
        {s.distances ? s.distances.map((d) => <ShareBar key={d.band} label={d.band} share={d.share} />) : <Insufficient />}
      </div>
      {/* Secondo i runner: può differire dai terreni indicati dalla redazione nelle specifiche. */}
      <div className="flex flex-col gap-1.5">
        <StatHeading>Terreni dove la usano</StatHeading>
        {!s.terrains ? (
          <Insufficient />
        ) : s.terrains.length ? (
          s.terrains.map((t) => <ShareBar key={t.terrain} label={TERRAIN_LABELS[t.terrain]} share={t.share} />)
        ) : (
          <p className="text-sm text-zinc-500">Nessun terreno indicato.</p>
        )}
      </div>
      <p className="text-[14px] font-semibold">
        <span className="font-light">Km medi alla dismissione: </span>
        {s.retiredKm != null ? `${s.retiredKm.toLocaleString("it-IT")} km` : <Insufficient />}
      </p>
    </div>
  );
}

async function loadRouting(targetId: string) {
  "use cache";
  cacheTag("stats");
  cacheLife("minutes");
  return sizeRoutingReferences(db, targetId);
}

async function loadRefSizes(targetId: string, refId: string) {
  "use cache";
  cacheTag("stats");
  cacheLife("minutes");
  return sizeRoutingRefSizes(db, targetId, refId);
}

async function loadSizeRouting(targetId: string, refId: string, refSystem: string, refSize: string) {
  "use cache";
  cacheTag("stats");
  cacheLife("minutes");
  return sizeRouting(db, { targetId, refId, refSystem, refSize });
}

async function SizeRouting({
  p,
  rif,
  taglia,
}: {
  p: PublicProduct;
  rif?: string;
  taglia?: string;
}) {
  const refs = await loadRouting(p.product.id);
  if (refs.length === 0) {
    return (
      <p className="text-zinc-500">
        Non ci sono ancora abbastanza runner che usano questa scarpa insieme a un&apos;altra per un confronto di taglia.
      </p>
    );
  }

  // Precompila dal proprio equipaggiamento: la prima scarpa di riferimento che possiedi.
  let refId = refs.some((r) => r.id === rif) ? rif! : undefined;
  let size = taglia;
  if (!refId) {
    const me = await getCurrentUser();
    if (me) {
      const mine = (await listGear(db, me.id)).find((g) => refs.some((r) => r.id === g.product.id));
      if (mine) {
        refId = mine.product.id;
        size ??= `${mine.gear.sizeSystem}|${mine.gear.sizeValue}`;
      }
    }
  }
  refId ??= refs[0].id;

  const sizes = await loadRefSizes(p.product.id, refId);
  const sizeKeys = sizes.map((s) => `${s.size_system}|${s.size_value}`);
  if (!size || !sizeKeys.includes(size)) size = sizeKeys[0];
  const [refSystem, refSize] = size?.split("|") ?? [];
  const result = refSystem ? await loadSizeRouting(p.product.id, refId, refSystem, refSize) : null;
  const refName = refs.find((r) => r.id === refId)?.name;

  return (
    <div className="flex flex-col gap-4 card p-5">
      {/* GET con next/form: navigazione lato client senza ricaricare né tornare in cima;
          senza JavaScript resta un normale form. Il risultato è nell'URL. */}
      <Form className="flex flex-wrap items-end gap-3" action={`/scarpe/${p.product.slug}`} scroll={false} replace>
        <label className="flex flex-col gap-1 text-sm">
          Scarpa che conosci
          <select name="rif" defaultValue={refId} className={inputClass}>
            {refs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          La tua taglia
          <select name="taglia" defaultValue={size} className={inputClass}>
            {sizes.map((s) => (
              <option key={`${s.size_system}|${s.size_value}`} value={`${s.size_system}|${s.size_value}`}>
                {formatSize(s.size_system as keyof typeof SIZE_SYSTEM_LABELS, s.size_value)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass}>
          Confronta
        </button>
      </Form>
      {result ? (
        <div className="flex flex-col gap-1.5">
          <p className="mb-1">
            Chi usa la <strong>{refName}</strong> in{" "}
            <strong>{formatSize(refSystem as keyof typeof SIZE_SYSTEM_LABELS, refSize)}</strong> usa questa in:
          </p>
          {result.sizes.map((s) => (
            <ShareBar key={`${s.system}${s.value}`} label={formatSize(s.system as keyof typeof SIZE_SYSTEM_LABELS, s.value)} share={s.share} />
          ))}
          <p className="mt-1 text-sm text-zinc-600">
            Su {result.users} runner.
            {result.fitLength != null && ` In lunghezza: ${fitWord("fitLength", result.fitLength).toLowerCase()}.`}
            {result.fitWidth != null && ` In larghezza: ${fitWord("fitWidth", result.fitWidth).toLowerCase()}.`}
            {result.sizes.reduce((a, s) => a + s.share, 0) > 1.001 && " Alcuni usano più di una taglia."}
          </p>
        </div>
      ) : (
        <p className="text-zinc-500">Dati insufficienti per questa combinazione.</p>
      )}
      <p className="text-xs text-zinc-500">
        Taglie US come sull&apos;etichetta, senza conversioni; uomo e donna restano separate. Servono almeno {PRIVACY_K} runner.
      </p>
    </div>
  );
}
