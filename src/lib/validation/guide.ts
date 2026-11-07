import { z } from "zod";
import { emptyToNull, optionalText, requiredText } from "./form";

export const guideSchema = z.object({
  title: requiredText("il titolo", 100),
  introMd: z.string().max(10_000).default(""),
  whyMd: z.string().max(10_000).default(""),
  sourceUrl: z.preprocess(emptyToNull, z.url({ protocol: /^https$/, error: "Link https non valido" }).nullable()),
  updatedOn: z.preprocess(emptyToNull, z.iso.date("Data non valida").nullable()),
  published: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const guideItemSchema = z.object({
  award: optionalText(60),
  /** Badge separati da virgola nel form. */
  badges: z
    .string()
    .default("")
    .transform((s) => [...new Set(s.split(",").map((b) => b.trim().toLowerCase()).filter(Boolean))].slice(0, 6))
    .pipe(z.array(z.string().max(40, "Badge troppo lungo"))),
  noteMd: z.string().max(5000).default(""),
});
