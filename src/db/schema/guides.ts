import { sql } from "drizzle-orm";
import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { products } from "./catalog";

/** Guide curate dalla redazione (es. Guida attrezzatura, Guida eyewear). */
export const guides = pgTable("guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  introMd: text("intro_md").notNull().default(""),
  /** "the why" di buckled.it: perché esiste la guida e come leggerla. Facoltativo. */
  whyMd: text("why_md").notNull().default(""),
  /** Pagina originale su buckled.it, se esiste. */
  sourceUrl: text("source_url"),
  updatedOn: date("updated_on"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Un prodotto dentro una guida, con il commento della redazione per quella guida. */
export const guideItems = pgTable(
  "guide_items",
  {
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    /** Premio della guida, es. "Jack of all trades". */
    award: text("award"),
    /** Badge della legenda della guida, es. "el cheapo", "nightvision". */
    badges: text("badges").array().notNull().default(sql`'{}'`),
    noteMd: text("note_md").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.productId] }), index("guide_items_product_idx").on(t.productId)],
);
