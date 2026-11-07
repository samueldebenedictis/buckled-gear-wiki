import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { guideItems, guides, products, reviewMedia, reviews, shoeSpecs } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { seedGuidesData } from "@/db/seed/guides";
import { seedGuides } from "@/db/seed/guides-data";
import * as catalog from "@/lib/admin-catalog";
import { listCatalog } from "@/lib/catalog";
import { attributesSchema, filterableAttributes, formatAttribute, CATEGORY_ATTRIBUTES } from "@/lib/categories";
import * as g from "@/lib/guides";
import { searchProducts } from "@/lib/search";
import { slugify } from "@/lib/slug";
import { createProductSchema } from "@/lib/validation/catalog";
import { parseCatalogFilters } from "@/lib/validation/catalog-filters";
import { guideItemSchema, guideSchema } from "@/lib/validation/guide";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
const bySlug = async (slug: string) => (await db.select().from(products).where(eq(products.slug, slug)))[0];

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
});
afterAll(() => close());

describe("attributi di categoria", () => {
  it("validano, convertono e scartano i campi vuoti", () => {
    const a = attributesSchema("zaini").parse({ weightG: "293", liters: "12,5", poleHolder: "faretra", adjustable: "true", sizes: "", bladderCompatible: "" });
    expect(a).toEqual({ weightG: 293, liters: 12.5, poleHolder: "faretra", adjustable: true });
    expect(attributesSchema("zaini").safeParse({ poleHolder: "razzo" }).success).toBe(false);
    expect(attributesSchema("eyewear").safeParse({ base: "4.5" }).success).toBe(false);
  });

  it("formattano i valori", () => {
    const [weight] = CATEGORY_ATTRIBUTES.zaini;
    expect(formatAttribute(weight, 293)).toBe("293 g");
    expect(filterableAttributes("eyewear").map((f) => f.def.key)).toEqual(["lensType", "prescription"]);
  });

  it("slug con lettere speciali", () => {
    expect(slugify("Oakley Sphæra")).toBe("oakley-sphaera");
    expect(slugify("Nnormal Cadì")).toBe("nnormal-cadi");
  });
});

describe("seed delle guide", () => {
  let first: Awaited<ReturnType<typeof seedGuidesData>>;
  beforeAll(async () => {
    first = await seedGuidesData(db);
  });

  it("crea guide pubblicate con tutte le voci", async () => {
    const all = await db.select().from(guides);
    expect(all.map((x) => x.slug).sort()).toEqual(["guida-attrezzatura", "guida-door-to-trail", "guida-eyewear"]);
    for (const sg of seedGuides) {
      const guide = (await g.getPublishedGuide(db, sg.slug))!;
      expect(guide.items).toHaveLength(sg.items.length);
    }
    expect(first.createdItems).toBe(43 + 14 + 9);
  });

  it("riusa i prodotti esistenti: H1 e Kipsummit Max, Julbo Intensity Reactiv in due guide", async () => {
    // 66 voci - 2 scarpe già in catalogo - 1 occhiale condiviso
    expect(first.createdProducts).toBe(66 - 2 - 1);
    const h1 = await bySlug("mount-to-coast-h1");
    const [specs] = await db.select().from(shoeSpecs).where(eq(shoeSpecs.productId, h1.id));
    expect(specs).toMatchObject({ dropMm: 6, stackHeelMm: 35, midsole: "CircleCELL", fitNote: "True to size" });
    expect(h1.priceEur).toBe(170);
    const julbo = await bySlug("julbo-intensity-reactiv");
    expect((await g.guidesForProduct(db, julbo.id)).map((m) => m.slug).sort()).toEqual(["guida-attrezzatura", "guida-eyewear"]);
  });

  it("Raide LF 2L è tra le fasce, come sulla pagina originale", async () => {
    const fasce = await listCatalog(db, { tipo: "fasce" });
    expect(fasce.map((p) => p.slug)).toContain("raide-lf-2l");
    expect((await listCatalog(db, { tipo: "zaini" })).map((p) => p.slug)).not.toContain("raide-lf-2l");
  });

  it("premi, badge, note e link con timestamp", async () => {
    const dt = (await g.getPublishedGuide(db, "guida-door-to-trail"))!;
    const altra = dt.items.find((i) => i.name === "Altra Wild Experience 3+")!;
    expect(altra.award).toBe("Jack of all trades");
    expect(altra.badges).toEqual(["overqualified", "heavyweight"]);
    const adv = await bySlug("salomon-adv-skin-12");
    expect(adv.attributes).toMatchObject({ liters: 12, poleHolder: "faretra" });
    const [r] = await db.select().from(reviews).where(eq(reviews.productId, adv.id));
    const [m] = await db.select().from(reviewMedia).where(eq(reviewMedia.reviewId, r.id));
    expect(m).toMatchObject({ kind: "youtube", url: "https://youtu.be/WRqP0AM6M2Q", startS: 938 });
  });

  it("è idempotente e non sovrascrive le modifiche della redazione", async () => {
    const adv = await bySlug("salomon-adv-skin-12");
    await db.update(products).set({ attributes: { weightG: 300 } }).where(eq(products.id, adv.id));
    const again = await seedGuidesData(db);
    expect(again).toEqual({ createdProducts: 0, createdItems: 0 });
    expect((await bySlug("salomon-adv-skin-12")).attributes).toEqual({ weightG: 300 });
    expect(await db.select().from(reviews).where(eq(reviews.productId, adv.id))).toHaveLength(1);
  });
});

describe("catalogo multi-categoria", () => {
  it("filtra per tipo e per attributo", async () => {
    const cat = async (sp: Record<string, string>) => (await listCatalog(db, parseCatalogFilters(sp))).map((i) => i.slug);
    expect((await cat({ tipo: "eyewear" })).length).toBe(14 + 3); // 14 eyewear + 3 solo in attrezzatura
    expect(await cat({ tipo: "zaini", f_poleHolder: "entrambi" })).toEqual(["scott-rc-pro-tr-10"]);
    expect(await cat({ tipo: "idratazione", f_insulated: "true" })).toEqual(
      expect.arrayContaining(["camelbak-quick-grip-chill-insulated", "nathan-speeddraw-plus-insulated"]),
    );
    expect(await cat({ tipo: "zaini", f_liters: "piccolo" })).toEqual(
      expect.arrayContaining(["black-diamond-distance-4", "patagonia-slope-vest-3"]),
    );
    // filtro di un'altra categoria: ignorato
    expect(parseCatalogFilters({ tipo: "zaini", f_lensType: "statica" }).attrs).toBeUndefined();
  });

  it("la ricerca filtra il catalogo, per pertinenza, insieme agli altri filtri", async () => {
    const cat = async (sp: Record<string, string>) => (await listCatalog(db, parseCatalogFilters(sp))).map((i) => i.slug);
    expect((await cat({ q: "speedgoat" })).slice(0, 2).sort()).toEqual(["hoka-speedgoat-6", "hoka-speedgoat-7"]);
    expect((await cat({ q: "sg7" }))[0]).toBe("hoka-speedgoat-7");
    expect(await cat({ q: "salomon", tipo: "zaini" })).toEqual(
      expect.arrayContaining(["salomon-adv-skin-12", "salomon-s-lab-ultra-10"]),
    );
    expect((await cat({ q: "salomon", tipo: "zaini" })).every((s) => !s.includes("glide"))).toBe(true);
    expect(await cat({ q: "qqqzzz" })).toEqual([]);
    expect(parseCatalogFilters({ q: "a" }).q).toBeUndefined(); // troppo corta: ignorata
  });

  it("la ricerca trova anche l'attrezzatura", async () => {
    const [r] = await searchProducts(db, "adv skin");
    expect(r).toMatchObject({ name: "Salomon ADV Skin 12", category: "zaini" });
  });

  it("un modello non cambia categoria", async () => {
    await expect(
      catalog.createProduct(db, createProductSchema.parse({ category: "zaini", brand: "Hoka", model: "Speedgoat", version: "9" })),
    ).rejects.toThrow(/altra categoria/);
  });
});

describe("gestione guide", () => {
  let id: string;
  it("crea, aggiunge, riordina, modifica, toglie", async () => {
    id = await g.createGuide(db, guideSchema.parse({ title: "Guida inverno", introMd: "", whyMd: "", sourceUrl: "", updatedOn: "", published: "" }));
    await expect(g.createGuide(db, guideSchema.parse({ title: "guida  inverno" }))).rejects.toThrow(g.GuideError);
    const a = await bySlug("dynafit-alpine");
    const b = await bySlug("montane-minimus-lite");
    const item = guideItemSchema.parse({ award: "", badges: "Heavyweight, heavyweight, ", noteMd: "" });
    expect(item).toEqual({ award: null, badges: ["heavyweight"], noteMd: "" });
    await g.addGuideItem(db, id, a.id, item);
    await g.addGuideItem(db, id, b.id, item);
    await expect(g.addGuideItem(db, id, a.id, item)).rejects.toThrow(g.GuideError);
    await g.moveGuideItem(db, id, b.id, "up");
    expect((await g.getGuideAdmin(db, id))!.items.map((i) => i.productId)).toEqual([b.id, a.id]);
    await g.updateGuideItem(db, id, a.id, { award: "Calda", badges: [], noteMd: "ok" });
    await g.removeGuideItem(db, id, b.id);
    const [left] = await db.select().from(guideItems).where(and(eq(guideItems.guideId, id)));
    expect(left).toMatchObject({ productId: a.id, award: "Calda" });
  });

  it("le bozze non sono pubbliche", async () => {
    expect(await g.getPublishedGuide(db, "guida-inverno")).toBeNull();
    expect((await g.listPublishedGuides(db)).some((x) => x.slug === "guida-inverno")).toBe(false);
  });

  it("pubblica e spubblica dalla lista", async () => {
    await g.setGuidePublished(db, id, true);
    expect(await g.getPublishedGuide(db, "guida-inverno")).not.toBeNull();
    await g.setGuidePublished(db, id, false);
    expect(await g.getPublishedGuide(db, "guida-inverno")).toBeNull();
  });
});
