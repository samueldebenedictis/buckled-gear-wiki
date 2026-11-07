// Equipaggiamento e feedback di un utente. Ogni funzione riceve userId e filtra per
// proprietario: nessuno, redazione compresa, legge o modifica pezzi altrui.
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { brands, gearFeedback, models, products, userGear } from "@/db/schema";
import type { FeedbackInput, GearInput } from "./validation/gear";

export class GearError extends Error {}

export async function listGear(db: Db, userId: string) {
  return db
    .select({
      gear: userGear,
      product: {
        id: products.id,
        name: products.displayName,
        slug: products.slug,
        imagePath: products.imagePath,
        brand: brands.name,
      },
      hasFeedback: gearFeedback.gearId,
    })
    .from(userGear)
    .innerJoin(products, eq(products.id, userGear.productId))
    .innerJoin(models, eq(models.id, products.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(gearFeedback, eq(gearFeedback.gearId, userGear.id))
    .where(eq(userGear.userId, userId))
    .orderBy(asc(userGear.status), desc(userGear.createdAt));
}

export async function getGear(db: Db, userId: string, gearId: string) {
  const [row] = await db
    .select({
      gear: userGear,
      product: { id: products.id, name: products.displayName, slug: products.slug },
      feedback: gearFeedback,
    })
    .from(userGear)
    .innerJoin(products, eq(products.id, userGear.productId))
    .leftJoin(gearFeedback, eq(gearFeedback.gearId, userGear.id))
    .where(and(eq(userGear.id, gearId), eq(userGear.userId, userId)));
  return row ?? null;
}

/** Prodotti selezionabili nell'equipaggiamento: scarpe pubblicate del catalogo (per ora l'equipaggiamento è solo per le scarpe). */
export async function listSelectableProducts(db: Db) {
  return db
    .select({ id: products.id, name: products.displayName, brand: brands.name })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .where(and(eq(products.status, "pubblicato"), eq(models.category, "scarpe")))
    .orderBy(asc(brands.name), asc(products.displayName));
}

/** Tutti i prodotti pubblicati, per le proposte di correzione e l'unione delle proposte. */
export async function listAllProducts(db: Db) {
  return db
    .select({ id: products.id, name: products.displayName, brand: brands.name })
    .from(products)
    .innerJoin(models, eq(products.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .where(eq(products.status, "pubblicato"))
    .orderBy(asc(brands.name), asc(products.displayName));
}

async function assertSelectable(db: Db, productId: string) {
  const [p] = await db
    .select({ status: products.status, category: models.category })
    .from(products)
    .innerJoin(models, eq(models.id, products.modelId))
    .where(eq(products.id, productId));
  if (!p || p.status !== "pubblicato" || p.category !== "scarpe") throw new GearError("Scarpa non disponibile nel catalogo.");
}

export async function addGear(db: Db, userId: string, input: GearInput) {
  await assertSelectable(db, input.productId);
  const [g] = await db.insert(userGear).values({ ...input, userId }).returning({ id: userGear.id });
  return g.id;
}

export async function updateGear(db: Db, userId: string, gearId: string, input: GearInput) {
  const [current] = await db
    .select({ productId: userGear.productId })
    .from(userGear)
    .where(and(eq(userGear.id, gearId), eq(userGear.userId, userId)));
  if (!current) throw new GearError("Pezzo non trovato.");
  // Si può tenere un prodotto tornato in bozza, ma non sceglierne uno nuovo in bozza.
  if (current.productId !== input.productId) await assertSelectable(db, input.productId);
  await db
    .update(userGear)
    .set(input)
    .where(and(eq(userGear.id, gearId), eq(userGear.userId, userId)));
}

export async function deleteGear(db: Db, userId: string, gearId: string) {
  await db.delete(userGear).where(and(eq(userGear.id, gearId), eq(userGear.userId, userId)));
}

export async function saveFeedback(db: Db, userId: string, gearId: string, input: FeedbackInput) {
  const [own] = await db
    .select({ id: userGear.id })
    .from(userGear)
    .where(and(eq(userGear.id, gearId), eq(userGear.userId, userId)));
  if (!own) throw new GearError("Pezzo non trovato.");
  await db
    .insert(gearFeedback)
    .values({ gearId, ...input })
    .onConflictDoUpdate({ target: gearFeedback.gearId, set: input });
}
