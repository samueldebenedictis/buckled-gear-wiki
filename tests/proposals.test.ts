import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { productAliases, products, proposals, shoeSpecs, user } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import * as catalog from "@/lib/admin-catalog";
import * as prop from "@/lib/proposals";
import { searchProducts } from "@/lib/search";
import { diffChanges } from "@/lib/correction";
import { listCatalog } from "@/lib/catalog";
import { createProductSchema, specsSchema } from "@/lib/validation/catalog";
import { newProductPayloadSchema } from "@/lib/validation/proposal";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  await db.insert(user).values([
    { id: "u", name: "Ute", email: "u@x.it" },
    { id: "r", name: "Red", email: "r@x.it", role: "redattore" },
  ]);
});
afterAll(() => close());

const newPayload = (over: Record<string, unknown> = {}) =>
  newProductPayloadSchema.parse({ brand: "Hoka", model: "Speedgoat", version: "8", ...over });

describe("proposte", () => {
  it("resta proposta finché non è accettata, poi diventa bozza con le specifiche", async () => {
    const before = (await db.select().from(products)).length;
    const id = await prop.proposeNewProduct(db, "u", {
      ...newPayload({ model: "speed goat", priceEur: "169,90" }),
      specs: specsSchema.parse({ dropMm: "5", weightG: "290", terrains: ["tecnico"] }),
    });
    expect((await db.select().from(products)).length).toBe(before); // nessun prodotto creato
    expect((await prop.listQueue(db)).map((q) => q.proposal.id)).toContain(id);

    const productId = await prop.approveNewProduct(
      db, id,
      createProductSchema.parse({ brand: "Hoka", model: "Speedgoat", version: "8", priceEur: "169,90" }),
    );
    const [p] = await db.select().from(products).where(eq(products.id, productId));
    expect(p).toMatchObject({ displayName: "Hoka Speedgoat 8", status: "bozza", priceEur: 169.9 });
    const [s] = await db.select().from(shoeSpecs).where(eq(shoeSpecs.productId, productId));
    expect(s).toMatchObject({ dropMm: 5, weightG: 290, terrains: ["tecnico"] });
    expect((await listCatalog(db)).some((i) => i.id === productId)).toBe(false); // bozza: non pubblica

    // Decisa = eliminata: non resta nello storico.
    expect(await prop.listOwnProposals(db, "u")).toEqual([]);
    await expect(prop.rejectProposal(db, id)).rejects.toThrow(prop.ProposalError);
  });

  it("accettare un duplicato fallisce con un suggerimento", async () => {
    const id = await prop.proposeNewProduct(db, "u", newPayload({ version: "7" }));
    await expect(
      prop.approveNewProduct(db, id, createProductSchema.parse({ brand: "Hoka", model: "Speedgoat", version: "7" })),
    ).rejects.toThrow(/unirla/);
  });

  it("unione: il nome proposto diventa alias e la ricerca lo trova", async () => {
    const id = await prop.proposeNewProduct(db, "u", newPayload({ brand: "hoka", model: "Speed Goat", version: "VII" }));
    const [sg7] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-7"));
    await prop.mergeProposal(db, id, sg7.id);
    const aliases = await db.select().from(productAliases).where(eq(productAliases.productId, sg7.id));
    expect(aliases.map((a) => a.alias)).toContain("hoka Speed Goat VII");
    expect(await db.select().from(proposals).where(eq(proposals.id, id))).toEqual([]);
  });

  it("correzione con nota: rifiutata o segnata come applicata, poi eliminata", async () => {
    const [n] = await db.select().from(products).where(eq(products.slug, "norda-055"));
    const c1 = await prop.proposeCorrection(db, "u", n.id, { note: "Il drop è 5 mm" });
    const c2 = await prop.proposeCorrection(db, "u", n.id, { note: "Peso sbagliato" });
    await prop.markCorrectionApplied(db, c1);
    await prop.rejectProposal(db, c2);
    const left = (await prop.listOwnProposals(db, "u")).map((x) => x.proposal.id);
    expect(left).not.toContain(c1);
    expect(left).not.toContain(c2);
    expect(await prop.listQueue(db)).toHaveLength(1); // resta il duplicato non accettato
  });

  it("correzione vuota: rifiutata subito", async () => {
    const [n] = await db.select().from(products).where(eq(products.slug, "norda-055"));
    await expect(prop.proposeCorrection(db, "u", n.id, { note: null, changes: {} })).rejects.toThrow(/nessun campo/);
  });

  it("correzione strutturata: solo i campi cambiati, applicati con un clic", async () => {
    const [n] = await db.select().from(products).where(eq(products.slug, "norda-055"));
    const current = (await prop.currentValues(db, n.id))!;
    const proposedSpecs = specsSchema.parse({
      ...Object.fromEntries(Object.entries(current.specs ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])),
      terrains: (current.specs?.terrains as string[] | undefined) ?? [],
      dropMm: "4",
      fitNote: "Mezza taglia in più",
    });
    const changes = diffChanges("scarpe", current, {
      product: { ...current.product, priceEur: 240 },
      specs: proposedSpecs,
    });
    expect(changes).toEqual({ product: { priceEur: 240 }, specs: { dropMm: 4, fitNote: "Mezza taglia in più" } });

    const id = await prop.proposeCorrection(db, "u", n.id, { note: null, changes });
    await prop.applyCorrection(db, id);
    const after = (await prop.currentValues(db, n.id))!;
    expect(after.product.priceEur).toBe(240);
    expect(after.specs).toMatchObject({ dropMm: 4, fitNote: "Mezza taglia in più" });
    expect(await db.select().from(proposals).where(eq(proposals.id, id))).toEqual([]);
  });

  it("eliminare un prodotto elimina le correzioni aperte", async () => {
    const id = await catalog.createProduct(db, createProductSchema.parse({ brand: "Prova", model: "Da togliere" }), { status: "pubblicato" });
    const c = await prop.proposeCorrection(db, "u", id, { note: "Non esiste" });
    await catalog.deleteProduct(db, id);
    expect(await db.select().from(proposals).where(eq(proposals.id, c))).toEqual([]);
  });
});

describe("ricerca", () => {
  it.each(["sg7", "speedgoat VII", "hoka speedgoat 7", "speedgoat 7"])("%s → Hoka Speedgoat 7", async (q) => {
    const [first] = await searchProducts(db, q);
    expect(first?.name).toBe("Hoka Speedgoat 7");
  });

  it("trova per parola parziale e ignora query troppo corte", async () => {
    expect((await searchProducts(db, "prodigio")).map((r) => r.name)).toEqual(
      expect.arrayContaining(["La Sportiva Prodigio", "La Sportiva Prodigio Max", "La Sportiva Prodigio Pro"]),
    );
    expect(await searchProducts(db, "a")).toEqual([]);
    expect(await searchProducts(db, "qqq%_")).toEqual([]);
  });
});

describe("rinomina", () => {
  it("brand: aggiorna i nomi generati, non gli slug", async () => {
    const [n] = await db.select().from(products).where(eq(products.slug, "norda-055"));
    const p = (await catalog.getProductAdmin(db, n.id))!;
    await catalog.renameBrand(db, p.brandId, "Norda Run");
    const after = (await catalog.getProductAdmin(db, n.id))!;
    expect(after.product.displayName).toBe("Norda Run 055");
    expect(after.product.slug).toBe("norda-055");
    await expect(catalog.renameBrand(db, p.brandId, "HOKA")).rejects.toThrow(catalog.CatalogError);
  });

  it("modello: lascia stare i nomi personalizzati", async () => {
    const [d] = await db.select().from(products).where(eq(products.slug, "dynafit-ultra-100-v3"));
    await catalog.renameModel(db, d.modelId, "Ultra 100 Pro");
    const [after] = await db.select().from(products).where(eq(products.id, d.id));
    expect(after.displayName).toBe("Dynafit Ultra 100 V3");
  });
});
