// Guide curate dalla redazione: elenchi ordinati di prodotti con premio, badge e nota.
import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { brands, guideItems, guides, models, products } from "@/db/schema";
import { slugify } from "./slug";

export class GuideError extends Error {}

export type GuideInput = {
  title: string;
  introMd: string;
  whyMd: string;
  sourceUrl: string | null;
  updatedOn: string | null;
  published: boolean;
};

export type GuideItemInput = { award: string | null; badges: string[]; noteMd: string };

// --- Lettura pubblica -------------------------------------------------------

export async function listPublishedGuides(db: Db) {
  return db
    .select({
      slug: guides.slug,
      title: guides.title,
      updatedOn: guides.updatedOn,
      items: sql<number>`(select count(*)::int from ${guideItems} where ${guideItems.guideId} = ${guides.id})`,
    })
    .from(guides)
    .where(eq(guides.published, true))
    .orderBy(asc(guides.title));
}

async function itemsOf(db: Db, guideId: string, onlyActive: boolean) {
  return db
    .select({
      productId: products.id,
      name: products.displayName,
      slug: products.slug,
      status: products.status,
      imagePath: products.imagePath,
      category: models.category,
      brand: brands.name,
      position: guideItems.position,
      award: guideItems.award,
      badges: guideItems.badges,
      noteMd: guideItems.noteMd,
    })
    .from(guideItems)
    .innerJoin(products, eq(products.id, guideItems.productId))
    .innerJoin(models, eq(models.id, products.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(and(eq(guideItems.guideId, guideId), onlyActive ? eq(products.status, "pubblicato") : undefined))
    .orderBy(asc(guideItems.position), asc(products.displayName));
}

export async function getPublishedGuide(db: Db, slug: string) {
  const [g] = await db
    .select()
    .from(guides)
    .where(and(eq(guides.slug, slug), eq(guides.published, true)));
  if (!g) return null;
  return { ...g, items: await itemsOf(db, g.id, true) };
}

/** Guide pubblicate che contengono un prodotto, per la pagina prodotto. */
export async function guidesForProduct(db: Db, productId: string) {
  return db
    .select({ slug: guides.slug, title: guides.title, award: guideItems.award, badges: guideItems.badges, noteMd: guideItems.noteMd })
    .from(guideItems)
    .innerJoin(guides, eq(guides.id, guideItems.guideId))
    .where(and(eq(guideItems.productId, productId), eq(guides.published, true)))
    .orderBy(asc(guides.title));
}

// --- Redazione --------------------------------------------------------------

export async function listGuidesAdmin(db: Db) {
  return db
    .select({
      id: guides.id,
      slug: guides.slug,
      title: guides.title,
      published: guides.published,
      updatedOn: guides.updatedOn,
      hasIntro: sql<boolean>`${guides.introMd} <> ''`,
      hasWhy: sql<boolean>`${guides.whyMd} <> ''`,
      hasSource: sql<boolean>`${guides.sourceUrl} is not null`,
      items: sql<number>`(select count(*)::int from ${guideItems} where ${guideItems.guideId} = ${guides.id})`,
    })
    .from(guides)
    .orderBy(desc(guides.published), asc(guides.title));
}

export async function getGuideAdmin(db: Db, id: string) {
  const [g] = await db.select().from(guides).where(eq(guides.id, id));
  if (!g) return null;
  return { ...g, items: await itemsOf(db, g.id, false) };
}

export async function createGuide(db: Db, input: GuideInput) {
  const slug = slugify(input.title);
  if (!slug) throw new GuideError("Il titolo non contiene lettere o numeri.");
  const [taken] = await db.select({ id: guides.id }).from(guides).where(eq(guides.slug, slug));
  if (taken) throw new GuideError(`Esiste già una guida con indirizzo /guide/${slug}.`);
  const [g] = await db.insert(guides).values({ ...input, slug }).returning({ id: guides.id });
  return g.id;
}

/** Lo slug resta quello di creazione: è l'indirizzo pubblico. */
export async function updateGuide(db: Db, id: string, input: GuideInput) {
  await db.update(guides).set(input).where(eq(guides.id, id));
}

export async function setGuidePublished(db: Db, id: string, published: boolean) {
  await db.update(guides).set({ published }).where(eq(guides.id, id));
}

export async function deleteGuide(db: Db, id: string) {
  await db.delete(guides).where(eq(guides.id, id));
}

export async function addGuideItem(db: Db, guideId: string, productId: string, input: GuideItemInput) {
  const [{ last }] = await db
    .select({ last: max(guideItems.position) })
    .from(guideItems)
    .where(eq(guideItems.guideId, guideId));
  const inserted = await db
    .insert(guideItems)
    .values({ guideId, productId, position: (last ?? -1) + 1, ...input })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) throw new GuideError("Il prodotto è già nella guida.");
}

export async function updateGuideItem(db: Db, guideId: string, productId: string, input: GuideItemInput) {
  await db
    .update(guideItems)
    .set(input)
    .where(and(eq(guideItems.guideId, guideId), eq(guideItems.productId, productId)));
}

export async function removeGuideItem(db: Db, guideId: string, productId: string) {
  await db.delete(guideItems).where(and(eq(guideItems.guideId, guideId), eq(guideItems.productId, productId)));
}

/** Sposta un prodotto di una posizione in su o in giù, rinumerando la guida. */
export async function moveGuideItem(db: Db, guideId: string, productId: string, direction: "up" | "down") {
  await db.transaction(async (tx) => {
    const items = await tx
      .select({ productId: guideItems.productId })
      .from(guideItems)
      .innerJoin(products, eq(products.id, guideItems.productId))
      .where(eq(guideItems.guideId, guideId))
      .orderBy(asc(guideItems.position), asc(products.displayName));
    const i = items.findIndex((x) => x.productId === productId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    for (const [pos, it] of items.entries()) {
      await tx
        .update(guideItems)
        .set({ position: pos })
        .where(and(eq(guideItems.guideId, guideId), eq(guideItems.productId, it.productId)));
    }
  });
}
