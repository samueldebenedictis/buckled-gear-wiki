"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { DISTANCE_BANDS } from "@/db/schema/enums";
import * as reviews from "@/lib/admin-reviews";
import type { FormState } from "@/lib/form-state";
import { requireRedattore } from "@/lib/session";
import { mediaSchema, reviewSchema } from "@/lib/validation/review";

function changed(ok: string): FormState {
  updateTag("catalog");
  refresh();
  return { ok };
}

function fieldErrors(error: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"] };
}

function parseReview(formData: FormData) {
  return reviewSchema.safeParse({
    ...Object.fromEntries(formData),
    distances: formData.getAll("distances").filter((d) => DISTANCE_BANDS.includes(d as never)),
  });
}

export async function createReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireRedattore();
  const { productId } = z.object({ productId: z.uuid() }).parse(Object.fromEntries(formData));
  const parsed = parseReview(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  await reviews.createReview(db, productId, actor.id, parsed.data);
  return changed(parsed.data.status === "pubblicata" ? "Recensione pubblicata." : "Bozza salvata.");
}

export async function updateReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { reviewId } = z.object({ reviewId: z.uuid() }).parse(Object.fromEntries(formData));
  const parsed = parseReview(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  await reviews.updateReview(db, reviewId, parsed.data);
  return changed("Recensione salvata.");
}

export async function deleteReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { reviewId } = z.object({ reviewId: z.uuid() }).parse(Object.fromEntries(formData));
  await reviews.deleteReview(db, reviewId);
  return changed("Recensione eliminata.");
}

export async function addMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { reviewId } = z.object({ reviewId: z.uuid() }).parse(Object.fromEntries(formData));
  const parsed = mediaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await reviews.addMedia(db, reviewId, parsed.data);
  return changed("Link aggiunto.");
}

export async function removeMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { reviewId, mediaId } = z
    .object({ reviewId: z.uuid(), mediaId: z.uuid() })
    .parse(Object.fromEntries(formData));
  await reviews.removeMedia(db, reviewId, mediaId);
  return changed("Link rimosso.");
}
