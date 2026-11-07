import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { categoryEnum, plateTypeEnum, productStatusEnum, terrainEnum } from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ...timestamps,
  },
  (t) => [uniqueIndex("brands_name_lower_uq").on(sql`lower(${t.name})`)],
);

/** Famiglia di prodotti, es. "Speedgoat". */
export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    category: categoryEnum("category").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("models_brand_slug_uq").on(t.brandId, t.slug),
    uniqueIndex("models_brand_name_lower_uq").on(t.brandId, sql`lower(${t.name})`),
  ],
);

/** Versione specifica, es. "Speedgoat 7". `version` vuota se il modello non ha versioni. */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "restrict" }),
    version: text("version").notNull().default(""),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull().unique(),
    releaseYear: smallint("release_year"),
    /** Prezzo di listino indicativo, in euro. */
    priceEur: numeric("price_eur", { precision: 7, scale: 2, mode: "number" }),
    /** Campi specifici della categoria (non scarpe), vedi src/lib/categories.ts. */
    attributes: jsonb("attributes").$type<Record<string, string | number | boolean>>().notNull().default({}),
    /** Percorso pubblico della foto, es. "/products/hoka-speedgoat-7.png". */
    imagePath: text("image_path"),
    /** Le bozze (proposte dagli utenti o in lavorazione) le vede solo la redazione. */
    status: productStatusEnum("status").notNull().default("bozza"),
    ...timestamps,
  },
  (t) => [
    unique("products_model_version_uq").on(t.modelId, t.version),
    index("products_display_name_trgm_idx").using("gin", sql`${t.displayName} gin_trgm_ops`),
    check("products_release_year_ck", sql`${t.releaseYear} between 1990 and 2100`),
    check("products_price_ck", sql`${t.priceEur} >= 0`),
  ],
);

export const productAliases = pgTable(
  "product_aliases",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.alias] }),
    uniqueIndex("product_aliases_alias_lower_uq").on(sql`lower(${t.alias})`),
    index("product_aliases_alias_trgm_idx").using("gin", sql`${t.alias} gin_trgm_ops`),
  ],
);

export const shoeSpecs = pgTable(
  "shoe_specs",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    dropMm: smallint("drop_mm"),
    stackHeelMm: smallint("stack_heel_mm"),
    stackForeMm: smallint("stack_fore_mm"),
    weightG: integer("weight_g"),
    weightRefSize: text("weight_ref_size"),
    lugMm: smallint("lug_mm"),
    plate: plateTypeEnum("plate"),
    terrains: terrainEnum("terrains").array().notNull().default(sql`'{}'`),
    waterproof: boolean("waterproof"),
    upper: text("upper"),
    midsole: text("midsole"),
    outsole: text("outsole"),
    /** Consiglio sulla taglia, es. "True to size", "mezza taglia in più". */
    fitNote: text("fit_note"),
  },
  (t) => [
    check("shoe_specs_drop_ck", sql`${t.dropMm} between 0 and 20`),
    check("shoe_specs_stack_heel_ck", sql`${t.stackHeelMm} between 0 and 60`),
    check("shoe_specs_stack_fore_ck", sql`${t.stackForeMm} between 0 and 60`),
    check("shoe_specs_weight_ck", sql`${t.weightG} between 50 and 1000`),
    check("shoe_specs_lug_ck", sql`${t.lugMm} between 0 and 15`),
  ],
);
