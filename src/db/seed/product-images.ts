import { existsSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { products } from "@/db/schema";
import { PRODUCT_IMAGES } from "./images";

/**
 * Collega le foto in public/products ai prodotti che non ne hanno una, solo se il
 * file c'è davvero (la cartella non è nel repo: vedi README). Idempotente.
 */
export async function seedProductImages(db: Db) {
  let linked = 0;
  for (const [slug, { file }] of Object.entries(PRODUCT_IMAGES)) {
    if (!existsSync(path.join(process.cwd(), "public", "products", file))) continue;
    const res = await db
      .update(products)
      .set({ imagePath: `/products/${file}` })
      .where(and(eq(products.slug, slug), isNull(products.imagePath)))
      .returning({ id: products.id });
    linked += res.length;
  }
  return linked;
}
