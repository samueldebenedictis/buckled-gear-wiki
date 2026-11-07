import { z } from "zod";
import { DISTANCE_BANDS, MEDIA_KINDS, REVIEW_STATUSES } from "@/db/schema/enums";
import { FIT_FIELDS, SCORE_FIELDS } from "@/db/enum-values";
import type { ReviewScores } from "@/db/schema/content";
import { emptyToNull, optionalInt, optionalText, requiredText } from "./form";

const scoreFields = {
  ...Object.fromEntries(FIT_FIELDS.map((f) => [f, optionalInt(-1, 1)])),
  ...Object.fromEntries(SCORE_FIELDS.map((f) => [f, optionalInt(1, 5)])),
} as Record<(typeof FIT_FIELDS)[number] | (typeof SCORE_FIELDS)[number], ReturnType<typeof optionalInt>>;

export const reviewSchema = z
  .object({
    title: requiredText("il titolo", 120),
    verdict: optionalText(280),
    bodyMd: z.string().max(20_000, "Testo troppo lungo").default(""),
    kmTested: optionalInt(0, 5000),
    distances: z.array(z.enum(DISTANCE_BANDS)).default([]),
    status: z.enum(REVIEW_STATUSES),
    ...scoreFields,
  })
  .transform(({ title, verdict, bodyMd, kmTested, distances, status, ...rest }) => {
    // I voti finiscono nel jsonb `scores`, solo quelli compilati.
    const scores: ReviewScores = {};
    for (const [k, v] of Object.entries(rest)) if (v !== null) scores[k as keyof ReviewScores] = v as number;
    return { title, verdict, bodyMd, kmTested, distances, status, scores };
  });

export type ReviewInput = z.output<typeof reviewSchema>;

const HOSTS: Partial<Record<(typeof MEDIA_KINDS)[number], string[]>> = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  spotify: ["open.spotify.com"],
};

/** "1:23:45", "12:30" o "750" → secondi. */
export function parseTimestamp(v: string): number | null {
  if (!/^\d+(:\d{1,2}){0,2}$/.test(v)) return null;
  return v.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

export const mediaSchema = z
  .object({
    kind: z.enum(MEDIA_KINDS),
    url: z.url({ protocol: /^https$/, error: "Inserisci un link https valido" }).trim(),
    startS: z.preprocess(emptyToNull, z.string().trim().nullable()),
  })
  .transform((m, ctx) => {
    const hosts = HOSTS[m.kind];
    if (hosts && !hosts.includes(new URL(m.url).hostname)) {
      ctx.addIssue({ code: "custom", path: ["url"], message: `Non è un link ${m.kind}` });
      return z.NEVER;
    }
    let startS: number | null = null;
    if (m.startS !== null) {
      startS = parseTimestamp(m.startS);
      if (startS === null) {
        ctx.addIssue({ code: "custom", path: ["startS"], message: "Formato: 12:30 o 1:02:30" });
        return z.NEVER;
      }
    }
    return { kind: m.kind, url: m.url, startS };
  });

export type MediaInput = z.output<typeof mediaSchema>;
