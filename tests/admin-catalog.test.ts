import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { brands, models, products, user, userGear } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import * as catalog from "@/lib/admin-catalog";
import { listCatalog } from "@/lib/catalog";
import { createProductSchema, specsSchema } from "@/lib/validation/catalog";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
});
afterAll(() => close());

const create = (input: Record<string, unknown>) =>
  catalog.createProduct(db, createProductSchema.parse(input));

describe("validazione", () => {
  it("campi vuoti del form diventano null", () => {
    const s = specsSchema.parse({ dropMm: "", weightG: "", plate: "", waterproof: "", terrains: [] });
    expect(s).toMatchObject({ dropMm: null, weightG: null, plate: null, waterproof: null });
  });

  it("converte numeri e booleani", () => {
    const s = specsSchema.parse({ dropMm: "4", weightG: "290", weightRefSize: "US 9", waterproof: "false" });
    expect(s).toMatchObject({ dropMm: 4, weightG: 290, waterproof: false, terrains: [] });
  });

  it("rifiuta valori fuori range", () => {
    expect(specsSchema.safeParse({ dropMm: "25" }).success).toBe(false);
    expect(specsSchema.safeParse({ dropMm: "4.5" }).success).toBe(false);
  });
});

describe("creazione", () => {
  it("riusa brand e modello esistenti senza distinguere maiuscole", async () => {
    const id = await create({ brand: "HOKA", model: "speedgoat", version: "8", releaseYear: "2027" });
    const [p] = await db.select().from(products).where(eq(products.id, id));
    expect(p.displayName).toBe("Hoka Speedgoat 8");
    expect(p.slug).toBe("hoka-speedgoat-8");
    const [sg7] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-7"));
    expect(p.modelId).toBe(sg7.modelId);
    expect(await db.select().from(brands).where(eq(brands.slug, "hoka"))).toHaveLength(1);
  });

  it("crea brand e modello nuovi", async () => {
    const id = await create({ brand: "Inov8", model: "Trailfly", version: "" });
    const [p] = await db.select().from(products).where(eq(products.id, id));
    expect(p.displayName).toBe("Inov8 Trailfly");
    const [m] = await db.select().from(models).where(eq(models.id, p.modelId));
    expect(m.category).toBe("scarpe");
  });

  it("usa il nome mostrato se indicato", async () => {
    const id = await create({ brand: "Nike", model: "Zegama", version: "2", displayName: "Nike Zegama Trail 2" });
    const [p] = await db.select().from(products).where(eq(products.id, id));
    expect(p.slug).toBe("nike-zegama-trail-2");
  });

  it("rifiuta duplicati di modello+versione", async () => {
    await expect(create({ brand: "hoka", model: "SPEEDGOAT", version: "7" })).rejects.toThrow(
      /Esiste già: Hoka Speedgoat 7/,
    );
  });

  it("i nuovi prodotti nascono in bozza: fuori dal catalogo pubblico finché non si pubblicano", async () => {
    const [p] = await db.select().from(products).where(eq(products.displayName, "Inov8 Trailfly"));
    expect(p.status).toBe("bozza");
    expect((await listCatalog(db)).some((i) => i.id === p.id)).toBe(false);
    await catalog.setStatus(db, p.id, "pubblicato");
    expect((await listCatalog(db)).some((i) => i.id === p.id)).toBe(true);
  });
});

describe("modifica", () => {
  let id: string;
  beforeAll(async () => {
    [{ id }] = await db.select({ id: products.id }).from(products).where(eq(products.slug, "hoka-speedgoat-7"));
  });

  it("salva e aggiorna le specifiche", async () => {
    await catalog.saveSpecs(db, id, specsSchema.parse({ dropMm: "4", terrains: ["tecnico"] }));
    await catalog.saveSpecs(db, id, specsSchema.parse({ dropMm: "5", lugMm: "5" }));
    const p = await catalog.getProductAdmin(db, id);
    expect(p?.specs).toMatchObject({ dropMm: 5, lugMm: 5, terrains: [] });
  });

  it("non cambia lo slug quando cambia il nome", async () => {
    await catalog.updateProduct(db, id, { displayName: "Hoka Speedgoat 7 (2026)", version: "7", releaseYear: 2026, priceEur: 159.9 });
    const p = await catalog.getProductAdmin(db, id);
    expect(p?.product.slug).toBe("hoka-speedgoat-7");
    expect(p?.product.releaseYear).toBe(2026);
  });

  it("rifiuta una versione già usata dallo stesso modello", async () => {
    await expect(
      catalog.updateProduct(db, id, { displayName: "x", version: "6", releaseYear: null, priceEur: null }),
    ).rejects.toThrow(catalog.CatalogError);
  });

  it("alias: aggiunge, rifiuta duplicati e rimuove", async () => {
    await catalog.addAlias(db, id, "goat7");
    await expect(catalog.addAlias(db, id, "SG6")).rejects.toThrow(/Hoka Speedgoat 6/);
    await catalog.removeAlias(db, id, "goat7");
    expect((await catalog.getProductAdmin(db, id))?.aliases).not.toContain("goat7");
  });

  it("rimesso in bozza sparisce dal catalogo pubblico", async () => {
    await catalog.setStatus(db, id, "bozza");
    expect((await listCatalog(db)).some((i) => i.id === id)).toBe(false);
    await catalog.setStatus(db, id, "pubblicato");
    expect((await listCatalog(db)).some((i) => i.id === id)).toBe(true);
  });
});

describe("eliminazione", () => {
  it("elimina un prodotto mai usato, con brand e modello rimasti vuoti", async () => {
    const id = await create({ brand: "Prova Sola", model: "Errore", version: "" });
    await catalog.deleteProduct(db, id);
    expect(await catalog.getProductAdmin(db, id)).toBeNull();
    expect((await catalog.listBrandsAndModels(db)).brands).not.toContain("Prova Sola");
  });

  it("non elimina un prodotto con recensioni", async () => {
    const [p] = await db.select().from(products).where(eq(products.slug, "norda-055"));
    await expect(catalog.deleteProduct(db, p.id)).rejects.toThrow(/recensioni/);
  });

  it("non elimina un prodotto negli equipaggiamenti", async () => {
    const id = await create({ brand: "Prova", model: "In uso", version: "" });
    await db.insert(user).values({ id: "u1", name: "U", email: "u@b.it" });
    await db.insert(userGear).values({ userId: "u1", productId: id, sizeSystem: "US_M", sizeValue: "9" });
    await expect(catalog.deleteProduct(db, id)).rejects.toThrow(/equipaggiamento/);
    expect((await catalog.getProductAdmin(db, id))?.gearCount).toBe(1);
  });
});

describe("elenco della redazione", () => {
  it("cerca anche tra le bozze e filtra per categoria e stato", async () => {
    const [sg6] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-6"));
    await catalog.setStatus(db, sg6.id, "bozza");
    const names = async (f: Parameters<typeof catalog.listProductsAdmin>[1]) =>
      (await catalog.listProductsAdmin(db, f)).map((p) => p.name);

    expect(await names({ q: "speedgoat" })).toEqual(expect.arrayContaining(["Hoka Speedgoat 6"]));
    expect((await names({ q: "sg7" }))[0]).toMatch(/Speedgoat 7/);
    expect(await names({ stato: "bozze" })).toContain("Hoka Speedgoat 6");
    expect(await names({ stato: "pubblicati" })).not.toContain("Hoka Speedgoat 6");
    const all = await catalog.listProductsAdmin(db);
    const incomplete = await catalog.listProductsAdmin(db, { stato: "incompleti" });
    expect(incomplete.every(catalog.isIncomplete)).toBe(true);
    expect(catalog.countByStato(all)).toMatchObject({ tutti: all.length, incompleti: incomplete.length });
    expect(await names({ tipo: "zaini" })).toEqual([]);
    expect(await names({ q: "qqqzzz" })).toEqual([]);
    await catalog.setStatus(db, sg6.id, "pubblicato");
  });

  it("cambia stato a più prodotti insieme", async () => {
    const rows = (await catalog.listProductsAdmin(db)).slice(0, 2);
    await catalog.setStatusMany(db, rows.map((r) => r.id), "bozza");
    expect((await catalog.listProductsAdmin(db, { stato: "bozze" })).map((r) => r.id)).toEqual(expect.arrayContaining(rows.map((r) => r.id)));
    await catalog.setStatusMany(db, rows.map((r) => r.id), "pubblicato");
  });
});
