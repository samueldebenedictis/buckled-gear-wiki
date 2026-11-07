import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import {
  distanceBandEnum,
  mediaKindEnum,
  proposalKindEnum,
  proposalStatusEnum,
  reviewStatusEnum,
} from "./enums";

/** Punteggi della redazione, stesse chiavi e scale del feedback utente. */
export type ReviewScores = Partial<
  Record<"fitLength" | "fitWidth" | "fitVolume", number> &
    Record<
      | "heelHold"
      | "durability"
      | "comfort"
      | "cushioning"
      | "stability"
      | "gripDry"
      | "gripWet",
      number
    >
>;

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    verdict: text("verdict"),
    kmTested: integer("km_tested"),
    scores: jsonb("scores").$type<ReviewScores>().notNull().default({}),
    distances: distanceBandEnum("distances").array().notNull().default(sql`'{}'`),
    status: reviewStatusEnum("status").notNull().default("bozza"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("reviews_product_idx").on(t.productId),
    check("reviews_km_ck", sql`${t.kmTested} >= 0`),
    check(
      "reviews_published_ck",
      sql`${t.status} <> 'pubblicata' or ${t.publishedAt} is not null`,
    ),
  ],
);

export const reviewMedia = pgTable(
  "review_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    url: text("url").notNull(),
    startS: integer("start_s"),
  },
  (t) => [
    index("review_media_review_idx").on(t.reviewId),
    check("review_media_start_ck", sql`${t.startS} >= 0`),
  ],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposerId: text("proposer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: proposalKindEnum("kind").notNull(),
    /** Prodotto da correggere. Le proposte decise si eliminano: restano solo quelle in attesa. */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Validato con Zod, vedi src/lib/validation/proposal.ts. */
    payload: jsonb("payload").notNull(),
    status: proposalStatusEnum("status").notNull().default("in_attesa"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("proposals_status_idx").on(t.status),
    index("proposals_proposer_idx").on(t.proposerId),
    check(
      "proposals_correction_ck",
      sql`${t.kind} <> 'correzione' or ${t.productId} is not null or ${t.status} <> 'in_attesa'`,
    ),
  ],
);
