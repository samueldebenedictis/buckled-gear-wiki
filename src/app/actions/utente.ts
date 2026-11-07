"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { CATEGORIES, DISTANCE_BANDS, type Category } from "@/db/enum-values";
import type { FormState } from "@/lib/form-state";
import * as gear from "@/lib/gear";
import { updateProfile } from "@/lib/profile";
import * as prop from "@/lib/proposals";
import { requireUser } from "@/lib/session";
import { feedbackSchema, gearSchema, profileSchema } from "@/lib/validation/gear";
import { attributesSchema, type Attributes } from "@/lib/categories";
import { diffChanges } from "@/lib/correction";
import { specsSchema, type SpecsInput } from "@/lib/validation/catalog";
import { correctableProductSchema, correctionNoteSchema, newProductPayloadSchema } from "@/lib/validation/proposal";

const fieldErrors = (error: z.ZodError): FormState => ({
  fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"],
});

const gearIdSchema = z.object({ gearId: z.uuid() });

/** Equipaggiamento e profilo alimentano le statistiche pubbliche. */
function statsChanged(ok: string): FormState {
  updateTag("stats");
  refresh();
  return { ok };
}

async function guard(fn: () => Promise<unknown>): Promise<FormState | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof gear.GearError || e instanceof prop.ProposalError) return { error: e.message };
    throw e;
  }
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await updateProfile(db, me.id, parsed.data);
  return statsChanged("Profilo salvato.");
}

export async function addGearAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const parsed = gearSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  let id = "";
  const err = await guard(async () => (id = await gear.addGear(db, me.id, parsed.data)));
  if (err) return err;
  updateTag("stats");
  redirect(`/equipaggiamento/${id}`);
}

export async function updateGearAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const { gearId } = gearIdSchema.parse(Object.fromEntries(formData));
  const parsed = gearSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return (await guard(() => gear.updateGear(db, me.id, gearId, parsed.data))) ?? statsChanged("Salvato.");
}

export async function deleteGearAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const { gearId } = gearIdSchema.parse(Object.fromEntries(formData));
  await gear.deleteGear(db, me.id, gearId);
  updateTag("stats");
  redirect("/equipaggiamento");
}

export async function saveFeedbackAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const { gearId } = gearIdSchema.parse(Object.fromEntries(formData));
  const parsed = feedbackSchema.safeParse({
    ...Object.fromEntries(formData),
    distances: formData.getAll("distances").filter((d) => DISTANCE_BANDS.includes(d as never)),
    terrains: formData.getAll("terrains"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  return (await guard(() => gear.saveFeedback(db, me.id, gearId, parsed.data))) ?? statsChanged("Feedback salvato.");
}

/** Specifiche (scarpe) o caratteristiche (altre categorie) dal form; errori insieme a quelli generali. */
function parseDetails(
  category: Category,
  formData: FormData,
): { specs?: SpecsInput; attributes?: Attributes; error?: z.ZodError } {
  if (category === "scarpe") {
    const r = specsSchema.safeParse({ ...Object.fromEntries(formData), terrains: formData.getAll("terrains") });
    return r.success ? { specs: r.data } : { error: r.error };
  }
  const r = attributesSchema(category).safeParse(Object.fromEntries(formData));
  return r.success ? { attributes: r.data } : { error: r.error };
}

export async function proposeNewProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const base = newProductPayloadSchema.safeParse(Object.fromEntries(formData));
  const category = (CATEGORIES as readonly string[]).includes(String(formData.get("category")))
    ? (formData.get("category") as Category)
    : "scarpe";
  const details = parseDetails(category, formData);
  if (!base.success || details.error) {
    return {
      fieldErrors: {
        ...(base.success ? {} : z.flattenError(base.error).fieldErrors),
        ...(details.error ? z.flattenError(details.error).fieldErrors : {}),
      } as FormState["fieldErrors"],
    };
  }
  await prop.proposeNewProduct(db, me.id, { ...base.data, specs: details.specs, attributes: details.attributes });
  refresh();
  return { ok: "Proposta inviata: se la redazione la accetta, il prodotto entra nel catalogo." };
}

/** La correzione arriva dal form della scheda precompilato: si salvano solo i campi cambiati. */
export async function proposeCorrectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const productId = z.uuid().safeParse(formData.get("productId"));
  if (!productId.success) return { error: "Prodotto non valido." };
  const current = await prop.currentValues(db, productId.data);
  if (!current) return { error: "Prodotto non trovato." };

  const general = correctableProductSchema.safeParse(Object.fromEntries(formData));
  const details = parseDetails(current.category, formData);
  const note = correctionNoteSchema.safeParse(formData.get("note") ?? "");
  if (!general.success || details.error || !note.success) {
    return {
      fieldErrors: {
        ...(general.success ? {} : z.flattenError(general.error).fieldErrors),
        ...(details.error ? z.flattenError(details.error).fieldErrors : {}),
        ...(note.success ? {} : { note: note.error.issues.map((i) => i.message) }),
      } as FormState["fieldErrors"],
    };
  }
  const changes = diffChanges(current.category, current, {
    product: general.data,
    specs: details.specs,
    attributes: details.attributes,
  });
  const err = await guard(() => prop.proposeCorrection(db, me.id, productId.data, { note: note.data, changes }));
  if (err) return err;
  refresh();
  return { ok: "Correzione inviata: la redazione la valuterà." };
}
