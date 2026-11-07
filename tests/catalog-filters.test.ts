import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { gearFeedback, products, reviews, shoeSpecs, user, userGear } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { listBrandsForFilter, listCatalog } from "@/lib/catalog";
import { parseCatalogFilters } from "@/lib/validation/catalog-filters";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
const id: Record<string, string> = {};
const slugs = async (sp: Record<string, string>) =>
  (await listCatalog(db, parseCatalogFilters(sp))).map((i) => i.slug).sort();

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  for (const p of await db.select().from(products)) id[p.slug] = p.id;
  await db.insert(shoeSpecs).values([
    { productId: id["hoka-speedgoat-7"], dropMm: 4, weightG: 290, terrains: ["tecnico", "fango"], plate: "nessuna", waterproof: false },
    { productId: id["hoka-tecton-x-4"], dropMm: 5, weightG: 245, terrains: ["sterrato"], plate: "carbonio", waterproof: false },
    { productId: id["scott-kinabalu-trail"], dropMm: 8, weightG: 310, terrains: ["fango"], waterproof: true },
  ]);
});
afterAll(() => close());

describe("parametri URL", () => {
  it("ignora valori non validi", () => {
    expect(parseCatalogFilters({ distanza: "42k", marca: "'; drop", tipo: "scarpe", drop: "" })).toEqual({ tipo: "scarpe" });
  });
});

describe("filtri tecnici", () => {
  it("tipo e marca", async () => {
    expect(await slugs({ tipo: "scarpe" })).toHaveLength(33);
    expect((await slugs({ marca: "norda" })).every((s) => s.startsWith("norda-"))).toBe(true);
    expect(await slugs({ marca: "inesistente" })).toEqual([]);
  });

  it("terreno, drop, peso, piastra, impermeabile", async () => {
    expect(await slugs({ terreno: "fango" })).toEqual(["hoka-speedgoat-7", "scott-kinabalu-trail"]);
    expect(await slugs({ drop: "basso" })).toEqual(["hoka-speedgoat-7"]);
    expect(await slugs({ drop: "medio" })).toEqual(["hoka-tecton-x-4", "scott-kinabalu-trail"]);
    expect(await slugs({ peso: "leggera" })).toEqual(["hoka-tecton-x-4"]);
    expect(await slugs({ piastra: "carbonio" })).toEqual(["hoka-tecton-x-4"]);
    expect(await slugs({ impermeabile: "si" })).toEqual(["scott-kinabalu-trail"]);
  });

  it("si combinano", async () => {
    expect(await slugs({ marca: "hoka", terreno: "fango" })).toEqual(["hoka-speedgoat-7"]);
    expect(await slugs({ marca: "scott", drop: "basso" })).toEqual([]);
  });

  it("le marche del filtro sono quelle con prodotti in catalogo", async () => {
    const brands = await listBrandsForFilter(db);
    expect(brands.find((b) => b.slug === "hoka")?.name).toBe("Hoka");
  });
});

describe("distanza", () => {
  beforeAll(async () => {
    // Redazione: Norda 055 consigliata per 100M.
    await db.update(reviews).set({ distances: ["100M"] }).where(eq(reviews.productId, id["norda-055"]));
    // Community: Speedgoat 7, 3 runner, 2 su 3 indicano 50k. Altra Olympus: 2 runner soli.
    for (const u of ["a", "b", "c"]) await db.insert(user).values({ id: u, name: u, email: `${u}@x.it` });
    const fb = async (u: string, slug: string, distances: ("20k" | "50k" | "100k" | "100M")[]) => {
      const [g] = await db.insert(userGear).values({ userId: u, productId: id[slug], sizeSystem: "US_M", sizeValue: "9" }).returning();
      await db.insert(gearFeedback).values({ gearId: g.id, distances });
    };
    await fb("a", "hoka-speedgoat-7", ["50k"]);
    await fb("b", "hoka-speedgoat-7", ["50k", "100k"]);
    await fb("c", "hoka-speedgoat-7", ["20k"]);
    await fb("a", "altra-olympus-275", ["50k"]);
    await fb("b", "altra-olympus-275", ["50k"]);
  });

  it("consigliata dalla redazione", async () => {
    expect(await slugs({ distanza: "100M" })).toEqual(["norda-055"]);
  });

  it("consigliata dalla community solo sopra soglia e con almeno metà dei feedback", async () => {
    expect(await slugs({ distanza: "50k" })).toEqual(["hoka-speedgoat-7"]); // Olympus: 2 runner
    expect(await slugs({ distanza: "100k" })).toEqual([]); // 1 su 3
  });
});
