"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { PRODUCT_STATUSES } from "@/db/enum-values";
import * as catalog from "@/lib/admin-catalog";
import { attributesSchema } from "@/lib/categories";
import * as images from "@/lib/product-images";
import type { FormState } from "@/lib/form-state";
import { requireRedattore } from "@/lib/session";
import {
  aliasSchema,
  createProductSchema,
  specsSchema,
  updateProductSchema,
} from "@/lib/validation/catalog";

const idSchema = z.object({ productId: z.uuid() });

/** Dopo ogni modifica: catalogo pubblico aggiornato subito e pagina corrente ricaricata. */
function changed() {
  updateTag("catalog");
  updateTag("stats"); // nomi e stato si riflettono nelle classifiche
  refresh();
}

async function run(fn: () => Promise<void>, ok: string): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof catalog.CatalogError) return { error: e.message };
    throw e;
  }
  changed();
  return { ok };
}

function fieldErrors(error: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"] };
}

export async function createProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  let id: string;
  try {
    id = await catalog.createProduct(db, parsed.data);
  } catch (e) {
    if (e instanceof catalog.CatalogError) return { error: e.message };
    throw e;
  }
  updateTag("catalog");
  redirect(`/redazione/catalogo/${id}`);
}

export async function updateProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  const parsed = updateProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.updateProduct(db, productId, parsed.data), "Salvato.");
}

export async function saveSpecsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  const parsed = specsSchema.safeParse({
    ...Object.fromEntries(formData),
    terrains: formData.getAll("terrains"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.saveSpecs(db, productId, parsed.data), "Specifiche salvate.");
}

export async function addAliasAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  const parsed = aliasSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.addAlias(db, productId, parsed.data.alias), "Alias aggiunto.");
}

export async function removeAliasAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId, alias } = idSchema.extend({ alias: z.string() }).parse(Object.fromEntries(formData));
  return run(() => catalog.removeAlias(db, productId, alias), "Alias rimosso.");
}

export async function setStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId, status } = idSchema
    .extend({ status: z.enum(PRODUCT_STATUSES) })
    .parse(Object.fromEntries(formData));
  return run(
    () => catalog.setStatus(db, productId, status),
    status === "pubblicato" ? "Pubblicato: ora è nel catalogo." : "Rimesso in bozza: non compare più nel catalogo.",
  );
}

export async function setStatusManyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const ids = z.array(z.uuid()).safeParse(formData.getAll("ids"));
  const status = z.enum(PRODUCT_STATUSES).parse(formData.get("status"));
  if (!ids.success || ids.data.length === 0) return { error: "Seleziona almeno un prodotto." };
  const n = ids.data.length;
  return run(
    () => catalog.setStatusMany(db, ids.data, status),
    `${n} ${n === 1 ? "prodotto" : "prodotti"} ${status === "pubblicato" ? "pubblicati" : "rimessi in bozza"}.`,
  );
}

export async function deleteProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  try {
    await catalog.deleteProduct(db, productId);
  } catch (e) {
    if (e instanceof catalog.CatalogError) return { error: e.message };
    throw e;
  }
  updateTag("catalog");
  redirect("/redazione/catalogo");
}

const renameSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1, "Inserisci il nome").max(60) });

export async function renameBrandAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const parsed = renameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.renameBrand(db, parsed.data.id, parsed.data.name), "Brand rinominato.");
}

export async function renameModelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const parsed = renameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.renameModel(db, parsed.data.id, parsed.data.name), "Modello rinominato.");
}

export async function saveAttributesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  // La categoria la decide il database, non il form.
  const category = await catalog.getProductCategory(db, productId);
  if (!category || category === "scarpe") return { error: "Prodotto non valido." };
  const parsed = attributesSchema(category).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  return run(() => catalog.saveAttributes(db, productId, parsed.data), "Caratteristiche salvate.");
}

export async function uploadImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  const file = formData.get("image");
  if (!(file instanceof File)) return { fieldErrors: { image: ["Scegli un file."] } };
  try {
    await images.saveProductImage(db, productId, file);
  } catch (e) {
    if (e instanceof images.ImageError) return { fieldErrors: { image: [e.message] } };
    throw e;
  }
  changed();
  return { ok: "Foto aggiornata." };
}

export async function removeImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { productId } = idSchema.parse(Object.fromEntries(formData));
  await images.removeProductImage(db, productId);
  changed();
  return { ok: "Foto rimossa." };
}
