// Gestione del catalogo da parte della redazione. Senza dipendenze da Next
// (si testa con PGlite): i permessi li controllano le Server Actions.
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import type { Category, PRODUCT_STATUSES } from "@/db/enum-values";
import { brands, models, productAliases, products, proposals, reviews, shoeSpecs, userGear } from "@/db/schema";
import { isReferencedError, PG_UNIQUE_VIOLATION, pgError } from "./pg-error";
import { searchProducts } from "./search";
import { slugify } from "./slug";
import type { CreateProductInput, SpecsInput, UpdateProductInput } from "./validation/catalog";

export class CatalogError extends Error {}

export function defaultDisplayName(brand: string, model: string, version: string) {
  return [brand, model, version].filter(Boolean).join(" ");
}

/** Schede di stato della lista redazione. "incompleti" = manca foto, caratteristiche o prezzo. */
export const ADMIN_STATI = ["pubblicati", "bozze", "incompleti"] as const;
export type AdminStato = (typeof ADMIN_STATI)[number];

export type AdminCatalogFilters = {
  q?: string;
  tipo?: Category;
  stato?: AdminStato;
};

const hasSpecsSql = sql<boolean>`${shoeSpecs.productId} is not null or ${products.attributes} <> '{}'::jsonb`;

/** Elenco della redazione: bozze comprese, con ricerca fuzzy, categoria e stato. */
export async function listProductsAdmin(db: Db, f: AdminCatalogFilters = {}): Promise<AdminProductRow[]> {
  let rank: Map<string, number> | null = null;
  if (f.q) {
    const found = await searchProducts(db, f.q, 100, { includeDrafts: true });
    if (!found.length) return [];
    rank = new Map(found.map((r, i) => [r.id, i]));
  }
  const rows = await db
    .select({
      id: products.id,
      name: products.displayName,
      brand: brands.name,
      status: products.status,
      category: models.category,
      hasPhoto: sql<boolean>`${products.imagePath} is not null`,
      hasSpecs: hasSpecsSql,
      hasPrice: sql<boolean>`${products.priceEur} is not null`,
      hasReview: sql<boolean>`exists (select 1 from ${reviews} where ${reviews.productId} = ${products.id} and ${reviews.status} = 'pubblicata')`,
      aliases: sql<number>`(select count(*)::int from ${productAliases} where ${productAliases.productId} = ${products.id})`,
    })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
    .where(
      and(
        rank ? inArray(products.id, [...rank.keys()]) : undefined,
        f.tipo ? eq(models.category, f.tipo) : undefined,
      ),
    )
    .orderBy(asc(brands.name), asc(products.displayName));
  const sorted = rank ? rows.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!) : rows;
  return f.stato ? filterByStato(sorted, f.stato) : sorted;
}

export type AdminProductRow = Flags & {
  id: string;
  name: string;
  brand: string;
  category: Category;
  hasReview: boolean;
  aliases: number;
};

type Flags = { status: ProductStatus; hasPhoto: boolean; hasSpecs: boolean; hasPrice: boolean };
export const isIncomplete = (r: Flags) => !r.hasPhoto || !r.hasSpecs || !r.hasPrice;

export function filterByStato<T extends Flags>(rows: T[], stato: AdminStato) {
  if (stato === "pubblicati") return rows.filter((r) => r.status === "pubblicato");
  if (stato === "bozze") return rows.filter((r) => r.status === "bozza");
  return rows.filter(isIncomplete);
}

/** Conteggi per le schede di stato (sugli stessi filtri di ricerca e categoria). */
export function countByStato(rows: Flags[]) {
  return {
    tutti: rows.length,
    pubblicati: filterByStato(rows, "pubblicati").length,
    bozze: filterByStato(rows, "bozze").length,
    incompleti: filterByStato(rows, "incompleti").length,
  };
}

/** Brand e modelli esistenti, per i suggerimenti nel form di creazione. */
export async function listBrandsAndModels(db: Db) {
  const [b, m] = await Promise.all([
    db.select({ name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.selectDistinct({ name: models.name }).from(models).orderBy(asc(models.name)),
  ]);
  return { brands: b.map((r) => r.name), models: m.map((r) => r.name) };
}

export async function getProductAdmin(db: Db, id: string) {
  const [row] = await db
    .select({ product: products, brand: brands.name, brandId: brands.id, model: models.name, category: models.category, specs: shoeSpecs })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
    .where(eq(products.id, id));
  if (!row) return null;

  const [aliases, [gear], [revs]] = await Promise.all([
    db
      .select({ alias: productAliases.alias })
      .from(productAliases)
      .where(eq(productAliases.productId, id))
      .orderBy(asc(productAliases.alias)),
    db.select({ n: count() }).from(userGear).where(eq(userGear.productId, id)),
    db.select({ n: count() }).from(reviews).where(eq(reviews.productId, id)),
  ]);
  return {
    ...row,
    aliases: aliases.map((a) => a.alias),
    // Solo conteggi: chi possiede la scarpa resta privato.
    gearCount: gear.n,
    reviewCount: revs.n,
  };
}

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Crea il prodotto, riusando brand e modello se esistono già (senza distinguere maiuscole).
 * Nasce in bozza: lo pubblica la redazione.
 */
export async function createProduct(db: Db, input: CreateProductInput, opts: { status?: ProductStatus } = {}) {
  return db.transaction(async (tx) => {
    let [brand] = await tx
      .select()
      .from(brands)
      .where(sql`lower(${brands.name}) = lower(${input.brand})`);
    if (!brand) {
      [brand] = await tx
        .insert(brands)
        .values({ name: input.brand, slug: slugify(input.brand) })
        .returning();
    }

    let [model] = await tx
      .select()
      .from(models)
      .where(and(eq(models.brandId, brand.id), sql`lower(${models.name}) = lower(${input.model})`));
    if (!model) {
      [model] = await tx
        .insert(models)
        .values({ brandId: brand.id, category: input.category, name: input.model, slug: slugify(input.model) })
        .returning();
    } else if (model.category !== input.category) {
      throw new CatalogError(`${brand.name} ${model.name} esiste già in un'altra categoria (${model.category}).`);
    }

    const [dup] = await tx
      .select({ name: products.displayName })
      .from(products)
      .where(and(eq(products.modelId, model.id), eq(products.version, input.version)));
    if (dup) throw new CatalogError(`Esiste già: ${dup.name}.`);

    const displayName = input.displayName ?? defaultDisplayName(brand.name, model.name, input.version);
    const slug = slugify(displayName);
    if (!slug) throw new CatalogError("Il nome non contiene lettere o numeri.");
    const [taken] = await tx.select({ id: products.id }).from(products).where(eq(products.slug, slug));
    if (taken) throw new CatalogError(`L'indirizzo "${slug}" è già usato da un altro prodotto.`);

    const [product] = await tx
      .insert(products)
      .values({
        modelId: model.id,
        version: input.version,
        displayName,
        slug,
        releaseYear: input.releaseYear,
        priceEur: input.priceEur,
        status: opts.status ?? "bozza",
      })
      .returning({ id: products.id });
    return product.id;
  });
}

/** Lo slug non cambia: è l'indirizzo pubblico della pagina scarpa. */
export async function updateProduct(db: Db, id: string, input: UpdateProductInput) {
  try {
    await db.update(products).set(input).where(eq(products.id, id));
  } catch (e) {
    if (pgError(e)?.constraint === "products_model_version_uq") {
      throw new CatalogError("Questo modello ha già un prodotto con la stessa versione.");
    }
    throw e;
  }
}

/** Pubblica o rimette in bozza. */
export async function setStatus(db: Db, id: string, status: ProductStatus) {
  await db.update(products).set({ status }).where(eq(products.id, id));
}

/** Stesso stato per più prodotti insieme (selezione multipla). */
export async function setStatusMany(db: Db, ids: string[], status: ProductStatus) {
  if (ids.length) await db.update(products).set({ status }).where(inArray(products.id, ids));
}

/**
 * Elimina solo prodotti mai usati (es. bozze sbagliate); gli altri vanno rimessi in bozza.
 * Le correzioni ancora aperte sul prodotto si eliminano; brand e modello rimasti senza
 * prodotti anche.
 */
export async function deleteProduct(db: Db, id: string) {
  // Le recensioni sparirebbero in cascata: meglio fermarsi.
  const [revs] = await db.select({ n: count() }).from(reviews).where(eq(reviews.productId, id));
  if (revs.n > 0) throw new CatalogError("Ha delle recensioni: rimettilo in bozza invece di eliminarlo.");
  try {
    await db.transaction(async (tx) => {
      const [p] = await tx.select({ modelId: products.modelId }).from(products).where(eq(products.id, id));
      if (!p) return;
      await tx.delete(proposals).where(eq(proposals.productId, id));
      await tx.delete(products).where(eq(products.id, id));
      const [m] = await tx
        .delete(models)
        .where(and(eq(models.id, p.modelId), sql`not exists (select 1 from ${products} where ${products.modelId} = ${p.modelId})`))
        .returning({ brandId: models.brandId });
      if (m) {
        await tx
          .delete(brands)
          .where(and(eq(brands.id, m.brandId), sql`not exists (select 1 from ${models} where ${models.brandId} = ${m.brandId})`));
      }
    });
  } catch (e) {
    if (isReferencedError(e)) {
      throw new CatalogError("È nell'equipaggiamento di qualche utente: rimettilo in bozza invece di eliminarlo.");
    }
    throw e;
  }
}

export async function saveSpecs(db: Db, productId: string, specs: SpecsInput) {
  await db
    .insert(shoeSpecs)
    .values({ productId, ...specs })
    .onConflictDoUpdate({ target: shoeSpecs.productId, set: specs });
}

/** Campi specifici di categoria (non scarpe), già validati con attributesSchema. */
export async function saveAttributes(db: Db, productId: string, attributes: Record<string, string | number | boolean>) {
  await db.update(products).set({ attributes }).where(eq(products.id, productId));
}

export async function getProductCategory(db: Db, productId: string) {
  const [row] = await db
    .select({ category: models.category })
    .from(products)
    .innerJoin(models, eq(models.id, products.modelId))
    .where(eq(products.id, productId));
  return row?.category ?? null;
}

export async function addAlias(db: Db, productId: string, alias: string) {
  try {
    await db.insert(productAliases).values({ productId, alias });
  } catch (e) {
    if (pgError(e)?.code === PG_UNIQUE_VIOLATION) {
      const [owner] = await db
        .select({ name: products.displayName })
        .from(productAliases)
        .innerJoin(products, eq(products.id, productAliases.productId))
        .where(sql`lower(${productAliases.alias}) = lower(${alias})`);
      throw new CatalogError(`Alias già usato${owner ? ` da ${owner.name}` : ""}.`);
    }
    throw e;
  }
}

export async function removeAlias(db: Db, productId: string, alias: string) {
  await db
    .delete(productAliases)
    .where(and(eq(productAliases.productId, productId), eq(productAliases.alias, alias)));
}

/**
 * Rinomina brand o modello. I nomi mostrati dei prodotti si aggiornano solo se erano
 * quelli generati in automatico; gli slug (indirizzi pubblici) non cambiano.
 */
export async function renameBrand(db: Db, brandId: string, name: string) {
  await db.transaction(async (tx) => {
    const [brand] = await tx.select().from(brands).where(eq(brands.id, brandId));
    if (!brand) throw new CatalogError("Brand non trovato.");
    const [clash] = await tx
      .select({ id: brands.id })
      .from(brands)
      .where(sql`lower(${brands.name}) = lower(${name}) and ${brands.id} <> ${brandId}`);
    if (clash) throw new CatalogError("Esiste già un brand con questo nome.");

    await tx.update(brands).set({ name, slug: slugify(name) }).where(eq(brands.id, brandId));
    const rows = await tx
      .select({ id: products.id, displayName: products.displayName, version: products.version, model: models.name })
      .from(products)
      .innerJoin(models, eq(models.id, products.modelId))
      .where(eq(models.brandId, brandId));
    for (const r of rows) {
      if (r.displayName === defaultDisplayName(brand.name, r.model, r.version)) {
        await tx
          .update(products)
          .set({ displayName: defaultDisplayName(name, r.model, r.version) })
          .where(eq(products.id, r.id));
      }
    }
  });
}

export async function renameModel(db: Db, modelId: string, name: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ model: models, brand: brands.name })
      .from(models)
      .innerJoin(brands, eq(brands.id, models.brandId))
      .where(eq(models.id, modelId));
    if (!row) throw new CatalogError("Modello non trovato.");
    const [clash] = await tx
      .select({ id: models.id })
      .from(models)
      .where(
        sql`${models.brandId} = ${row.model.brandId} and lower(${models.name}) = lower(${name}) and ${models.id} <> ${modelId}`,
      );
    if (clash) throw new CatalogError("Questo brand ha già un modello con questo nome.");

    await tx.update(models).set({ name, slug: slugify(name) }).where(eq(models.id, modelId));
    const rows = await tx
      .select({ id: products.id, displayName: products.displayName, version: products.version })
      .from(products)
      .where(eq(products.modelId, modelId));
    for (const r of rows) {
      if (r.displayName === defaultDisplayName(row.brand, row.model.name, r.version)) {
        await tx
          .update(products)
          .set({ displayName: defaultDisplayName(row.brand, name, r.version) })
          .where(eq(products.id, r.id));
      }
    }
  });
}
