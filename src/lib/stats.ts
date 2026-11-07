// Statistiche pubbliche della community. Regola: ogni numero restituito deriva da
// almeno PRIVACY_K utenti distinti. I dati individuali
// restano dentro questo modulo.
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  DISTANCE_BANDS,
  FIT_FIELDS,
  TERRAINS,
  SCORE_FIELDS,
  type FitField,
  type ScoreField,
} from "@/db/enum-values";
import { brands, gearFeedback, models, products, userGear } from "@/db/schema";
import { PRIVACY_K } from "./config";

type Distribution = { value: number; share: number }[];
export type FieldStat = { avg: number; users: number; distribution: Distribution } | null;

const distinct = (ids: string[]) => new Set(ids).size;

function fieldStat(rows: { userId: string; v: number | null }[], range: number[]): FieldStat {
  const filled = rows.filter((r): r is { userId: string; v: number } => r.v !== null);
  const users = distinct(filled.map((r) => r.userId));
  if (users < PRIVACY_K) return null;
  const avg = filled.reduce((s, r) => s + r.v, 0) / filled.length;
  const distribution = range.map((value) => ({
    value,
    share: filled.filter((r) => r.v === value).length / filled.length,
  }));
  return { avg, users, distribution };
}

/** Aggregati della pagina scarpa. `null` se gli utenti sono meno di K. */
export async function productStats(db: Db, productId: string) {
  const rows = await db
    .select({ userId: userGear.userId, status: userGear.status, km: userGear.km, fb: gearFeedback })
    .from(userGear)
    .leftJoin(gearFeedback, eq(gearFeedback.gearId, userGear.id))
    .where(eq(userGear.productId, productId));

  const users = distinct(rows.map((r) => r.userId));
  if (users < PRIVACY_K) return null;

  const withFb = rows.filter((r) => r.fb !== null);
  const fit = Object.fromEntries(
    FIT_FIELDS.map((f) => [f, fieldStat(withFb.map((r) => ({ userId: r.userId, v: r.fb![f] })), [-1, 0, 1])]),
  ) as Record<FitField, FieldStat>;
  const scores = Object.fromEntries(
    SCORE_FIELDS.map((f) => [f, fieldStat(withFb.map((r) => ({ userId: r.userId, v: r.fb![f] })), [1, 2, 3, 4, 5])]),
  ) as Record<ScoreField, FieldStat>;

  const fbUsers = distinct(withFb.map((r) => r.userId));
  const distances =
    fbUsers >= PRIVACY_K
      ? DISTANCE_BANDS.map((band) => ({
          band,
          share: withFb.filter((r) => r.fb!.distances.includes(band)).length / withFb.length,
        }))
      : null;
  // Terreni dove la usano i runner, solo quelli segnati da qualcuno.
  const terrains =
    fbUsers >= PRIVACY_K
      ? TERRAINS.map((terrain) => ({
          terrain,
          share: withFb.filter((r) => r.fb!.terrains.includes(terrain)).length / withFb.length,
        })).filter((t) => t.share > 0)
      : null;

  const retired = rows.filter((r) => r.status === "dismessa" && r.km > 0);
  const retiredKm =
    distinct(retired.map((r) => r.userId)) >= PRIVACY_K
      ? Math.round(retired.reduce((s, r) => s + r.km, 0) / retired.length)
      : null;

  return { users, fit, scores, distances, terrains, retiredKm };
}

export type ProductStats = NonNullable<Awaited<ReturnType<typeof productStats>>>;

// ---------------------------------------------------------------------------
// Routing taglia: "chi usa Y in US 9 usa questa in…". Solo utenti che possiedono
// entrambe le scarpe; nessuna conversione tra sistemi di taglia.

/**
 * Scarpe di riferimento utili per `targetId`: quelle con almeno una taglia usata
 * da K o più runner che possiedono anche la scarpa target.
 */
export async function sizeRoutingReferences(db: Db, targetId: string) {
  type Ref = { id: string; name: string };
  return db.execute<Ref>(sql`
    select distinct p.id, p.display_name as name
    from (
      select r.product_id
      from ${userGear} r
      join ${userGear} t on t.user_id = r.user_id and t.product_id = ${targetId}
      where r.product_id <> ${targetId}
      group by r.product_id, r.size_system, r.size_value
      having count(distinct r.user_id) >= ${PRIVACY_K}
    ) ok
    join ${products} p on p.id = ok.product_id
    where p.status = 'pubblicato'
    order by p.display_name`).then((r) => rowsOf<Ref>(r));
}

/** Taglie della scarpa di riferimento usate da almeno K co-possessori. */
export async function sizeRoutingRefSizes(db: Db, targetId: string, refId: string) {
  type Size = { size_system: string; size_value: string };
  return db.execute<Size>(sql`
    select r.size_system, r.size_value
    from ${userGear} r
    join ${userGear} t on t.user_id = r.user_id and t.product_id = ${targetId}
    where r.product_id = ${refId}
    group by r.size_system, r.size_value
    having count(distinct r.user_id) >= ${PRIVACY_K}
    order by r.size_system, r.size_value`).then((r) => rowsOf<Size>(r));
}

export async function sizeRouting(
  db: Db,
  args: { targetId: string; refId: string; refSystem: string; refSize: string },
) {
  type Row = { user_id: string; size_system: string; size_value: string; fit_length: number | null; fit_width: number | null };
  const rows = await db.execute<Row>(sql`
    select distinct t.id, t.user_id, t.size_system, t.size_value, fb.fit_length, fb.fit_width
    from ${userGear} r
    join ${userGear} t on t.user_id = r.user_id and t.product_id = ${args.targetId}
    left join ${gearFeedback} fb on fb.gear_id = t.id
    where r.product_id = ${args.refId}
      and r.size_system = ${args.refSystem} and r.size_value = ${args.refSize}`).then((r) => rowsOf<Row>(r));

  const users = distinct(rows.map((r) => r.user_id));
  if (users < PRIVACY_K) return null;

  const buckets = new Map<string, { system: string; value: string; users: Set<string> }>();
  for (const r of rows) {
    const key = `${r.size_system}|${r.size_value}`;
    const b = buckets.get(key) ?? { system: r.size_system, value: r.size_value, users: new Set() };
    b.users.add(r.user_id);
    buckets.set(key, b);
  }
  const sizes = [...buckets.values()]
    .map((b) => ({ system: b.system, value: b.value, share: b.users.size / users }))
    .sort((a, b) => b.share - a.share || a.value.localeCompare(b.value, "it", { numeric: true }));

  const avgOf = (k: "fit_length" | "fit_width") => {
    const f = rows.filter((r) => r[k] !== null);
    return distinct(f.map((r) => r.user_id)) >= PRIVACY_K
      ? f.reduce((s, r) => s + Number(r[k]), 0) / f.length
      : null;
  };
  return { users, sizes, fitLength: avgOf("fit_length"), fitWidth: avgOf("fit_width") };
}

// ---------------------------------------------------------------------------
// Classifiche

/** Media dei voti 1–5 compilati di un feedback (null se nessuno). */
const overallScore = sql`(select avg(v) from unnest(array[
  ${gearFeedback.heelHold}, ${gearFeedback.durability}, ${gearFeedback.comfort}, ${gearFeedback.cushioning},
  ${gearFeedback.stability}, ${gearFeedback.gripDry}, ${gearFeedback.gripWet}]) v)`;

const productCols = {
  id: products.id,
  name: products.displayName,
  slug: products.slug,
  modelId: products.modelId,
  model: models.name,
  brand: brands.name,
};

function baseRanking(db: Db) {
  return db
    .select({
      ...productCols,
      users: sql<number>`count(distinct ${userGear.userId})::int`,
    })
    .from(userGear)
    .innerJoin(products, eq(products.id, userGear.productId))
    .innerJoin(models, eq(models.id, products.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(eq(products.status, "pubblicato"))
    .groupBy(products.id, models.id, brands.id);
}

export async function rankings(db: Db, limit = 10) {
  const k = PRIVACY_K;
  const [mostUsed, favorites, durable] = await Promise.all([
    baseRanking(db)
      .having(sql`count(distinct ${userGear.userId}) >= ${k}`)
      .orderBy(sql`count(distinct ${userGear.userId}) desc`, products.displayName)
      .limit(limit),

    db
      .select({
        ...productCols,
        users: sql<number>`count(distinct ${userGear.userId})::int`,
        score: sql<number>`avg(${overallScore})::float`,
      })
      .from(gearFeedback)
      .innerJoin(userGear, eq(userGear.id, gearFeedback.gearId))
      .innerJoin(products, eq(products.id, userGear.productId))
      .innerJoin(models, eq(models.id, products.modelId))
      .innerJoin(brands, eq(brands.id, models.brandId))
      .where(and(eq(products.status, "pubblicato"), sql`${overallScore} is not null`))
      .groupBy(products.id, models.id, brands.id)
      .having(sql`count(distinct ${userGear.userId}) >= ${k}`)
      .orderBy(sql`avg(${overallScore}) desc`)
      .limit(limit),

    db
      .select({
        ...productCols,
        users: sql<number>`count(distinct ${userGear.userId})::int`,
        km: sql<number>`round(avg(${userGear.km}))::int`,
      })
      .from(userGear)
      .innerJoin(products, eq(products.id, userGear.productId))
      .innerJoin(models, eq(models.id, products.modelId))
      .innerJoin(brands, eq(brands.id, models.brandId))
      .where(and(eq(products.status, "pubblicato"), eq(userGear.status, "dismessa"), sql`${userGear.km} > 0`))
      .groupBy(products.id, models.id, brands.id)
      .having(sql`count(distinct ${userGear.userId}) >= ${k}`)
      .orderBy(sql`avg(${userGear.km}) desc`)
      .limit(limit),
  ]);

  return { mostUsed, favorites, durable };
}

function rowsOf<T>(res: unknown): T[] {
  // node-postgres restituisce { rows }, PGlite pure; per sicurezza gestisce anche l'array.
  return (Array.isArray(res) ? res : (res as { rows: T[] }).rows) as T[];
}
