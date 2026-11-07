import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { db } from "@/db";
import { getProductAdmin } from "@/lib/admin-catalog";
import { listReviewsForProduct } from "@/lib/admin-reviews";
import { requireRedattore } from "@/lib/session";
import { AliasesSection, AttributesForm, DangerZone, ImageSection, ProductForm, RenameSection, SpecsForm, StatusBar } from "./product-forms";
import { productUrl } from "@/lib/categories";
import { CATEGORY_LABELS } from "@/lib/labels";
import { ReviewsSection } from "./reviews-section";
import { PAGE_NARROW, pageTitleClass } from "@/components/page";

export const metadata: Metadata = { title: "Prodotto · Redazione" };

export default function ProductAdminPage({ params }: PageProps<"/redazione/catalogo/[id]">) {
  return (
    <main className={PAGE_NARROW}>
      <Link href="/redazione/catalogo" className="text-sm underline">
        ← Catalogo
      </Link>
      <Suspense fallback={<p>Caricamento…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await requireRedattore();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [p, reviews] = await Promise.all([getProductAdmin(db, id), listReviewsForProduct(db, id)]);
  if (!p) notFound();

  return (
    <>
      {p.product.status === "pubblicato" && (
        <Link href={productUrl(p.category, p.product.slug)} className="self-start text-sm underline">
          Vedi la pagina pubblica
        </Link>
      )}
      <h1 className={pageTitleClass}>{p.product.displayName}</h1>
      <StatusBar p={p} />
      {/* key: dopo un salvataggio i campi ripartono dai valori aggiornati. */}
      <ProductForm key={`p-${p.product.updatedAt.getTime()}`} p={p} />
      <ImageSection p={p} />
      <p className="-mt-4 text-sm text-zinc-500">{CATEGORY_LABELS[p.category]}</p>
      {p.category === "scarpe" ? <SpecsForm p={p} /> : <AttributesForm key={`a-${p.product.updatedAt.getTime()}`} p={p} />}
      <ReviewsSection productId={p.product.id} reviews={reviews} />
      <AliasesSection p={p} />
      <RenameSection key={`r-${p.brand}-${p.model}`} p={p} />
      <DangerZone p={p} />
    </>
  );
}
