import { z } from "zod";
import { CATEGORIES, PLATE_TYPES, TERRAINS } from "@/db/enum-values";
import { emptyToNull, optionalEnum, optionalInt, optionalPrice, optionalText, requiredText } from "./form";

const name = requiredText;

export const productFieldsSchema = z.object({
  version: z.string().trim().max(30, "Massimo 30 caratteri").default(""),
  releaseYear: optionalInt(1990, 2100),
  priceEur: optionalPrice,
});

export const createProductSchema = productFieldsSchema.extend({
  category: z.enum(CATEGORIES).default("scarpe"),
  brand: name("il brand"),
  model: name("il modello"),
  /** Vuoto = "brand modello versione". */
  displayName: z.preprocess(emptyToNull, z.string().trim().max(100).nullable()),
});

export const updateProductSchema = productFieldsSchema.extend({
  displayName: name("il nome", 100),
});

export const specsSchema = z
  .object({
    dropMm: optionalInt(0, 20),
    stackHeelMm: optionalInt(0, 60),
    stackForeMm: optionalInt(0, 60),
    weightG: optionalInt(50, 1000),
    weightRefSize: z.preprocess(emptyToNull, z.string().trim().max(20).nullable()),
    lugMm: optionalInt(0, 15),
    plate: optionalEnum(PLATE_TYPES),
    terrains: z.array(z.enum(TERRAINS)).default([]),
    waterproof: z.preprocess(
      (v) => (v === "true" ? true : v === "false" ? false : null),
      z.boolean().nullable(),
    ),
    upper: optionalText(120),
    midsole: optionalText(120),
    outsole: optionalText(120),
    fitNote: optionalText(200),
  });


export const aliasSchema = z.object({ alias: name("l'alias") });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SpecsInput = z.infer<typeof specsSchema>;
