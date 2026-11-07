// Barre come i voti delle guide di buckled.it (widget progress di Elementor):
// 25 px, riempimento giallo su fondo chiaro, etichetta maiuscola dentro la barra.
import type { ReactNode } from "react";
import type { FitField } from "@/db/enum-values";
import { FIT_CHOICES, fitWord } from "@/lib/labels";
import type { FieldStat } from "@/lib/stats";

const pct = (share: number) => `${Math.round(share * 100)}%`;
const fmt = (n: number, signed = false) =>
  `${signed && n > 0 ? "+" : ""}${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })}`;

export function Insufficient() {
  return <span className="text-sm text-zinc-500">dati insufficienti</span>;
}

const barText = "font-sans text-[11px] leading-[25px] font-black text-black uppercase";

/** Giallo per la community, verde acqua chiaro per la redazione. */
type Tone = "community" | "redazione";
const fill: Record<Tone, string> = { community: "bg-buckled-yellow", redazione: "bg-buckled-teal/30" };

/** Barra con etichetta dentro e valore a destra. `share` 0…1 = lunghezza del riempimento. */
function Bar({
  label,
  value,
  share,
  title,
  tone = "community",
}: {
  label: string;
  value: ReactNode;
  share: number;
  title?: string;
  tone?: Tone;
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      title={title}
      className="relative h-[25px] overflow-hidden bg-buckled-paper"
    >
      <div className={`absolute inset-y-0 left-0 ${fill[tone]}`} style={{ width: pct(share) }} />
      <div className={`relative flex justify-between gap-3 px-[15px] ${barText}`}>
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{value}</span>
      </div>
    </div>
  );
}

/** Voto 1–5: barra lunga quanto la media, distribuzione nel tooltip. */
export function FieldStatRow({ label, stat }: { label: string; stat: FieldStat }) {
  if (!stat) return <EmptyBar label={label} />;
  return (
    <Bar
      label={label}
      value={fmt(stat.avg)}
      share={stat.avg / 5}
      title={stat.distribution.map((d) => `${d.value}: ${pct(d.share)}`).join(" · ")}
    />
  );
}

/** Quota di runner (distanze, terreni, taglie). */
export function ShareBar({ label, share }: { label: string; share: number }) {
  return <Bar label={label} value={pct(share)} share={share} />;
}

function EmptyBar({ label }: { label: string }) {
  return (
    <div className={`flex h-[25px] justify-between gap-3 bg-buckled-paper px-[15px] ${barText}`}>
      <span className="truncate">{label}</span>
      <span className="font-medium text-zinc-500 normal-case">dati insufficienti</span>
    </div>
  );
}

/** Fit: tre caselle con la quota di ciascuna scelta; la prevalente in giallo. */
export function FitStatRow({ label, field, stat }: { label: string; field: FitField; stat: FieldStat }) {
  if (!stat) return <EmptyBar label={label} />;
  const top = fitWord(field, stat.avg);
  return (
    <div className="grid grid-cols-[8rem_repeat(3,minmax(0,1fr))] gap-px max-sm:grid-cols-3">
      <span className={`bg-buckled-paper px-[15px] ${barText} max-sm:col-span-3`}>{label}</span>
      {stat.distribution.map((d) => {
        const choice = FIT_CHOICES[field][d.value + 1];
        return (
          <div
            key={d.value}
            className={`flex h-[25px] justify-between gap-2 px-2.5 ${barText} ${choice === top ? "bg-buckled-yellow" : "bg-buckled-paper"}`}
          >
            <span className="truncate">{choice}</span>
            <span className="tabular-nums">{pct(d.share)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Voto singolo 1–5 della redazione. */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  return <Bar label={label} value={fmt(value)} share={value / 5} tone="redazione" />;
}

/** Scelte multiple della redazione (es. distanze): evidenziate quelle selezionate. */
export function ChoiceRow({ choices, selected }: { choices: readonly string[]; selected: readonly string[] }) {
  return (
    <div className="grid grid-cols-4 gap-px">
      {choices.map((c) => (
        <div
          key={c}
          aria-current={selected.includes(c) ? "true" : undefined}
          className={`h-[25px] px-[15px] ${barText} ${selected.includes(c) ? fill.redazione : "bg-buckled-paper text-zinc-400"}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

/** Fit della redazione: le tre scelte, evidenziata quella data. */
export function FitChoiceRow({ label, field, value }: { label: string; field: FitField; value: number }) {
  return (
    <div className="grid grid-cols-[8rem_repeat(3,minmax(0,1fr))] gap-px max-sm:grid-cols-3">
      <span className={`bg-buckled-paper px-[15px] ${barText} max-sm:col-span-3`}>{label}</span>
      {FIT_CHOICES[field].map((choice, i) => (
        <div
          key={choice}
          aria-current={i - 1 === value ? "true" : undefined}
          className={`h-[25px] px-2.5 ${barText} ${i - 1 === value ? fill.redazione : "bg-buckled-paper text-zinc-400"}`}
        >
          {choice}
        </div>
      ))}
    </div>
  );
}

/** Titoletto delle sezioni statistiche, come i titoli Unbounded del sito. */
export function StatHeading({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-[15px] leading-tight font-black uppercase">{children}</h3>;
}

export { fmt, pct };
