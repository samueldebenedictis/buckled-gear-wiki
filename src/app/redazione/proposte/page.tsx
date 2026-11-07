import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalSummary } from "@/components/proposal-summary";
import { db } from "@/db";
import { listAllProducts } from "@/lib/gear";
import { hasChanges } from "@/lib/correction";
import { currentValues, listQueue } from "@/lib/proposals";
import { requireRedattore } from "@/lib/session";
import type { CorrectionPayload, NewProductPayload } from "@/lib/validation/proposal";
import { CorrectionReview, NewProductReview } from "./review-forms";
import { PAGE_WIDE, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Proposte · Redazione" };

export default function ProposalsQueuePage() {
  return (
    <main className={PAGE_WIDE}>
      <h1 className={pageTitleClass}>Coda proposte</h1>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  await requireRedattore();
  const [queue, products] = await Promise.all([listQueue(db), listAllProducts(db)]);
  // Valori attuali delle schede da correggere, per mostrare "da → a".
  const current = new Map(
    await Promise.all(
      queue
        .filter((q) => q.proposal.kind === "correzione" && q.proposal.productId)
        .map(async (q) => [q.proposal.id, await currentValues(db, q.proposal.productId!)] as const),
    ),
  );
  return (
    <>
      {queue.length ? (
        <ul className="flex flex-col gap-4">
          {queue.map((row) => (
            <li key={row.proposal.id} className="flex flex-col gap-4 card p-4">
              <ProposalSummary row={row} proposer={row.proposer} admin current={current.get(row.proposal.id) ?? undefined} />
              {row.proposal.kind === "nuovo_prodotto" ? (
                <NewProductReview
                  proposalId={row.proposal.id}
                  payload={row.proposal.payload as NewProductPayload}
                  products={products}
                />
              ) : (
                <CorrectionReview
                  proposalId={row.proposal.id}
                  structured={hasChanges((row.proposal.payload as CorrectionPayload).changes)}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-zinc-500">Nessuna proposta in attesa. Quelle decise si eliminano.</p>
      )}
    </>
  );
}
