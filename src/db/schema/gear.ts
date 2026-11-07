import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { distanceBandEnum, gearStatusEnum, sizeSystemEnum, terrainEnum } from "./enums";

/** Un pezzo nell'equipaggiamento di un utente. Due paia uguali = due righe. */
export const userGear = pgTable(
  "user_gear",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    /** Soprannome facoltativo per distinguere più paia dello stesso modello. */
    nickname: text("nickname"),
    sizeSystem: sizeSystemEnum("size_system").notNull(),
    // Testo perché esistono taglie come "42 2/3" o "27.5".
    sizeValue: text("size_value").notNull(),
    purchasedOn: date("purchased_on"),
    retiredOn: date("retired_on"),
    km: integer("km").notNull().default(0),
    status: gearStatusEnum("status").notNull().default("in_uso"),
    privateNote: text("private_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("user_gear_user_idx").on(t.userId),
    index("user_gear_product_idx").on(t.productId),
    check("user_gear_km_ck", sql`${t.km} >= 0`),
    check("user_gear_dates_ck", sql`${t.retiredOn} >= ${t.purchasedOn}`),
    check("user_gear_retired_status_ck", sql`${t.retiredOn} is null or ${t.status} = 'dismessa'`),
  ],
);

const fit = (name: string) => smallint(name);
const score = (name: string) => smallint(name);

export { FIT_FIELDS, SCORE_FIELDS } from "../enum-values";

/** Feedback strutturato, uno per pezzo dell'equipaggiamento. Tutti i voti sono opzionali. */
export const gearFeedback = pgTable(
  "gear_feedback",
  {
    gearId: uuid("gear_id")
      .primaryKey()
      .references(() => userGear.id, { onDelete: "cascade" }),
    fitLength: fit("fit_length"),
    fitWidth: fit("fit_width"),
    fitVolume: fit("fit_volume"),
    heelHold: score("heel_hold"),
    durability: score("durability"),
    comfort: score("comfort"),
    cushioning: score("cushioning"),
    stability: score("stability"),
    gripDry: score("grip_dry"),
    gripWet: score("grip_wet"),
    distances: distanceBandEnum("distances").array().notNull().default(sql`'{}'`),
    /** Terreni dove il runner la usa. Distinti da quelli della redazione in shoe_specs. */
    terrains: terrainEnum("terrains").array().notNull().default(sql`'{}'`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      "gear_feedback_fit_ck",
      sql`${t.fitLength} between -1 and 1 and ${t.fitWidth} between -1 and 1 and ${t.fitVolume} between -1 and 1`,
    ),
    check(
      "gear_feedback_scores_ck",
      sql`${t.heelHold} between 1 and 5 and ${t.durability} between 1 and 5 and ${t.comfort} between 1 and 5 and ${t.cushioning} between 1 and 5 and ${t.stability} between 1 and 5 and ${t.gripDry} between 1 and 5 and ${t.gripWet} between 1 and 5`,
    ),
  ],
);
