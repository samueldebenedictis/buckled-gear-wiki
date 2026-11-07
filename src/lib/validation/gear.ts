import { z } from "zod";
import { DISTANCE_BANDS, GEAR_STATUSES, SIZE_SYSTEMS, TERRAINS, US_SIZES } from "@/db/enum-values";
import { FIT_FIELDS, SCORE_FIELDS } from "@/db/enum-values";
import { emptyToNull, optionalInt, optionalText, requiredText } from "./form";

const optionalDate = z.preprocess(
  emptyToNull,
  z.iso.date("Data non valida").nullable(),
);

/** Taglia US a mezzi numeri, dal menu del form. */
export const sizeValueSchema = z.enum(US_SIZES as [string, ...string[]], "Scegli la taglia US");

export const gearSchema = z
  .object({
    productId: z.uuid("Scegli una scarpa"),
    nickname: optionalText(40),
    sizeSystem: z.enum(SIZE_SYSTEMS, "Scegli uomo o donna"),
    sizeValue: sizeValueSchema,
    purchasedOn: optionalDate,
    retiredOn: optionalDate,
    km: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int("Numero intero").min(0).max(100_000)),
    privateNote: optionalText(1000),
  })
  .refine((g) => !g.retiredOn || !g.purchasedOn || g.retiredOn >= g.purchasedOn, {
    path: ["retiredOn"],
    message: "La dismissione non può precedere l'acquisto",
  })
  // Una data di dismissione implica lo stato "dismessa".
  .transform((g) => ({ ...g, status: (g.retiredOn ? "dismessa" : "in_uso") as (typeof GEAR_STATUSES)[number] }));

export type GearInput = z.output<typeof gearSchema>;

export const feedbackSchema = z
  .object({
    distances: z.array(z.enum(DISTANCE_BANDS)).default([]),
    terrains: z.array(z.enum(TERRAINS)).default([]),
    ...Object.fromEntries(FIT_FIELDS.map((f) => [f, optionalInt(-1, 1)])),
    ...Object.fromEntries(SCORE_FIELDS.map((f) => [f, optionalInt(1, 5)])),
  } as Record<string, z.ZodType>)
  .transform((v) => v as FeedbackInput);

export type FeedbackInput = {
  distances: (typeof DISTANCE_BANDS)[number][];
  terrains: (typeof TERRAINS)[number][];
} & Record<
  (typeof FIT_FIELDS)[number] | (typeof SCORE_FIELDS)[number],
  number | null
>;

export const profileSchema = z.object({
  name: requiredText("il nickname", 50),
});
