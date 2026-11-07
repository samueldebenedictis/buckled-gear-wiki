import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import {
  brands,
  gearFeedback,
  productAliases,
  products,
  reviewMedia,
  reviews,
  user,
  userGear,
} from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { soleSurvivors } from "@/db/seed/sole-survivors";
import { createTestDb, pgConstraint } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let productId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  const [p] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-7"));
  productId = p.id;
  await db.insert(user).values({ id: "u1", name: "Ale", email: "a@b.it" });
});
afterAll(() => close());

async function violation(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return pgConstraint(e);
  }
  throw new Error("nessun vincolo violato");
}

describe("seed", () => {
  it("inserisce tutte le scarpe di Sole Survivors con il video", async () => {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(products);
    expect(n).toBe(soleSurvivors.length);
    const [{ m }] = await db.select({ m: sql<number>`count(*)::int` }).from(reviewMedia);
    expect(m).toBe(soleSurvivors.length);
    const published = await db.select().from(reviews).where(eq(reviews.status, "pubblicata"));
    expect(published).toHaveLength(soleSurvivors.length);
  });

  it("è idempotente", async () => {
    const res = await seedCatalog(db);
    expect(res.created).toBe(0);
  });

  it("raggruppa le versioni sotto lo stesso modello", async () => {
    const rows = await db
      .select({ modelId: products.modelId })
      .from(products)
      .where(sql`${products.slug} in ('hoka-speedgoat-6', 'hoka-speedgoat-7')`);
    expect(new Set(rows.map((r) => r.modelId)).size).toBe(1);
  });
});

describe("catalogo", () => {
  it("brand unico senza distinzione di maiuscole", async () => {
    expect(await violation(db.insert(brands).values({ name: "HOKA", slug: "hoka-2" }))).toBe(
      "brands_name_lower_uq",
    );
  });

  it("alias unico senza distinzione di maiuscole", async () => {
    expect(await violation(db.insert(productAliases).values({ productId, alias: "SG7" }))).toBe(
      "product_aliases_alias_lower_uq",
    );
  });

  it("la ricerca trigram trova la scarpa da alias e varianti", async () => {
    const search = (q: string) =>
      db.execute<{ display_name: string }>(sql`
        select p.display_name from products p
        left join product_aliases a on a.product_id = p.id
        where p.display_name % ${q} or a.alias % ${q}
        group by p.id, p.display_name
        order by max(greatest(similarity(p.display_name, ${q}), coalesce(similarity(a.alias, ${q}), 0))) desc
        limit 1`);
    for (const q of ["sg7", "speedgoat VII", "hoka speedgoat 7"]) {
      const res = await search(q);
      const rows = "rows" in res ? res.rows : res;
      expect((rows as { display_name: string }[])[0]?.display_name, q).toBe("Hoka Speedgoat 7");
    }
  });
});

describe("equipaggiamento", () => {
  const gear = (over: Partial<typeof userGear.$inferInsert> = {}) =>
    db.insert(userGear).values({ userId: "u1", productId, sizeSystem: "US_M", sizeValue: "9.5", ...over });

  it("accetta due paia dello stesso prodotto", async () => {
    await gear();
    await gear();
    const rows = await db.select().from(userGear).where(eq(userGear.userId, "u1"));
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("rifiuta km negativi", async () => {
    expect(await violation(gear({ km: -1 }))).toBe("user_gear_km_ck");
  });

  it("rifiuta dismissione prima dell'acquisto", async () => {
    expect(
      await violation(
        gear({ purchasedOn: "2026-05-01", retiredOn: "2026-04-01", status: "dismessa" }),
      ),
    ).toBe("user_gear_dates_ck");
  });

  it("una data di dismissione richiede lo stato dismessa", async () => {
    expect(await violation(gear({ retiredOn: "2026-04-01" }))).toBe("user_gear_retired_status_ck");
  });
});

describe("feedback", () => {
  let gearId: string;
  beforeAll(async () => {
    const [g] = await db
      .insert(userGear)
      .values({ userId: "u1", productId, sizeSystem: "US_W", sizeValue: "8.5" })
      .returning();
    gearId = g.id;
  });

  it("accetta voti nei range e campi vuoti", async () => {
    await db
      .insert(gearFeedback)
      .values({ gearId, fitLength: -1, fitWidth: 1, comfort: 5, gripWet: 1, distances: ["50k", "100M"] });
  });

  it("rifiuta fit fuori da −1…+1", async () => {
    await db.delete(gearFeedback).where(eq(gearFeedback.gearId, gearId));
    expect(await violation(db.insert(gearFeedback).values({ gearId, fitVolume: 2 }))).toBe(
      "gear_feedback_fit_ck",
    );
  });

  it("rifiuta voti fuori da 1…5", async () => {
    expect(await violation(db.insert(gearFeedback).values({ gearId, durability: 0 }))).toBe(
      "gear_feedback_scores_ck",
    );
    expect(await violation(db.insert(gearFeedback).values({ gearId, stability: 6 }))).toBe(
      "gear_feedback_scores_ck",
    );
  });
});

describe("utenti", () => {
  it("rifiuta ruoli sconosciuti", async () => {
    expect(
      await violation(db.insert(user).values({ id: "u2", name: "X", email: "x@y.it", role: "admin" })),
    ).toBe("user_role_ck");
  });
});
