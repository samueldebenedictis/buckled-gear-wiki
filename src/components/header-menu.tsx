"use client";

// Burger dell'header come su buckled.it: apre sotto la barra un pannello scuro a tutta
// larghezza con le voci in colonne. Si chiude con un clic su un link, fuori o con Esc.
import { type ReactNode, useEffect, useRef, useState } from "react";

export function HeaderMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div ref={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="menu-principale"
        aria-label={open ? "Chiudi il menu" : "Apri il menu"}
        onClick={() => setOpen((o) => !o)}
        className="-mr-2.5 grid size-10 place-items-center text-buckled-green hover:text-black"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        ) : (
          <svg viewBox="0 0 448 512" className="size-5" fill="currentColor" aria-hidden>
            <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z" />
          </svg>
        )}
      </button>
      <div
        id="menu-principale"
        hidden={!open}
        // Un clic su un link (o su "Esci") chiude il pannello.
        onClick={(e) => (e.target as HTMLElement).closest("a, button") && setOpen(false)}
        className="absolute inset-x-0 top-full z-50 border-b border-black bg-buckled-green px-7.5 py-7.5 text-white max-md:py-3.75"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Colonna del pannello: titolo in Unbounded, poi le voci attaccate tra loro,
 * così il filo bianco a sinistra è una linea continua.
 */
export function MenuColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-35 flex-col items-start md:flex-1">
      <p className="mb-1.5 font-display text-[15px] leading-3.75 font-black text-white uppercase">{title}</p>
      {children}
    </div>
  );
}

export const menuItemClass =
  "border-l border-white py-0.5 pl-1.75 text-left text-[14px] leading-4.5 font-semibold text-white hover:text-buckled-yellow";
