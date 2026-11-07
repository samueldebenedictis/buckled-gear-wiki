"use client";

import {
  addMediaAction,
  createReviewAction,
  deleteReviewAction,
  removeMediaAction,
  updateReviewAction,
} from "@/app/actions/redazione-recensioni";
import {
  buttonClass,
  dangerButtonClass,
  Field,
  FormMessage,
  secondaryButtonClass,
  SelectField,
  inputClass,
} from "@/components/field";
import { ScoreInputs } from "@/components/score-inputs";
import { useFormAction } from "@/components/use-form-action";
import type { AdminReview } from "@/lib/admin-reviews";
import { entries, formatTimestamp, MEDIA_KIND_LABELS, REVIEW_STATUS_LABELS } from "@/lib/labels";

const sectionClass = "flex flex-col gap-4 card p-4";
const textareaClass =
  `${inputClass} font-mono text-sm`;
const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

export function ReviewsSection({ productId, reviews }: { productId: string; reviews: AdminReview[] }) {
  return (
    <section className={sectionClass}>
      <h2 className="text-lg font-semibold">Recensione della redazione</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Mostrata sempre separata dai dati della community. I voti usano le stesse scale del feedback degli utenti.
      </p>
      {reviews.map((r) => (
        <ReviewEditor key={r.id} review={r} />
      ))}
      <details className="border border-dashed border-zinc-300 p-3 dark:border-zinc-700" open={reviews.length === 0}>
        <summary className="cursor-pointer font-medium">
          {reviews.length === 0 ? "Scrivi la recensione" : "Aggiungi un'altra recensione"}
        </summary>
        <div className="mt-4">
          <ReviewForm productId={productId} />
        </div>
      </details>
    </section>
  );
}

function ReviewEditor({ review }: { review: AdminReview }) {
  const del = useFormAction(deleteReviewAction, `Eliminare la recensione "${review.title}" e i suoi link?`);
  const published = review.status === "pubblicata";
  return (
    <details className="card p-3" open>
      <summary className="cursor-pointer">
        <span className="font-medium">{review.title}</span>{" "}
        <span className="text-sm text-zinc-500">
          · {published && review.publishedAt ? `pubblicata il ${dateFmt.format(review.publishedAt)}` : "bozza"}
          {review.author && ` · ${review.author}`}
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-6">
        {/* key: dopo un salvataggio i campi ripartono dai valori aggiornati. */}
        <ReviewForm key={review.updatedAt.getTime()} review={review} />
        <MediaList review={review} />
        <form onSubmit={del.onSubmit}>
          <input type="hidden" name="reviewId" value={review.id} />
          <button type="submit" disabled={del.pending} className={dangerButtonClass}>
            Elimina recensione
          </button>
          <FormMessage state={del.state} />
        </form>
      </div>
    </details>
  );
}

function ReviewForm({ productId, review }: { productId?: string; review?: AdminReview }) {
  const { state, onSubmit, pending } = useFormAction(review ? updateReviewAction : createReviewAction);
  const e = state.fieldErrors;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {review ? (
        <input type="hidden" name="reviewId" value={review.id} />
      ) : (
        <input type="hidden" name="productId" value={productId} />
      )}
      <Field label="Titolo" name="title" defaultValue={review?.title ?? ""} errors={e?.title} />
      <Field
        label="Verdetto"
        name="verdict"
        required={false}
        defaultValue={review?.verdict ?? ""}
        errors={e?.verdict}
        hint="Una frase, compare nella scheda del catalogo"
      />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Testo (Markdown)</span>
        <textarea name="bodyMd" rows={8} defaultValue={review?.bodyMd ?? ""} className={textareaClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Km del test"
          name="kmTested"
          type="number"
          inputMode="numeric"
          required={false}
          defaultValue={review?.kmTested == null ? "" : String(review.kmTested)}
          errors={e?.kmTested}
        />
        <SelectField
          label="Stato"
          name="status"
          options={entries(REVIEW_STATUS_LABELS)}
          defaultValue={review?.status ?? "bozza"}
        />
      </div>

      <ScoreInputs values={{ ...review?.scores, distances: review?.distances }} errors={e} />

      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : review ? "Salva recensione" : "Crea recensione"}
      </button>
    </form>
  );
}

function MediaList({ review }: { review: AdminReview }) {
  const add = useFormAction(addMediaAction);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium">Episodi e media</h3>
      {review.media.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {review.media.map((m) => (
            <MediaRow key={m.id} reviewId={review.id} media={m} />
          ))}
        </ul>
      )}
      <form onSubmit={add.onSubmit} className="grid items-end gap-2 sm:grid-cols-[8rem_1fr_7rem_auto]">
        <input type="hidden" name="reviewId" value={review.id} />
        <SelectField label="Tipo" name="kind" options={entries(MEDIA_KIND_LABELS)} defaultValue="youtube" />
        <Field label="Link" name="url" type="url" placeholder="https://…" errors={add.state.fieldErrors?.url} />
        <Field label="Da (mm:ss)" name="startS" required={false} placeholder="12:30" errors={add.state.fieldErrors?.startS} />
        <button type="submit" disabled={add.pending} className={secondaryButtonClass}>
          Aggiungi
        </button>
      </form>
      <FormMessage state={add.state} />
    </div>
  );
}

function MediaRow({ reviewId, media }: { reviewId: string; media: AdminReview["media"][number] }) {
  const { onSubmit, pending } = useFormAction(removeMediaAction);
  return (
    <li>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="mediaId" value={media.id} />
        <span className="bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{MEDIA_KIND_LABELS[media.kind]}</span>
        <a href={media.url} target="_blank" rel="noopener noreferrer" className="break-all underline">
          {media.url}
        </a>
        {media.startS != null && <span className="text-zinc-500">da {formatTimestamp(media.startS)}</span>}
        <button type="submit" disabled={pending} aria-label="Rimuovi link" className="px-1 text-zinc-500 hover:text-red-600">
          ×
        </button>
      </form>
    </li>
  );
}
