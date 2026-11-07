"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import type { FormState } from "@/lib/form-state";
import * as guides from "@/lib/guides";
import { requireRedattore } from "@/lib/session";
import { guideItemSchema, guideSchema } from "@/lib/validation/guide";

const ids = z.object({ guideId: z.uuid() });
const itemIds = ids.extend({ productId: z.uuid() });

const fieldErrors = (error: z.ZodError): FormState => ({
  fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"],
});

async function run(fn: () => Promise<unknown>, ok: string): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof guides.GuideError) return { error: e.message };
    throw e;
  }
  updateTag("guides");
  refresh();
  return { ok };
}

export async function createGuideAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const parsed = guideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  let id = "";
  const res = await run(async () => (id = await guides.createGuide(db, parsed.data)), "");
  if (res.error) return res;
  redirect(`/redazione/guide/${id}`);
}

export async function updateGuideAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId } = ids.parse(Object.fromEntries(formData));
  const parsed = guideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => guides.updateGuide(db, guideId, parsed.data), "Guida salvata.");
}

export async function setGuidePublishedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId, published } = ids.extend({ published: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  return run(
    () => guides.setGuidePublished(db, guideId, published === "true"),
    published === "true" ? "Guida pubblicata." : "Guida spubblicata.",
  );
}

export async function deleteGuideAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId } = ids.parse(Object.fromEntries(formData));
  await guides.deleteGuide(db, guideId);
  updateTag("guides");
  redirect("/redazione/guide");
}

export async function addGuideItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const parsed = itemIds.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { productId: ["Scegli un prodotto"] } };
  const item = guideItemSchema.safeParse(Object.fromEntries(formData));
  if (!item.success) return fieldErrors(item.error);
  return run(() => guides.addGuideItem(db, parsed.data.guideId, parsed.data.productId, item.data), "Prodotto aggiunto.");
}

export async function updateGuideItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId, productId } = itemIds.parse(Object.fromEntries(formData));
  const item = guideItemSchema.safeParse(Object.fromEntries(formData));
  if (!item.success) return fieldErrors(item.error);
  return run(() => guides.updateGuideItem(db, guideId, productId, item.data), "Salvato.");
}

export async function removeGuideItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId, productId } = itemIds.parse(Object.fromEntries(formData));
  return run(() => guides.removeGuideItem(db, guideId, productId), "Rimosso dalla guida.");
}

export async function moveGuideItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { guideId, productId, direction } = itemIds
    .extend({ direction: z.enum(["up", "down"]) })
    .parse(Object.fromEntries(formData));
  return run(() => guides.moveGuideItem(db, guideId, productId, direction), "");
}
