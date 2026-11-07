"use server";

import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { exportCatalog, importCatalog, type ImportReport } from "@/lib/catalog-transfer";
import { requireRedattore } from "@/lib/session";

/** Dati del catalogo per lo ZIP: le foto le scarica e le aggiunge il browser. */
export async function exportCatalogAction() {
  await requireRedattore();
  return exportCatalog(db);
}

/** Anteprima (`dryRun`) o importazione del `catalogo.json`. Le foto si caricano dopo, una per volta. */
export async function importCatalogAction(json: string, dryRun: boolean): Promise<ImportReport> {
  await requireRedattore();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { created: [], updated: [], errors: [{ slug: "file", message: "Il file non è un JSON valido." }], ids: {} };
  }
  const report = await importCatalog(db, raw, { dryRun });
  if (!dryRun && report.errors.length === 0) {
    updateTag("catalog");
    updateTag("stats");
    refresh();
  }
  return report;
}
