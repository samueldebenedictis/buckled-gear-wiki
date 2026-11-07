"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import type { FormState } from "@/lib/form-state";
import * as prop from "@/lib/proposals";
import { requireRedattore } from "@/lib/session";
import { createProductSchema } from "@/lib/validation/catalog";

const base = z.object({ proposalId: z.uuid() });

async function run(fn: () => Promise<unknown>, ok: string): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof prop.ProposalError) return { error: e.message };
    throw e;
  }
  updateTag("catalog");
  refresh();
  return { ok };
}

export async function approveNewProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { proposalId } = base.parse(Object.fromEntries(formData));
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as FormState["fieldErrors"] };
  let productId = "";
  const res = await run(async () => {
    productId = await prop.approveNewProduct(db, proposalId, parsed.data);
  }, "Accettata: bozza creata.");
  if (res.error) return res;
  // La bozza va controllata e pubblicata dalla sua scheda.
  redirect(`/redazione/catalogo/${productId}`);
}

export async function mergeProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { proposalId } = base.parse(Object.fromEntries(formData));
  const target = z.uuid().safeParse(formData.get("targetProductId"));
  if (!target.success) return { fieldErrors: { targetProductId: ["Scegli il prodotto esistente"] } };
  return run(() => prop.mergeProposal(db, proposalId, target.data), "Unita al prodotto esistente.");
}

export async function applyCorrectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { proposalId } = base.parse(Object.fromEntries(formData));
  return run(() => prop.applyCorrection(db, proposalId), "Modifiche applicate alla scheda.");
}

export async function markCorrectionAppliedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { proposalId } = base.parse(Object.fromEntries(formData));
  return run(() => prop.markCorrectionApplied(db, proposalId), "Segnata come applicata.");
}

export async function rejectProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRedattore();
  const { proposalId } = base.parse(Object.fromEntries(formData));
  return run(() => prop.rejectProposal(db, proposalId), "Rifiutata.");
}
