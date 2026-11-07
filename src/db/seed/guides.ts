// Seed delle guide di buckled.it: crea i prodotti mancanti e completa quelli
// esistenti senza sovrascrivere ciò che la redazione ha già inserito.
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { brands, guideItems, guides, models, products, reviewMedia, reviews, shoeSpecs } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { seedGuides as data, type SeedGuide, type SeedGuideItem } from "./guides-data";

export { BADGE_SUGGESTIONS } from "./guides-data";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const displayNameOfItem = (i: SeedGuideItem) =>
  i.displayName ?? [i.brand, i.model, i.version].filter(Boolean).join(" ");

async function ensureProduct(tx: Tx, item: SeedGuideItem) {
  let [brand] = await tx.select().from(brands).where(sql`lower(${brands.name}) = lower(${item.brand})`);
  if (!brand) [brand] = await tx.insert(brands).values({ name: item.brand, slug: slugify(item.brand) }).returning();

  let [model] = await tx
    .select()
    .from(models)
    .where(and(eq(models.brandId, brand.id), sql`lower(${models.name}) = lower(${item.model})`));
  if (!model) {
    [model] = await tx
      .insert(models)
      .values({ brandId: brand.id, category: item.category, name: item.model, slug: slugify(item.model) })
      .returning();
  } else if (model.category !== item.category) {
    throw new Error(`Seed guide: ${item.brand} ${item.model} esiste come ${model.category}, non ${item.category}.`);
  }

  const version = item.version ?? "";
  const displayName = displayNameOfItem(item);
  let [product] = await tx
    .select()
    .from(products)
    .where(and(eq(products.modelId, model.id), eq(products.version, version)));
  let created = false;
  if (!product) {
    [product] = await tx
      .insert(products)
      .values({
        modelId: model.id,
        version,
        displayName,
        slug: slugify(displayName),
        priceEur: item.priceEur ?? null,
        attributes: item.attributes ?? {},
        status: "pubblicato",
      })
      .returning();
    created = true;
  } else {
    // Completa solo i campi vuoti.
    const patch: Partial<typeof products.$inferInsert> = {};
    if (product.priceEur == null && item.priceEur != null) patch.priceEur = item.priceEur;
    if (Object.keys(product.attributes).length === 0 && item.attributes) patch.attributes = item.attributes;
    if (Object.keys(patch).length) await tx.update(products).set(patch).where(eq(products.id, product.id));
  }

  if (item.shoe) {
    await tx
      .insert(shoeSpecs)
      .values({ productId: product.id, ...item.shoe, terrains: item.shoe.terrains ?? [] })
      .onConflictDoNothing();
  }
  return { product, created };
}

async function ensureLinks(tx: Tx, guide: SeedGuide, item: SeedGuideItem, productId: string, name: string) {
  if (!item.links?.length) return;
  const title = `${guide.title}: ${name}`;
  const [existing] = await tx
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.title, title)));
  if (existing) return;
  const [review] = await tx
    .insert(reviews)
    .values({ productId, title, status: "pubblicata", publishedAt: new Date() })
    .returning({ id: reviews.id });
  await tx
    .insert(reviewMedia)
    .values(item.links.map((l) => ({ reviewId: review.id, kind: l.kind, url: l.url, startS: l.startS ?? null })));
}

/** Idempotente: si può rilanciare senza duplicati. */
export async function seedGuidesData(db: Db, guidesData: SeedGuide[] = data) {
  let createdProducts = 0;
  let createdItems = 0;
  for (const g of guidesData) {
    await db.transaction(async (tx) => {
      await tx
        .insert(guides)
        .values({ slug: g.slug, title: g.title, introMd: g.intro, whyMd: g.why ?? "", sourceUrl: g.sourceUrl, updatedOn: g.updatedOn, published: true })
        .onConflictDoNothing();
      // Guide già presenti: aggiunge "the why" solo se la redazione non l'ha scritto.
      if (g.why) {
        await tx
          .update(guides)
          .set({ whyMd: g.why })
          .where(and(eq(guides.slug, g.slug), eq(guides.whyMd, "")));
      }
      const [guide] = await tx.select().from(guides).where(eq(guides.slug, g.slug));

      for (const [position, item] of g.items.entries()) {
        const { product, created } = await ensureProduct(tx, item);
        if (created) createdProducts++;
        const inserted = await tx
          .insert(guideItems)
          .values({
            guideId: guide.id,
            productId: product.id,
            position,
            award: item.award ?? null,
            badges: (item.badges ?? []).map((b) => b.toLowerCase()),
            noteMd: item.note ?? "",
          })
          .onConflictDoNothing()
          .returning();
        createdItems += inserted.length;
        await ensureLinks(tx, g, item, product.id, product.displayName);
      }
    });
  }
  return { createdProducts, createdItems };
}
