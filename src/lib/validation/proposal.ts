import { z } from "zod";
import { CATEGORIES } from "@/db/enum-values";
import type { Attributes } from "@/lib/categories";
import type { SpecsInput } from "./catalog";
import { optionalInt, optionalPrice, optionalText, requiredText } from "./form";

/** Dati generali di una proposta di nuovo prodotto (vedi NewProductPayload). */
export const newProductPayloadSchema = z.object({
  category: z.enum(CATEGORIES).default("scarpe"),
  brand: requiredText("il brand"),
  model: requiredText("il modello"),
  version: z.string().trim().max(30).default(""),
  releaseYear: optionalInt(1990, 2100),
  note: optionalText(1000),
  priceEur: optionalPrice,
});

/** Campi generali che un runner può correggere (nome, brand e modello restano alla redazione). */
export const correctableProductSchema = z.object({
  releaseYear: optionalInt(1990, 2100),
  priceEur: optionalPrice,
});

type Value = string | number | boolean | string[] | null;

/** Solo i campi cambiati rispetto alla scheda; null = da svuotare. */
export type CorrectionChanges = {
  product?: Record<string, Value>;
  specs?: Record<string, Value>;
  attributes?: Record<string, Value>;
};

/**
 * Payload di una correzione: modifiche ai campi della scheda e/o nota libera.
 * Le correzioni più vecchie hanno solo la nota.
 */
export type CorrectionPayload = { note: string | null; changes?: CorrectionChanges };

export const correctionNoteSchema = optionalText(1000);

/**
 * Payload di una proposta di nuovo prodotto (proposals.payload): resta una proposta
 * finché la redazione non la accetta; allora diventa una bozza nel catalogo.
 * Specifiche e caratteristiche mancano nelle proposte più vecchie.
 */
export type NewProductPayload = z.output<typeof newProductPayloadSchema> & {
  specs?: SpecsInput;
  attributes?: Attributes;
};
