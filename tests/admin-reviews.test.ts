import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { products, reviews, user } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import * as admin from "@/lib/admin-reviews";
import { listCatalog } from "@/lib/catalog";
import { mediaSchema, parseTimestamp, reviewSchema } from "@/lib/validation/review";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let productId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  [{ id: productId }] = await db.select({ id: products.id }).from(products).where(eq(products.slug, "hoka-speedgoat-7"));
  await db.insert(user).values({ id: "red", name: "Red", email: "r@b.it", role: "redattore" });
});
afterAll(() => close());

const form = (over: Record<string, unknown> = {}) =>
  reviewSchema.parse({ title: "Test SG7", status: "bozza", verdict: "", kmTested: "", ...over });

describe("validazione", () => {
  it("raccoglie solo i voti compilati", () => {
    const r = form({ comfort: "4", fitWidth: "-1", gripWet: "", distances: ["50k"] });
    expect(r.scores).toEqual({ comfort: 4, fitWidth: -1 });
    expect(r.verdict).toBeNull();
  });

  it("rifiuta voti fuori scala", () => {
    expect(reviewSchema.safeParse({ title: "x", status: "bozza", comfort: "6" }).success).toBe(false);
    expect(reviewSchema.safeParse({ title: "x", status: "bozza", fitLength: "2" }).success).toBe(false);
  });

  it("timestamp e link dei media", () => {
    expect(parseTimestamp("12:30")).toBe(750);
    expect(parseTimestamp("1:02:03")).toBe(3723);
    expect(parseTimestamp("90")).toBe(90);
    expect(parseTimestamp("12m")).toBeNull();
    expect(mediaSchema.parse({ kind: "youtube", url: "https://youtu.be/abc", startS: "1:00" }).startS).toBe(60);
    expect(mediaSchema.safeParse({ kind: "youtube", url: "https://vimeo.com/1", startS: "" }).success).toBe(false);
    expect(mediaSchema.safeParse({ kind: "spotify", url: "http://open.spotify.com/x", startS: "" }).success).toBe(false);
  });
});

describe("recensioni", () => {
  let id: string;

  it("una bozza non compare nel catalogo pubblico", async () => {
    id = await admin.createReview(db, productId, "red", form({ verdict: "Ottima in discesa" }));
    const item = (await listCatalog(db)).find((i) => i.id === productId)!;
    expect(item.verdict).toBeNull();
  });

  it("pubblicata: compare il verdetto e resta la prima data di pubblicazione", async () => {
    await admin.updateReview(db, id, form({ verdict: "Ottima in discesa", status: "pubblicata" }));
    const [r1] = await db.select().from(reviews).where(eq(reviews.id, id));
    expect(r1.publishedAt).not.toBeNull();
    await admin.updateReview(db, id, form({ verdict: "Ottima in discesa!", status: "pubblicata" }));
    const [r2] = await db.select().from(reviews).where(eq(reviews.id, id));
    expect(r2.publishedAt?.getTime()).toBe(r1.publishedAt?.getTime());

    const item = (await listCatalog(db)).find((i) => i.id === productId)!;
    expect(item.verdict).toBe("Ottima in discesa!");
    // Il video della recensione Sole Survivors resta.
    expect(item.videoUrl).toContain("youtube");
  });

  it("tornare a bozza toglie la data", async () => {
    await admin.updateReview(db, id, form({ status: "bozza" }));
    const [r] = await db.select().from(reviews).where(eq(reviews.id, id));
    expect(r.publishedAt).toBeNull();
  });

  it("media: aggiunge e rimuove", async () => {
    await admin.addMedia(db, id, mediaSchema.parse({ kind: "spotify", url: "https://open.spotify.com/episode/x", startS: "12:30" }));
    let [r] = (await admin.listReviewsForProduct(db, productId)).filter((x) => x.id === id);
    expect(r.media).toHaveLength(1);
    expect(r.media[0].startS).toBe(750);
    expect(r.author).toBe("Red");
    await admin.removeMedia(db, id, r.media[0].id);
    [r] = (await admin.listReviewsForProduct(db, productId)).filter((x) => x.id === id);
    expect(r.media).toHaveLength(0);
  });

  it("elimina", async () => {
    await admin.deleteReview(db, id);
    expect((await admin.listReviewsForProduct(db, productId)).some((x) => x.id === id)).toBe(false);
  });
});
