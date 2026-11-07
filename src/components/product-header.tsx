import type { PublicProduct } from "@/lib/catalog";
import { CATEGORY_LABELS } from "@/lib/labels";
import { formatPrice } from "./product-card";
import { ProductImage } from "./product-image";

/**
 * Testata della pagina prodotto: foto in un riquadro contenuto accanto al nome,
 * sullo stesso sfondo a griglia delle schede del catalogo. Le foto di partenza sono
 * piccole: ingrandirle a tutta pagina le renderebbe sgranate.
 */
export function ProductHeader({ p }: { p: PublicProduct }) {
  const name = p.product.displayName.startsWith(p.brand)
    ? p.product.displayName.slice(p.brand.length).trim()
    : p.product.displayName;
  const meta = [
    p.category !== "scarpe" && CATEGORY_LABELS[p.category],
    p.product.releaseYear,
    p.product.priceEur != null && formatPrice(p.product.priceEur),
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-5 border border-black bg-white shadow-[5px_5px_0_0_#000] sm:flex-row sm:items-stretch sm:gap-0">
      <div className="flex shrink-0 items-center justify-center border-b border-black bg-[url(/bg/gridme.png)] bg-center p-5 sm:w-64 sm:border-r sm:border-b-0 md:w-72">
        <ProductImage
          src={p.product.imagePath}
          alt={p.product.displayName}
          plain
          priority
          sizes="(min-width: 768px) 288px, (min-width: 640px) 256px, 100vw"
          className="h-40 w-full max-w-72 sm:h-44"
        />
      </div>
      <div className="flex flex-col justify-center gap-2 px-5 pb-5 sm:p-6">
        <p className="font-display text-[14px] leading-[21px] font-black text-black uppercase">{p.brand}</p>
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-normal text-black normal-case sm:text-4xl">
          {name}
        </h1>
        {meta.length > 0 && <p className="text-[14px] font-semibold text-black">{meta.join(" · ")}</p>}
      </div>
    </header>
  );
}
