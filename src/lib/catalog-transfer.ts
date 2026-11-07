// Esportazione e importazione del catalogo (brand, modelli, prodotti, alias,
// specifiche, caratteristiche, foto). Le foto viaggiano in uno ZIP che il browser
// compone e apre: qui si gestisce solo il JSON (`catalogo.json`).
// Import: i prodotti si riconoscono dallo slug; nuovi = aggiunti, esistenti =
// aggiornati, nessuno viene cancellato. Tutto o niente.
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { CATEGORIES, PRODUCT_STATUSES, type Category } from "@/db/enum-values";
import { brands, models, productAliases, products, shoeSpecs } from "@/db/schema";
import { attributesSchema } from "./categories";
import { pgError, PG_UNIQUE_VIOLATION } from "./pg-error";
import { slugify } from "./slug";
import { specsSchema } from "./validation/catalog";

export const EXPORT_FORMAT = "buckled-gear-catalogo";
export const EXPORT_VERSION = 1;

const SPEC_KEYS = [
  "dropMm",
  "stackHeelMm",
  "stackForeMm",
  "weightG",
  "weightRefSize",
  "lugMm",
  "plate",
  "terrains",
  "waterproof",
  "upper",
  "midsole",
  "outsole",
  "fitNote",
] as const;

// ---------------------------------------------------------------------------
// Esportazione

export async function exportCatalog(db: Db) {
  const rows = await db
    .select({ p: products, brand: brands.name, model: models.name, category: models.category, specs: shoeSpecs })
    .from(products)
    .innerJoin(models, eq(models.id, products.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
    .orderBy(asc(brands.name), asc(products.displayName));
  const aliases = await db.select().from(productAliases);
  const aliasesOf = new Map<string, string[]>();
  for (const a of aliases) aliasesOf.set(a.productId, [...(aliasesOf.get(a.productId) ?? []), a.alias]);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    products: rows.map(({ p, brand, model, category, specs }) => ({
      slug: p.slug,
      category,
      brand,
      model,
      version: p.version,
      displayName: p.displayName,
      releaseYear: p.releaseYear,
      priceEur: p.priceEur,
      status: p.status,
      aliases: (aliasesOf.get(p.id) ?? []).sort(),
      specs: specs ? Object.fromEntries(SPEC_KEYS.map((k) => [k, specs[k]])) : null,
      attributes: p.attributes,
      // Percorso o URL della foto. Nello ZIP il browser aggiunge `imageFile` ("foto/<file>").
      image: p.imagePath,
      imageFile: null as string | null,
    })),
  };
}

export type CatalogExport = Awaited<ReturnType<typeof exportCatalog>>;

// ---------------------------------------------------------------------------
// Importazione

const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug non valido (solo minuscole, numeri e trattini)"),
  category: z.enum(CATEGORIES),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  version: z.string().trim().max(30).default(""),
  displayName: z.string().trim().min(1).max(100),
  releaseYear: z.number().int().min(1990).max(2100).nullable().default(null),
  priceEur: z.number().min(0).max(10_000).nullable().default(null),
  status: z.enum(PRODUCT_STATUSES).default("bozza"),
  aliases: z.array(z.string().trim().min(1).max(60)).default([]),
  specs: z.record(z.string(), z.unknown()).nullable().default(null),
  attributes: z.record(z.string(), z.unknown()).default({}),
  image: z.string().max(500).nullable().default(null),
  /** File della foto dentro lo ZIP; lo carica il browser dopo l'importazione. */
  imageFile: z.string().max(200).nullable().default(null),
});

export const importSchema = z.object({
  format: z.literal(EXPORT_FORMAT, "Non è un file di esportazione del catalogo."),
  version: z.literal(EXPORT_VERSION, "Versione del file non supportata."),
  products: z.array(productSchema).max(5000),
});

export type ImportProduct = z.infer<typeof productSchema>;
export type ImportReport = {
  created: string[];
  updated: string[];
  errors: { slug: string; message: string }[];
  /** slug → id del prodotto, per caricare poi le foto. */
  ids: Record<string, string>;
};

class ImportItemError extends Error {}
class DryRun extends Error {}

/** Foto che si possono tenere come riferimento: quelle del repo e quelle su Vercel Blob. */
export function isKeepableImage(image: string) {
  return /^\/products\/[\w.-]+$/.test(image) || /^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\/products\//.test(image);
}

/**
 * Applica il file. Con `dryRun` esegue tutto e poi annulla: l'anteprima vede gli
 * stessi errori dell'importazione vera. Con errori non si salva niente.
 */
export async function importCatalog(db: Db, raw: unknown, opts: { dryRun: boolean }): Promise<ImportReport> {
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path[0] === "products" && typeof issue.path[1] === "number" ? ` (prodotto n. ${issue.path[1] + 1}, ${issue.path.slice(2).join(".")})` : "";
    return { created: [], updated: [], errors: [{ slug: "file", message: `${issue.message}${where}` }], ids: {} };
  }
  const items = parsed.data.products;
  const dupes = items.map((p) => p.slug).filter((s, i, all) => all.indexOf(s) !== i);
  if (dupes.length) {
    return { created: [], updated: [], errors: [{ slug: "file", message: `Slug ripetuti nel file: ${[...new Set(dupes)].join(", ")}` }], ids: {} };
  }

  const report: ImportReport = { created: [], updated: [], errors: [], ids: {} };
  try {
    await db.transaction(async (txRaw) => {
      const tx = txRaw as unknown as Db;
      for (const item of items) {
        try {
          // Un savepoint per prodotto: un errore non blocca il controllo degli altri.
          await tx.transaction(async (sp) => {
            const { id, created } = await upsertProduct(sp as unknown as Db, item);
            report.ids[item.slug] = id;
            (created ? report.created : report.updated).push(item.slug);
          });
        } catch (e) {
          if (e instanceof ImportItemError) report.errors.push({ slug: item.slug, message: e.message });
          else if (pgError(e)?.code === PG_UNIQUE_VIOLATION) report.errors.push({ slug: item.slug, message: describeConflict(pgError(e)?.constraint) });
          else throw e;
        }
      }
      if (opts.dryRun || report.errors.length) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  if (report.errors.length && !opts.dryRun) report.ids = {};
  return report;
}

function describeConflict(constraint: string | undefined) {
  if (constraint === "products_model_version_uq") return "Il modello ha già un altro prodotto con la stessa versione.";
  if (constraint?.includes("alias")) return "Un alias è già usato da un altro prodotto.";
  if (constraint?.includes("slug")) return "Indirizzo (slug) già usato.";
  return `Dato già presente (${constraint ?? "vincolo di unicità"}).`;
}

async function upsertProduct(db: Db, item: ImportProduct) {
  let [brand] = await db.select().from(brands).where(sql`lower(${brands.name}) = lower(${item.brand})`);
  if (!brand) [brand] = await db.insert(brands).values({ name: item.brand, slug: slugify(item.brand) }).returning();

  let [model] = await db
    .select()
    .from(models)
    .where(and(eq(models.brandId, brand.id), sql`lower(${models.name}) = lower(${item.model})`));
  if (!model) {
    [model] = await db
      .insert(models)
      .values({ brandId: brand.id, category: item.category, name: item.model, slug: slugify(item.model) })
      .returning();
  } else if (model.category !== item.category) {
    throw new ImportItemError(`${brand.name} ${model.name} esiste già nella categoria ${model.category}.`);
  }

  const attributes = item.category === "scarpe" ? {} : parseAttributes(item.category, item.attributes);
  const values = {
    modelId: model.id,
    version: item.version,
    displayName: item.displayName,
    releaseYear: item.releaseYear,
    priceEur: item.priceEur,
    status: item.status,
    attributes,
    // Una foto senza file nello ZIP si tiene solo se è un riferimento valido.
    ...(item.image && isKeepableImage(item.image) ? { imagePath: item.image } : {}),
  };

  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, item.slug));
  let id: string;
  if (existing) {
    await db.update(products).set(values).where(eq(products.id, existing.id));
    id = existing.id;
  } else {
    [{ id }] = await db.insert(products).values({ ...values, slug: item.slug }).returning({ id: products.id });
  }

  if (item.category === "scarpe" && item.specs) {
    const specs = parseSpecs(item.specs);
    await db.insert(shoeSpecs).values({ productId: id, ...specs }).onConflictDoUpdate({ target: shoeSpecs.productId, set: specs });
  }
  for (const alias of item.aliases) {
    const [taken] = await db
      .select({ productId: productAliases.productId })
      .from(productAliases)
      .where(sql`lower(${productAliases.alias}) = lower(${alias})`);
    if (taken && taken.productId !== id) throw new ImportItemError(`Alias "${alias}" già usato da un altro prodotto.`);
    if (!taken) await db.insert(productAliases).values({ productId: id, alias });
  }
  return { id, created: !existing };
}

/** Le specifiche passano dallo stesso schema del form (che si aspetta testo per i sì/no). */
function parseSpecs(raw: Record<string, unknown>) {
  const asForm = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v === null ? "" : v]),
  );
  const r = specsSchema.safeParse(asForm);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new ImportItemError(`Specifica "${i.path.join(".")}": ${i.message}`);
  }
  return r.data;
}

function parseAttributes(category: Category, raw: Record<string, unknown>) {
  const r = attributesSchema(category).safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new ImportItemError(`Caratteristica "${i.path.join(".")}": ${i.message}`);
  }
  return Object.fromEntries(Object.entries(r.data).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean>;
}
