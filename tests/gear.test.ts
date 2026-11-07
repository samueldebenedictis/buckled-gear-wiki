import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { products, user } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import * as gear from "@/lib/gear";
import { getProfile, updateProfile } from "@/lib/profile";
import { feedbackSchema, gearSchema, profileSchema, sizeValueSchema } from "@/lib/validation/gear";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let sg7: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  [{ id: sg7 }] = await db.select({ id: products.id }).from(products).where(eq(products.slug, "hoka-speedgoat-7"));
  await db.insert(user).values([
    { id: "a", name: "A", email: "a@x.it" },
    { id: "b", name: "B", email: "b@x.it" },
  ]);
});
afterAll(() => close());

const input = (over: Record<string, unknown> = {}) =>
  gearSchema.parse({ productId: sg7, sizeSystem: "US_M", sizeValue: "9.5", km: "", ...over });

describe("validazione", () => {
  it("accetta solo taglie US a mezzi numeri", () => {
    expect(sizeValueSchema.parse("9.5")).toBe("9.5");
    expect(sizeValueSchema.parse("12")).toBe("12");
    expect(sizeValueSchema.safeParse("42").success).toBe(false);
    expect(sizeValueSchema.safeParse("9.25").success).toBe(false);
    expect(gearSchema.safeParse({ productId: sg7, sizeSystem: "EU", sizeValue: "9" }).success).toBe(false);
  });

  it("soprannome facoltativo, vuoto = null, massimo 40 caratteri", () => {
    expect(input().nickname).toBeNull();
    expect(input({ nickname: "  quelle da gara " }).nickname).toBe("quelle da gara");
    expect(gearSchema.safeParse({ ...input(), nickname: "x".repeat(41) }).success).toBe(false);
  });

  it("la data di dismissione imposta lo stato", () => {
    expect(input().status).toBe("in_uso");
    expect(input({ retiredOn: "2026-05-01" }).status).toBe("dismessa");
    expect(gearSchema.safeParse({ ...input(), purchasedOn: "2026-06-01", retiredOn: "2026-05-01" }).success).toBe(false);
  });

  it("feedback: campi vuoti null, range rispettati", () => {
    const f = feedbackSchema.parse({ comfort: "4", fitWidth: "", distances: ["50k"] });
    expect(f.comfort).toBe(4);
    expect(f.fitWidth).toBeNull();
    expect(feedbackSchema.safeParse({ comfort: "9" }).success).toBe(false);
  });
});

describe("equipaggiamento", () => {
  let gearId: string;

  it("aggiunge e lista solo i propri pezzi", async () => {
    gearId = await gear.addGear(db, "a", input({ km: "120" }));
    await gear.addGear(db, "a", input()); // secondo paio uguale
    await gear.addGear(db, "b", input());
    expect(await gear.listGear(db, "a")).toHaveLength(2);
    expect(await gear.listGear(db, "b")).toHaveLength(1);
  });

  it("nessuno legge o modifica i pezzi altrui", async () => {
    expect(await gear.getGear(db, "b", gearId)).toBeNull();
    await expect(gear.updateGear(db, "b", gearId, input({ km: "999" }))).rejects.toThrow(gear.GearError);
    await expect(gear.saveFeedback(db, "b", gearId, feedbackSchema.parse({ comfort: "1" }))).rejects.toThrow(gear.GearError);
    await gear.deleteGear(db, "b", gearId);
    expect((await gear.getGear(db, "a", gearId))?.gear.km).toBe(120);
  });

  it("dismette e salva il feedback", async () => {
    await gear.updateGear(db, "a", gearId, input({ km: "650", retiredOn: "2026-10-01" }));
    await gear.saveFeedback(db, "a", gearId, feedbackSchema.parse({ comfort: "4", distances: ["100k"] }));
    await gear.saveFeedback(db, "a", gearId, feedbackSchema.parse({ comfort: "5", distances: ["100k"] }));
    const g = (await gear.getGear(db, "a", gearId))!;
    expect(g.gear.status).toBe("dismessa");
    expect(g.feedback?.comfort).toBe(5);
  });

  it("non si aggiungono bozze", async () => {
    await db.update(products).set({ status: "bozza" }).where(eq(products.id, sg7));
    await expect(gear.addGear(db, "a", input())).rejects.toThrow(gear.GearError);
    // ma chi l'aveva già può continuare a modificarlo
    await gear.updateGear(db, "a", gearId, input({ km: "700", retiredOn: "2026-10-01" }));
    expect((await gear.listSelectableProducts(db)).some((p) => p.id === sg7)).toBe(false);
    await db.update(products).set({ status: "pubblicato" }).where(eq(products.id, sg7));
  });

  it("eliminare un pezzo elimina il feedback", async () => {
    await gear.deleteGear(db, "a", gearId);
    expect(await gear.getGear(db, "a", gearId)).toBeNull();
  });
});

describe("profilo", () => {
  it("aggiorna il nickname", async () => {
    await updateProfile(db, "a", profileSchema.parse({ name: "Ale" }));
    expect(await getProfile(db, "a")).toMatchObject({ name: "Ale" });
  });
});
