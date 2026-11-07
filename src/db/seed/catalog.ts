import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { brands, models, productAliases, products, reviewMedia, reviews } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { soleSurvivors, type SeedShoe } from "./sole-survivors";

export function displayNameOf(s: SeedShoe) {
  return s.displayName ?? [s.brand, s.model, s.version].filter(Boolean).join(" ");
}

/** Inserisce il catalogo iniziale. Idempotente: si può rilanciare senza duplicati. */
export async function seedCatalog(db: Db, shoes: SeedShoe[] = soleSurvivors) {
  let created = 0;
  for (const s of shoes) {
    await db.transaction(async (tx) => {
      const brandSlug = slugify(s.brand);
      await tx.insert(brands).values({ name: s.brand, slug: brandSlug }).onConflictDoNothing();
      const [brand] = await tx.select().from(brands).where(eq(brands.slug, brandSlug));

      const modelSlug = slugify(s.model);
      await tx
        .insert(models)
        .values({ brandId: brand.id, category: "scarpe", name: s.model, slug: modelSlug })
        .onConflictDoNothing();
      const [model] = await tx
        .select()
        .from(models)
        .where(and(eq(models.brandId, brand.id), eq(models.slug, modelSlug)));

      const displayName = displayNameOf(s);
      const [product] = await tx
        .insert(products)
        .values({ modelId: model.id, version: s.version ?? "", displayName, slug: slugify(displayName), status: "pubblicato" })
        .onConflictDoNothing()
        .returning();
      if (!product) return; // già presente

      created++;
      if (s.aliases?.length) {
        await tx
          .insert(productAliases)
          .values(s.aliases.map((alias) => ({ productId: product.id, alias })))
          .onConflictDoNothing();
      }

      const [review] = await tx
        .insert(reviews)
        .values({
          productId: product.id,
          title: `Sole Survivors: ${displayName}`,
          status: "pubblicata",
          publishedAt: new Date(),
        })
        .returning();
      await tx.insert(reviewMedia).values({ reviewId: review.id, kind: "youtube", url: s.video });
    });
  }
  return { created, total: shoes.length };
}
