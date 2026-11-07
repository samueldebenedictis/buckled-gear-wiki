// Letture pubbliche del catalogo. Senza "server-only" così si testa con PGlite.
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import type { Category } from "@/db/enum-values";
import { brands, gearFeedback, models, products, reviewMedia, reviews, shoeSpecs, userGear } from "@/db/schema";
import { attributeDefs } from "./categories";
import { searchProducts } from "./search";
import { PRIVACY_K } from "./config";
import { DROP_RANGES, WEIGHT_RANGES, type CatalogFilters } from "./validation/catalog-filters";

/** Quota minima di feedback che indicano una distanza perché valga come "consigliata". */
export const DISTANCE_COMMUNITY_SHARE = 0.5;

function filterConditions(f: CatalogFilters): SQL[] {
  const c: SQL[] = [];
  if (f.tipo) c.push(eq(models.category, f.tipo));
  if (f.marca) c.push(eq(brands.slug, f.marca));
  if (f.terreno) c.push(sql`${f.terreno} = any(${shoeSpecs.terrains})`);
  if (f.piastra) c.push(eq(shoeSpecs.plate, f.piastra));
  if (f.impermeabile) c.push(eq(shoeSpecs.waterproof, f.impermeabile === "si"));
  if (f.drop) {
    const [min, max] = DROP_RANGES[f.drop];
    c.push(sql`${shoeSpecs.dropMm} between ${min} and ${max}`);
  }
  if (f.peso) {
    const [min, max] = WEIGHT_RANGES[f.peso];
    c.push(sql`${shoeSpecs.weightG} between ${min} and ${max}`);
  }
  if (f.tipo && f.attrs) {
    for (const d of attributeDefs(f.tipo)) {
      const v = f.attrs[d.key];
      if (v === undefined) continue;
      const field = sql`${products.attributes} ->> ${d.key}`;
      if (d.type === "enum") c.push(sql`${field} = ${v}`);
      else if (d.type === "bool") c.push(sql`(${field})::boolean = ${v === "true"}`);
      else if ((d.type === "int" || d.type === "decimal") && d.ranges?.[v]) {
        const [min, max] = d.ranges[v];
        c.push(sql`(${field})::numeric between ${min} and ${max}`);
      }
    }
  }
  if (f.distanza) {
    // Consigliata dalla redazione, oppure dalla community (≥ K runner, ≥ 50% dei feedback).
    c.push(sql`(
      ${products.id} in (
        select ${reviews.productId} from ${reviews}
        where ${reviews.status} = 'pubblicata' and ${f.distanza} = any(${reviews.distances}))
      or ${products.id} in (
        select ${userGear.productId} from ${gearFeedback}
        join ${userGear} on ${userGear.id} = ${gearFeedback.gearId}
        group by ${userGear.productId}
        having count(distinct ${userGear.userId}) >= ${PRIVACY_K}
          and avg(case when ${f.distanza} = any(${gearFeedback.distances}) then 1.0 else 0 end) >= ${DISTANCE_COMMUNITY_SHARE})
    )`);
  }
  return c;
}

export async function listCatalog(db: Db, filters: CatalogFilters = {}, opts: { ids?: string[] } = {}) {
  if (opts.ids && opts.ids.length === 0) return [];
  // Ricerca: prima i prodotti pertinenti (pg_trgm), poi gli altri filtri su quelli.
  let rank: Map<string, number> | null = null;
  if (filters.q) {
    const found = await searchProducts(db, filters.q, 60);
    if (!found.length) return [];
    rank = new Map(found.map((r, i) => [r.id, i]));
  }
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.displayName,
      version: products.version,
      releaseYear: products.releaseYear,
      priceEur: products.priceEur,
      imagePath: products.imagePath,
      attributes: products.attributes,
      category: models.category,
      brand: brands.name,
      model: models.name,
      specs: {
        dropMm: shoeSpecs.dropMm,
        stackHeelMm: shoeSpecs.stackHeelMm,
        stackForeMm: shoeSpecs.stackForeMm,
        weightG: shoeSpecs.weightG,
        weightRefSize: shoeSpecs.weightRefSize,
        lugMm: shoeSpecs.lugMm,
        plate: shoeSpecs.plate,
        terrains: shoeSpecs.terrains,
        waterproof: shoeSpecs.waterproof,
      },
      verdict: reviews.verdict,
      videoUrl: reviewMedia.url,
    })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
    .leftJoin(reviews, and(eq(reviews.productId, products.id), eq(reviews.status, "pubblicata")))
    .leftJoin(reviewMedia, and(eq(reviewMedia.reviewId, reviews.id), eq(reviewMedia.kind, "youtube")))
    .where(
      and(
        eq(products.status, "pubblicato"),
        rank ? inArray(products.id, [...rank.keys()]) : undefined,
        opts.ids ? inArray(products.id, opts.ids) : undefined,
        ...filterConditions(filters),
      ),
    )
    .orderBy(asc(brands.name), asc(products.displayName), asc(reviews.publishedAt));

  // Una riga per prodotto: primo verdetto e primo video tra le recensioni pubblicate.
  const byId = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = byId.get(r.id);
    if (!cur) byId.set(r.id, { ...r });
    else {
      cur.verdict ??= r.verdict;
      cur.videoUrl ??= r.videoUrl;
    }
  }
  const list = [...byId.values()];
  // Con una ricerca, ordine per pertinenza invece che alfabetico.
  return rank ? list.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!) : list;
}

export type CatalogItem = Awaited<ReturnType<typeof listCatalog>>[number];

/** Dati pubblici della pagina scarpa: prodotto, specifiche, recensioni pubblicate con i media. */
export async function getPublicProduct(db: Db, slug: string) {
  const [row] = await db
    .select({ product: products, brand: brands.name, model: models.name, category: models.category, specs: shoeSpecs })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
    .where(eq(products.slug, slug));
  if (!row) return null;

  const revs = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, row.product.id), eq(reviews.status, "pubblicata")))
    .orderBy(asc(reviews.publishedAt));
  const media = revs.length
    ? await db
        .select()
        .from(reviewMedia)
        .where(inArray(reviewMedia.reviewId, revs.map((r) => r.id)))
    : [];
  return {
    ...row,
    // L'autore resta interno: in pubblico la recensione è "della redazione".
    reviews: revs.map((r) => ({
      id: r.id,
      title: r.title,
      verdict: r.verdict,
      bodyMd: r.bodyMd,
      kmTested: r.kmTested,
      scores: r.scores,
      distances: r.distances,
      publishedAt: r.publishedAt,
      media: media.filter((m) => m.reviewId === r.id),
    })),
  };
}

export type PublicProduct = NonNullable<Awaited<ReturnType<typeof getPublicProduct>>>;

/** Marche con almeno un prodotto in catalogo (della categoria, se indicata), per il filtro. */
export async function listBrandsForFilter(db: Db, category?: Category) {
  return db
    .selectDistinct({ slug: brands.slug, name: brands.name })
    .from(brands)
    .innerJoin(models, and(eq(models.brandId, brands.id), category ? eq(models.category, category) : undefined))
    .innerJoin(products, and(eq(products.modelId, models.id), eq(products.status, "pubblicato")))
    .orderBy(asc(brands.name));
}
