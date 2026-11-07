import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { products, shoeSpecs } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { soleSurvivors } from "@/db/seed/sole-survivors";
import { listCatalog } from "@/lib/catalog";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
});
afterAll(() => close());

it("una scheda per prodotto, con video e specifiche se presenti", async () => {
  const [sg7] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-7"));
  await db.insert(shoeSpecs).values({ productId: sg7.id, dropMm: 4, weightG: 290, terrains: ["tecnico"] });

  const items = await listCatalog(db);
  expect(items).toHaveLength(soleSurvivors.length);
  const item = items.find((i) => i.slug === "hoka-speedgoat-7")!;
  expect(item.videoUrl).toContain("youtube.com");
  expect(item.specs?.dropMm).toBe(4);
  expect(item.specs?.terrains).toEqual(["tecnico"]);
  // Agravic Speed e Speed Ultra condividono il video, ma restano due schede.
  expect(items.filter((i) => i.name.startsWith("Adidas Terrex Agravic Speed"))).toHaveLength(2);
});

it("esclude le bozze", async () => {
  await db.update(products).set({ status: "bozza" }).where(eq(products.slug, "hoka-speedgoat-6"));
  const items = await listCatalog(db);
  expect(items.find((i) => i.slug === "hoka-speedgoat-6")).toBeUndefined();
});
