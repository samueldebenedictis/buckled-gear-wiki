import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { gearFeedback, products, user, userGear } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { PRIVACY_K } from "@/lib/config";
import {
  productStats,
  rankings,
  sizeRouting,
  sizeRoutingReferences,
  sizeRoutingRefSizes,
} from "@/lib/stats";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
const id: Record<string, string> = {};

async function own(
  userId: string,
  slug: string,
  size: string,
  fb: Partial<typeof gearFeedback.$inferInsert> = {},
  extra: Partial<typeof userGear.$inferInsert> = {},
) {
  const [g] = await db
    .insert(userGear)
    .values({ userId, productId: id[slug], sizeSystem: "US_M", sizeValue: size, ...extra })
    .returning();
  if (Object.keys(fb).length) await db.insert(gearFeedback).values({ gearId: g.id, ...fb });
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  for (const slug of ["hoka-speedgoat-7", "hoka-speedgoat-6", "norda-001a", "hoka-speedgoat-8-x"]) {
    const [p] = await db.select().from(products).where(eq(products.slug, slug));
    if (p) id[slug] = p.id;
  }
  for (const u of ["a", "b", "c", "d"]) {
    await db.insert(user).values({ id: u, name: u, email: `${u}@x.it` });
  }
  // SG6 in US 9 per tutti; SG7: a, b in 9.5; c, d in 9.
  for (const u of ["a", "b", "c", "d"]) await own(u, "hoka-speedgoat-6", "9");
  await own("a", "hoka-speedgoat-7", "9.5", { comfort: 5, fitLength: -1, distances: ["50k", "100k"], terrains: ["fango", "tecnico"] }, { status: "dismessa", retiredOn: "2026-06-01", km: 800 });
  await own("b", "hoka-speedgoat-7", "9.5", { comfort: 4, fitLength: -1, distances: ["50k"], terrains: ["fango"] }, { status: "dismessa", retiredOn: "2026-06-01", km: 600 });
  await own("c", "hoka-speedgoat-7", "9", { comfort: 3, fitLength: 0, distances: ["100k"] });
  await own("d", "hoka-speedgoat-7", "9", { comfort: 2 });
  // Norda: solo 2 utenti, sotto soglia.
  await own("a", "norda-001a", "9", { comfort: 5 });
  await own("b", "norda-001a", "9", { comfort: 5 });
});
afterAll(() => close());

it("K è 3", () => expect(PRIVACY_K).toBe(3));

describe("pagina scarpa", () => {
  it("sotto soglia non mostra nulla", async () => {
    expect(await productStats(db, id["norda-001a"])).toBeNull();
  });

  it("aggrega voti, distribuzione e distanze", async () => {
    const s = (await productStats(db, id["hoka-speedgoat-7"]))!;
    expect(s.users).toBe(4);
    expect(s.scores.comfort?.avg).toBe(3.5);
    expect(s.scores.comfort?.distribution.find((d) => d.value === 5)?.share).toBe(0.25);
    // fitLength: 3 utenti → sopra soglia; heelHold: nessuno → null.
    expect(s.fit.fitLength?.avg).toBeCloseTo(-2 / 3);
    expect(s.scores.heelHold).toBeNull();
    expect(s.distances?.find((d) => d.band === "50k")?.share).toBe(0.5);
    expect(s.terrains?.find((t) => t.terrain === "fango")?.share).toBe(0.5);
    expect(s.terrains?.some((t) => t.terrain === "strada")).toBe(false);
  });

  it("km alla dismissione solo con almeno K utenti", async () => {
    const s = (await productStats(db, id["hoka-speedgoat-7"]))!;
    expect(s.retiredKm).toBeNull(); // solo a e b hanno dismesso
  });

});

describe("routing taglia", () => {
  it("propone solo riferimenti con una taglia sopra soglia", async () => {
    const refs = await sizeRoutingReferences(db, id["hoka-speedgoat-7"]);
    expect(refs.map((r) => r.id)).toEqual([id["hoka-speedgoat-6"]]);
    const sizes = await sizeRoutingRefSizes(db, id["hoka-speedgoat-7"], id["hoka-speedgoat-6"]);
    expect(sizes).toEqual([{ size_system: "US_M", size_value: "9" }]);
  });

  it("chi usa SG6 in US 9 usa SG7 in 9.5 (50%) e 9 (50%)", async () => {
    const r = (await sizeRouting(db, {
      targetId: id["hoka-speedgoat-7"],
      refId: id["hoka-speedgoat-6"],
      refSystem: "US_M",
      refSize: "9",
    }))!;
    expect(r.users).toBe(4);
    expect(r.sizes).toEqual([
      { system: "US_M", value: "9", share: 0.5 },
      { system: "US_M", value: "9.5", share: 0.5 },
    ]);
    expect(r.fitLength).toBeCloseTo(-2 / 3);
    expect(r.fitWidth).toBeNull();
  });

  it("non propone riferimenti con co-possessori sparsi su più taglie", async () => {
    // Norda: 2 co-possessori di SG7 → nessuna taglia sopra soglia.
    const refs = await sizeRoutingReferences(db, id["hoka-speedgoat-7"]);
    expect(refs.some((r) => r.id === id["norda-001a"])).toBe(false);
  });

  it("niente risultato per una taglia sotto soglia", async () => {
    const args = { targetId: id["hoka-speedgoat-7"], refId: id["hoka-speedgoat-6"], refSystem: "US_M", refSize: "9" };
    expect(await sizeRouting(db, { ...args, refSize: "10" })).toBeNull();
  });
});

describe("classifiche", () => {
  it("includono solo prodotti sopra soglia", async () => {
    const r = await rankings(db);
    expect(r.mostUsed.map((p) => p.slug)).toEqual(["hoka-speedgoat-6", "hoka-speedgoat-7"]);
    expect(r.favorites.map((p) => p.slug)).toEqual(["hoka-speedgoat-7"]); // Norda: 2 utenti
    expect(r.favorites[0].score).toBe(3.5);
    expect(r.durable).toHaveLength(0);
  });
});
