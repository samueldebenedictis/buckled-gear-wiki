import { DISTANCE_BANDS, type FitField, type ScoreField } from "@/db/enum-values";
import { entries, FIT_CHOICES, FIT_LABELS, SCORE_LABELS } from "@/lib/labels";
import { SelectField } from "./field";

type Values = Partial<Record<FitField | ScoreField, number | null>> & { distances?: readonly string[] };

const SCORE_OPTIONS = ["1", "2", "3", "4", "5"].map((v) => [v, v] as const);

/** Fit corta/stretta–giusta–lunga/larga, voti 1–5 e distanze: stessi campi per feedback utenti e recensioni. */
export function ScoreInputs({
  values = {},
  errors,
}: {
  values?: Values;
  errors?: Record<string, string[] | undefined>;
}) {
  const v = (k: FitField | ScoreField) => (values[k] == null ? "" : String(values[k]));
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Fit rispetto alla tua taglia</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {entries(FIT_LABELS).map(([k, label]) => (
            <SelectField key={k} label={label} name={k} emptyLabel="—" options={FIT_CHOICES[k].map((c, i) => [String(i - 1), c] as const)} defaultValue={v(k)} errors={errors?.[k]} />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Voti (1 pessimo … 5 ottimo)</legend>
        <div className="grid gap-3 sm:grid-cols-4">
          {entries(SCORE_LABELS).map(([k, label]) => (
            <SelectField key={k} label={label} name={k} emptyLabel="—" options={SCORE_OPTIONS} defaultValue={v(k)} errors={errors?.[k]} />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Distanze consigliate</legend>
        <div className="flex flex-wrap gap-4">
          {DISTANCE_BANDS.map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="distances" value={d} defaultChecked={values.distances?.includes(d)} />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
