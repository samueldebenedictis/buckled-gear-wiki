// Proposte degli utenti e loro revisione. Una proposta decisa si elimina: restano
// solo quelle in attesa.
// - Nuovo prodotto: resta una proposta con tutti i dati che il runner conosce. Se la
//   redazione la accetta diventa una bozza nel catalogo, da controllare e pubblicare.
// - Correzione: modifiche ai campi della scheda (e/o una nota), che la redazione applica.
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  models,
  productAliases,
  products,
  proposals,
  shoeSpecs,
  user,
} from "@/db/schema";
import type { Attributes } from "./categories";
import {
  CatalogError,
  createProduct,
  defaultDisplayName,
  getProductAdmin,
  saveAttributes,
  saveSpecs,
} from "./admin-catalog";
import { hasChanges } from "./correction";
import { pgError, PG_UNIQUE_VIOLATION } from "./pg-error";
import type { CreateProductInput, SpecsInput } from "./validation/catalog";
import type {
  CorrectionChanges,
  CorrectionPayload,
  NewProductPayload,
} from "./validation/proposal";

export class ProposalError extends Error {}

export async function proposeNewProduct(
  db: Db,
  userId: string,
  payload: NewProductPayload,
) {
  const [p] = await db
    .insert(proposals)
    .values({ proposerId: userId, kind: "nuovo_prodotto", payload })
    .returning({ id: proposals.id });
  return p.id;
}

export async function proposeCorrection(
  db: Db,
  userId: string,
  productId: string,
  payload: CorrectionPayload,
) {
  if (!payload.note && !hasChanges(payload.changes)) {
    throw new ProposalError(
      "Non hai cambiato nessun campo né scritto una nota.",
    );
  }
  const [exists] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, "pubblicato")));
  if (!exists) throw new ProposalError("Prodotto non trovato.");
  const [p] = await db
    .insert(proposals)
    .values({ proposerId: userId, kind: "correzione", productId, payload })
    .returning({ id: proposals.id });
  return p.id;
}

const listCols = {
  proposal: proposals,
  productName: products.displayName,
  productSlug: products.slug,
  productStatus: products.status,
  productCategory: models.category,
};

export async function listOwnProposals(db: Db, userId: string) {
  return db
    .select(listCols)
    .from(proposals)
    .leftJoin(products, eq(products.id, proposals.productId))
    .leftJoin(models, eq(models.id, products.modelId))
    .where(eq(proposals.proposerId, userId))
    .orderBy(desc(proposals.createdAt));
}

export async function listQueue(db: Db) {
  return db
    .select({ ...listCols, proposer: user.name })
    .from(proposals)
    .innerJoin(user, eq(user.id, proposals.proposerId))
    .leftJoin(products, eq(products.id, proposals.productId))
    .leftJoin(models, eq(models.id, products.modelId))
    .where(eq(proposals.status, "in_attesa"))
    .orderBy(asc(proposals.createdAt));
}

/** Valori attuali della scheda, per confrontarli con una correzione. */
export async function currentValues(db: Db, productId: string) {
  const p = await getProductAdmin(db, productId);
  if (!p) return null;
  return {
    category: p.category,
    product: {
      releaseYear: p.product.releaseYear,
      priceEur: p.product.priceEur,
    },
    specs: p.specs as Record<string, unknown> | null,
    attributes: p.product.attributes as Record<string, unknown>,
  };
}

async function pending(db: Db, id: string) {
  const [p] = await db.select().from(proposals).where(eq(proposals.id, id));
  if (!p) throw new ProposalError("Proposta non trovata.");
  if (p.status !== "in_attesa")
    throw new ProposalError("Proposta già revisionata.");
  return p;
}

/** Una proposta decisa (accettata, unita o rifiutata) si elimina: lo storico non serve. */
async function close(db: Db, id: string) {
  await db
    .delete(proposals)
    .where(and(eq(proposals.id, id), eq(proposals.status, "in_attesa")));
}

/**
 * Accetta la proposta: crea la bozza nel catalogo con i dati proposti (`edited` sono i
 * dati generali eventualmente corretti dal redattore). Si pubblica poi dalla scheda.
 */
export async function approveNewProduct(
  db: Db,
  id: string,
  edited: CreateProductInput,
) {
  const p = await pending(db, id);
  if (p.kind !== "nuovo_prodotto")
    throw new ProposalError("Non è una proposta di nuovo prodotto.");
  const payload = p.payload as NewProductPayload;
  return db.transaction(async (txRaw) => {
    // Stessa API del client: la transazione di createProduct diventa un savepoint.
    const tx = txRaw as unknown as Db;
    let productId: string;
    try {
      productId = await createProduct(tx, edited, { status: "bozza" });
    } catch (e) {
      if (e instanceof CatalogError)
        throw new ProposalError(
          `${e.message} Valuta di unirla al prodotto esistente.`,
        );
      throw e;
    }
    // Specifiche e caratteristiche solo se la categoria non è cambiata.
    if (edited.category === payload.category) {
      if (edited.category === "scarpe" && payload.specs)
        await saveSpecs(tx, productId, payload.specs);
      if (
        edited.category !== "scarpe" &&
        payload.attributes &&
        Object.keys(payload.attributes).length
      ) {
        await saveAttributes(tx, productId, payload.attributes);
      }
    }
    await close(tx, id);
    return productId;
  });
}

/**
 * Unisce la proposta a un prodotto già in catalogo. Il nome
 * proposto diventa un alias, così la prossima ricerca con quel nome trova il prodotto giusto.
 */
export async function mergeProposal(db: Db, id: string, productId: string) {
  const p = await pending(db, id);
  if (p.kind !== "nuovo_prodotto")
    throw new ProposalError("Solo le proposte di nuovo prodotto si uniscono.");
  const [target] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));
  if (!target) throw new ProposalError("Prodotto di destinazione non trovato.");

  const payload = p.payload as NewProductPayload;
  const alias = defaultDisplayName(
    payload.brand,
    payload.model,
    payload.version ?? "",
  );
  if (alias.toLowerCase() !== target.displayName.toLowerCase()) {
    try {
      await db.insert(productAliases).values({ productId, alias });
    } catch (e) {
      // Alias già presente (su questo o un altro prodotto): non è un problema.
      if (pgError(e)?.code !== PG_UNIQUE_VIOLATION) throw e;
    }
  }
  await close(db, id);
}

/** Applica le modifiche proposte alla scheda e chiude la correzione. */
export async function applyCorrection(db: Db, id: string) {
  const p = await pending(db, id);
  if (p.kind !== "correzione" || !p.productId)
    throw new ProposalError("Non è una correzione.");
  const changes = (p.payload as CorrectionPayload).changes;
  if (!hasChanges(changes))
    throw new ProposalError(
      "Nessun campo da applicare: correggi a mano e segnala come applicata.",
    );
  const productId = p.productId;
  await db.transaction(async (txRaw) => {
    const tx = txRaw as unknown as Db;
    const c = changes as CorrectionChanges;
    if (c.product)
      await tx
        .update(products)
        .set(c.product)
        .where(eq(products.id, productId));
    if (c.specs) {
      const specs = c.specs as Partial<SpecsInput>;
      await tx
        .insert(shoeSpecs)
        .values({ productId, ...specs })
        .onConflictDoUpdate({ target: shoeSpecs.productId, set: specs });
    }
    if (c.attributes) {
      const [row] = await tx
        .select({ attributes: products.attributes })
        .from(products)
        .where(eq(products.id, productId));
      const merged: Attributes = { ...row.attributes };
      for (const [k, v] of Object.entries(c.attributes)) {
        if (v === null) delete merged[k];
        else merged[k] = v as string | number | boolean;
      }
      await saveAttributes(tx, productId, merged);
    }
    await close(tx, id);
  });
}

/** Correzione applicata a mano dalla redazione nella scheda prodotto. */
export async function markCorrectionApplied(db: Db, id: string) {
  const p = await pending(db, id);
  if (p.kind !== "correzione") throw new ProposalError("Non è una correzione.");
  await close(db, id);
}

export async function rejectProposal(db: Db, id: string) {
  await pending(db, id);
  await close(db, id);
}
