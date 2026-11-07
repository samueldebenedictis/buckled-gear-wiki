// Pezzi comuni delle liste della redazione (catalogo, guide): intestazione con
// "+ Nuovo", schede di stato con conteggio, indicatori di completezza, etichette.
import Link from "next/link";
import type { ReactNode } from "react";
import { pageTitleClass } from "./page";

/** Titolo della pagina con il tasto che apre (o chiude) il form di creazione sotto. */
export function AdminHeader({
  title,
  newLabel,
  openHref,
  closeHref,
  open,
  children,
}: {
  title: string;
  newLabel: string;
  openHref: string;
  closeHref: string;
  open: boolean;
  /** Il form di creazione, mostrato quando `open`. */
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitleClass}>{title}</h1>
        <Link
          href={open ? closeHref : openHref}
          scroll={false}
          aria-expanded={open}
          className={`border px-4 py-2 text-[13px] font-black tracking-wide uppercase ${
            open
              ? "border-white/60 bg-black text-white hover:bg-zinc-800"
              : "border-buckled-yellow bg-buckled-yellow text-black hover:bg-buckled-orange"
          }`}
        >
          {open ? "× Chiudi" : `+ ${newLabel}`}
        </Link>
      </div>
      {open && (
        <section aria-label={newLabel} className="flex flex-col gap-4 card p-5">
          <h2 className="font-display text-[17px] font-black uppercase">{newLabel}</h2>
          {children}
        </section>
      )}
    </>
  );
}

/** Schede di stato: "Tutti 96 · Pubblicati 65 · Bozze 0 · Incompleti 31". */
export function StatusTabs({ tabs }: { tabs: { label: string; count: number; href: string; active: boolean }[] }) {
  return (
    <nav aria-label="Stato" className="flex flex-wrap border-b border-white/25">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          scroll={false}
          aria-current={t.active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-black uppercase ${
            t.active ? "border-buckled-yellow text-white" : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          {t.label} <span className="font-medium tabular-nums">{t.count}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Riga scura delle liste della redazione (catalogo, guide, utenti). */
export const adminRowClass = "-mt-px flex items-center gap-3 border border-white/25 bg-[#0a0a0a] hover:border-white/50";

/** Quadratini pieni se il dato c'è, vuoti se manca. Nome dei dati nel tooltip e per i lettori di schermo. */
export function Completeness({ checks }: { checks: [label: string, ok: boolean][] }) {
  const missing = checks.filter(([, ok]) => !ok).map(([l]) => l);
  return (
    <ul
      className="flex shrink-0 gap-1"
      title={missing.length ? `Manca: ${missing.join(", ")}` : "Completo"}
      aria-label={missing.length ? `Manca: ${missing.join(", ")}` : "Completo"}
    >
      {checks.map(([label, ok]) => (
        <li key={label} aria-hidden className={`size-2.5 border ${ok ? "border-buckled-yellow bg-buckled-yellow" : "border-white/40"}`} />
      ))}
    </ul>
  );
}

/** Legenda degli indicatori, una volta sopra la lista. */
export function CompletenessLegend({ labels }: { labels: string[] }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
      <span>Indicatori, nell&apos;ordine:</span>
      {labels.map((l, i) => (
        <span key={l}>
          {i + 1}. {l}
        </span>
      ))}
      <span className="flex items-center gap-1">
        · <span className="inline-block size-2.5 bg-buckled-yellow" /> c&apos;è{" "}
        <span className="inline-block size-2.5 border border-white/40" /> manca
      </span>
    </p>
  );
}

export function AdminTag({ children, tone }: { children: ReactNode; tone?: "amber" }) {
  const color = tone === "amber" ? "bg-amber-950 text-amber-300" : "bg-zinc-800 text-zinc-300";
  return <span className={`px-1.5 py-0.5 text-[11px] font-semibold ${color}`}>{children}</span>;
}
