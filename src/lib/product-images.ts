// Foto prodotto caricate dalla redazione.
// - Con uno store Vercel Blob collegato (BLOB_STORE_ID con login OIDC automatico,
//   o il vecchio BLOB_READ_WRITE_TOKEN) vanno su Blob, servite dalla CDN; nel DB
//   resta l'URL. Su Vercel il disco è in sola lettura.
// - Senza (sviluppo locale) finiscono in public/products, servite da Next.
// Le foto del seed restano in public/products in ogni caso: sono nel repository.
import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { products } from "@/db/schema";

// 4 MB: su Vercel una richiesta non può superare 4,5 MB (foto + resto del form).
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const DIR = path.join(process.cwd(), "public", "products");

export class ImageError extends Error {}

const blobEnabled = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
const isBlobUrl = (p: string | null) => !!p && /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(p);
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", avif: "image/avif" } as const;

/** Elimina dal Blob una foto caricata in precedenza (le foto locali e del seed restano). */
async function dropOld(imagePath: string | null) {
  if (isBlobUrl(imagePath) && blobEnabled()) {
    try {
      await del(imagePath!);
    } catch (e) {
      console.warn("Foto precedente non eliminata dal Blob:", e);
    }
  }
}

/** Riconosce il formato dai primi byte, non dal nome o dal tipo dichiarato dal browser. */
export function detectImageType(buf: Uint8Array): "png" | "jpg" | "webp" | "avif" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  return null;
}

export async function saveProductImage(db: Db, productId: string, file: File) {
  if (file.size === 0) throw new ImageError("Scegli un file.");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("Immagine troppo grande: massimo 4 MB.");
  const buf = new Uint8Array(await file.arrayBuffer());
  const ext = detectImageType(buf);
  if (!ext) throw new ImageError("Formato non supportato: usa PNG, JPEG, WebP o AVIF.");

  const [p] = await db
    .select({ slug: products.slug, imagePath: products.imagePath })
    .from(products)
    .where(eq(products.id, productId));
  if (!p) throw new ImageError("Prodotto non trovato.");
  // Il nome cambia col contenuto: niente problemi di cache quando si sostituisce la foto.
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 8);
  const name = `${p.slug}-${hash}.${ext}`;
  let imagePath: string;
  if (blobEnabled()) {
    const blob = await put(`products/${name}`, Buffer.from(buf), {
      access: "public",
      contentType: MIME[ext],
      addRandomSuffix: false,
      allowOverwrite: true, // stesso nome = stesso contenuto
    });
    imagePath = blob.url;
  } else {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, name), buf);
    imagePath = `/products/${name}`;
  }
  await db.update(products).set({ imagePath }).where(eq(products.id, productId));
  if (p.imagePath !== imagePath) await dropOld(p.imagePath);
}

export async function removeProductImage(db: Db, productId: string) {
  const [p] = await db.select({ imagePath: products.imagePath }).from(products).where(eq(products.id, productId));
  await db.update(products).set({ imagePath: null }).where(eq(products.id, productId));
  // Su disco il file resta: può essere la foto originale del seed.
  await dropOld(p?.imagePath ?? null);
}
