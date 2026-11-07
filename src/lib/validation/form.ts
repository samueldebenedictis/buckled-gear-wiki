// Helper Zod per i campi dei form HTML (dove tutto arriva come stringa).
import { z } from "zod";

export const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

/** Intero opzionale: "" → null. */
export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (emptyToNull(v) === null ? null : Number(v)),
    z
      .number({ error: "Deve essere un numero" })
      .int("Deve essere un numero intero")
      .min(min, `Minimo ${min}`)
      .max(max, `Massimo ${max}`)
      .nullable(),
  );

export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToNull, z.enum(values).nullable());

export const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Massimo ${max} caratteri`).nullable());

export const requiredText = (label: string, max = 60) =>
  z.string().trim().min(1, `Inserisci ${label}`).max(max, `Massimo ${max} caratteri`);

/** Prezzo in euro: "129,95" o "150" → numero; "" → null. */
export const optionalPrice = z.preprocess(
  (v) => (emptyToNull(v) === null ? null : Number(String(v).replace(",", "."))),
  z.number({ error: "Prezzo non valido" }).min(0).max(99_999).nullable(),
);
