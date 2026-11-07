import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { products } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { seedGuidesData } from "@/db/seed/guides";
import { PRODUCT_IMAGES } from "@/db/seed/images";
import { seedProductImages } from "@/db/seed/product-images";
import { detectImageType } from "@/lib/product-images";
import { createTestDb } from "./helpers/db";

const bytes = (...xs: (number | string)[]) =>
  new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

// Le foto non sono nel repo (diritti delle immagini): su un clone pulito o in CI questi controlli si saltano.
const hasPhotos = existsSync(path.join(process.cwd(), "public", "products"));

describe("formato immagine", () => {
  it("riconosce i formati dai primi byte", () => {
    expect(detectImageType(bytes(0x89, "PNG\r\n"))).toBe("png");
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(detectImageType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("webp");
    expect(detectImageType(bytes(0, 0, 0, 0x1c, "ftypavif"))).toBe("avif");
    expect(detectImageType(bytes("<svg xmlns"))).toBeNull();
    expect(detectImageType(bytes("GIF89a"))).toBeNull();
  });
});

describe("foto del catalogo", () => {
  let db: Db;
  let close: () => Promise<void>;
  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    await seedCatalog(db);
    await seedGuidesData(db);
  });
  afterAll(() => close());

  it.skipIf(!hasPhotos)("ogni file dell'elenco esiste in public/products", () => {
    for (const { file } of Object.values(PRODUCT_IMAGES)) {
      expect(existsSync(path.join(process.cwd(), "public", "products", file)), file).toBe(true);
    }
  });

  it.skipIf(!hasPhotos)("ogni prodotto del seed ha la sua foto", async () => {
    const linked = await seedProductImages(db);
    expect(linked).toBe(Object.keys(PRODUCT_IMAGES).length);
    expect((await db.select().from(products)).filter((p) => !p.imagePath).map((p) => p.slug)).toEqual([]);
  });

  it("non sovrascrive una foto scelta dalla redazione", async () => {
    await db.update(products).set({ imagePath: "/products/custom.webp" }).where(eq(products.slug, "hoka-speedgoat-7"));
    expect(await seedProductImages(db)).toBe(0);
    const [p] = await db.select().from(products).where(eq(products.slug, "hoka-speedgoat-7"));
    expect(p.imagePath).toBe("/products/custom.webp");
  });
});
