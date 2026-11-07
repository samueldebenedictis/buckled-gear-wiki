import type { ReactNode } from "react";

/**
 * Riquadro apribile come gli accordion di buckled.it ("the why" delle guide):
 * scheda bordata, titolo in Unbounded, "+" che ruota in "×". Senza JavaScript.
 */
export function Accordion({
  title,
  open,
  children,
}: {
  title: ReactNode;
  /** Aperto al caricamento (es. dopo un errore di validazione). */
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-display text-[17px] leading-tight font-black uppercase [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden className="text-2xl leading-none transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-black p-5 dark:border-white/30">{children}</div>
    </details>
  );
}
