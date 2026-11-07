import Image from "next/image";

/**
 * Foto prodotto su fondo chiaro, come le schede delle guide di buckled.it.
 * Senza foto mostra un riquadro vuoto della stessa misura, così la griglia resta allineata.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className = "",
  priority,
  plain,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Senza fondo e senza proporzioni fisse: per la scheda in stile guida. */
  plain?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${plain ? "" : "aspect-[4/3] bg-buckled-paper"} ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${plain ? "" : "p-4"}`} />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-xs text-zinc-400">foto non disponibile</span>
      )}
    </div>
  );
}
