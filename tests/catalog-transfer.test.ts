import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { productAliases, products, shoeSpecs } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { seedGuidesData } from "@/db/seed/guides";
import { exportCatalog, importCatalog, isKeepableImage, type CatalogExport } from "@/lib/catalog-transfer";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  // Anche i prodotti delle guide (eyewear, zaini…): il file esportato deve sempre reimportarsi.
  await seedGuidesData(db);
});
afterAll(() => close());

const productBySlug = async (slug: string) => (await db.select().from(products).where(eq(products.slug, slug)))[0];
const clone = (x: CatalogExport) => JSON.parse(JSON.stringify(x)) as CatalogExport;

describe("esportazione e importazione del catalogo", () => {
  let data: CatalogExport;
  beforeAll(async () => {
    data = await exportCatalog(db);
  });

  it("esporta tutti i prodotti con categoria, specifiche e foto", async () => {
    expect(data.format).toBe("buckled-gear-catalogo");
    expect(data.products.length).toBe((await db.select().from(products)).length);
    const sg7 = data.products.find((p) => p.slug === "hoka-speedgoat-7")!;
    expect(sg7).toMatchObject({ category: "scarpe", brand: "Hoka" });
  });

  it("reimportare lo stesso file aggiorna tutto e non crea niente", async () => {
    const r = await importCatalog(db, clone(data), { dryRun: false });
    expect(r.errors).toEqual([]);
    expect(r.created).toEqual([]);
    expect(r.updated.length).toBe(data.products.length);
  });

  it("l'anteprima non salva", async () => {
    const d = clone(data);
    d.products[0].priceEur = 999;
    const before = await productBySlug(d.products[0].slug);
    const r = await importCatalog(db, d, { dryRun: true });
    expect(r.updated).toContain(d.products[0].slug);
    expect((await productBySlug(d.products[0].slug)).priceEur).toBe(before.priceEur);
  });

  it("aggiunge un prodotto nuovo con specifiche e alias", async () => {
    const d = clone(data);
    d.products = [
      {
        ...d.products.find((p) => p.slug === "hoka-speedgoat-7")!,
        slug: "hoka-speedgoat-8",
        version: "8",
        displayName: "Hoka Speedgoat 8",
        status: "bozza",
        aliases: ["sg8"],
        specs: { dropMm: 4, waterproof: false, terrains: ["sterrato"] },
        image: null,
      },
    ];
    const r = await importCatalog(db, d, { dryRun: false });
    expect(r.errors).toEqual([]);
    expect(r.created).toEqual(["hoka-speedgoat-8"]);
    const p = await productBySlug("hoka-speedgoat-8");
    expect(p).toMatchObject({ status: "bozza", version: "8" });
    const [s] = await db.select().from(shoeSpecs).where(eq(shoeSpecs.productId, p.id));
    expect(s).toMatchObject({ dropMm: 4, waterproof: false, terrains: ["sterrato"] });
    const aliases = await db.select().from(productAliases).where(eq(productAliases.productId, p.id));
    expect(aliases.map((a) => a.alias)).toEqual(["sg8"]);
  });

  it("con un errore non salva niente e dice quale prodotto", async () => {
    const d = clone(data);
    const ok = d.products[0];
    ok.priceEur = 123;
    d.products = [
      ok,
      { ...d.products.find((p) => p.slug === "hoka-speedgoat-7")!, slug: "nuovo-doppione", aliases: ["sg8"], image: null },
    ];
    const r = await importCatalog(db, d, { dryRun: false });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].slug).toBe("nuovo-doppione");
    expect((await productBySlug(ok.slug)).priceEur).not.toBe(123);
    expect(await productBySlug("nuovo-doppione")).toBeUndefined();
  });

  it("rifiuta file non validi", async () => {
    expect((await importCatalog(db, { format: "altro" }, { dryRun: true })).errors[0].slug).toBe("file");
    const d = clone(data);
    d.products = [d.products[0], d.products[0]];
    expect((await importCatalog(db, d, { dryRun: true })).errors[0].message).toMatch(/ripetuti/);
  });

  it("tiene come riferimento solo foto del repo o di Vercel Blob", () => {
    expect(isKeepableImage("/products/hoka.png")).toBe(true);
    expect(isKeepableImage("https://abc.public.blob.vercel-storage.com/products/x.png")).toBe(true);
    expect(isKeepableImage("https://evil.example.com/x.png")).toBe(false);
    expect(isKeepableImage("/products/../.env")).toBe(false);
  });
});
