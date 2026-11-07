import Link from "next/link";
import Markdown from "react-markdown";
import { DISTANCE_BANDS, FIT_FIELDS, SCORE_FIELDS } from "@/db/enum-values";
import type { PublicProduct } from "@/lib/catalog";
import { FIT_LABELS, formatTimestamp, MEDIA_KIND_LABELS, SCORE_LABELS } from "@/lib/labels";
import { Award, Badges, markdownClass, type Mention } from "./guide-mentions";
import { ChoiceRow, FitChoiceRow, ScoreBar, StatHeading } from "./stats";

/**
 * "La redazione": guide in cui compare il prodotto e recensioni, in una scheda sola
 * con la stessa struttura dei dati della community (voti, fit, distanze, km).
 */
export function Reviews({ p, mentions }: { p: PublicProduct; mentions: Mention[] }) {
  if (p.reviews.length === 0 && mentions.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">La redazione</h2>
      <div className="flex flex-col gap-6 card p-5">
        {mentions.length > 0 && (
          <div className="flex flex-col gap-3">
            <StatHeading>Nelle guide</StatHeading>
            {mentions.map((m) => (
              <div key={m.slug} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/guide/${m.slug}`} className="font-semibold underline">
                    {m.title}
                  </Link>
                  <Award award={m.award} />
                </div>
                <Badges badges={m.badges} />
                {m.noteMd && (
                  <div className={`text-sm ${markdownClass}`}>
                    <Markdown>{m.noteMd}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {p.reviews.map((r) => (
          <Review key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

function Review({ r }: { r: PublicProduct["reviews"][number] }) {
  const scores = SCORE_FIELDS.filter((k) => r.scores[k] != null);
  const fits = FIT_FIELDS.filter((k) => r.scores[k] != null);
  // Il titolo ("Sole Survivors: <scarpa>") ripete il nome: resta solo nel link al video.
  return (
    <article aria-label={r.title} className="flex flex-col gap-6">
      {r.verdict && <p className="text-lg italic">“{r.verdict}”</p>}
      {r.bodyMd && (
        <div className={markdownClass}>
          <Markdown>{r.bodyMd}</Markdown>
        </div>
      )}
      {scores.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <StatHeading>Voti</StatHeading>
          {scores.map((k) => (
            <ScoreBar key={k} label={SCORE_LABELS[k]} value={r.scores[k]!} />
          ))}
        </div>
      )}
      {fits.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <StatHeading>Fit rispetto alla taglia</StatHeading>
          {fits.map((k) => (
            <FitChoiceRow key={k} label={FIT_LABELS[k]} field={k} value={r.scores[k]!} />
          ))}
        </div>
      )}
      {r.distances.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <StatHeading>Distanze consigliate</StatHeading>
          <ChoiceRow choices={DISTANCE_BANDS} selected={r.distances} />
        </div>
      )}
      {r.kmTested != null && (
        <p className="text-[14px] font-semibold">
          <span className="font-light">Km del test: </span>
          {r.kmTested.toLocaleString("it-IT")} km
        </p>
      )}
      {r.media.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {r.media.map((m) => (
            <li key={m.id}>
              <a href={withStart(m.url, m.startS)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {r.title.split(":")[0]} su {MEDIA_KIND_LABELS[m.kind]}
                {m.startS != null && ` da ${formatTimestamp(m.startS)}`} ▸
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function withStart(url: string, startS: number | null) {
  if (startS == null) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu")) u.searchParams.set("t", String(startS));
    return u.toString();
  } catch {
    return url;
  }
}
