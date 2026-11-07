// Campi della scheda prodotto, uguali per redazione e runner: specifiche delle
// scarpe e caratteristiche delle altre categorie (da src/lib/categories.ts).
import type { Category } from "@/db/enum-values";
import { attributeDefs, type AttrDef } from "@/lib/categories";
import { entries, PLATE_LABELS, TERRAIN_LABELS } from "@/lib/labels";
import { Field, SelectField } from "./field";

type Errors = Record<string, string[] | undefined> | undefined;

export const str = (v: unknown) => (v == null ? "" : String(v));

/** Prezzo con la virgola, come lo scrive un italiano. */
export const priceStr = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export type SpecsValues = {
  dropMm?: number | null;
  stackHeelMm?: number | null;
  stackForeMm?: number | null;
  weightG?: number | null;
  weightRefSize?: string | null;
  lugMm?: number | null;
  plate?: string | null;
  terrains?: string[];
  waterproof?: boolean | null;
  upper?: string | null;
  midsole?: string | null;
  outsole?: string | null;
  fitNote?: string | null;
};

function Num({ label, name, value, errors }: { label: string; name: string; value?: number | null; errors?: string[] }) {
  return <Field label={label} name={name} type="number" inputMode="numeric" required={false} defaultValue={str(value)} errors={errors} />;
}

/** Anno, sistema di taglia e prezzo. */
export function GeneralFields({
  values,
  errors: e,
}: {
  values?: { releaseYear?: number | null; priceEur?: number | null };
  errors: Errors;
}) {
  return (
    <>
      <Field label="Anno" name="releaseYear" type="number" inputMode="numeric" required={false} defaultValue={str(values?.releaseYear)} errors={e?.releaseYear} />
      <Field label="Prezzo di listino (€)" name="priceEur" inputMode="decimal" required={false} defaultValue={priceStr(values?.priceEur)} errors={e?.priceEur} />
    </>
  );
}

export function SpecsFields({ values: s, errors: e }: { values?: SpecsValues | null; errors: Errors }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Num label="Drop (mm)" name="dropMm" value={s?.dropMm} errors={e?.dropMm} />
        <Num label="Stack tallone (mm)" name="stackHeelMm" value={s?.stackHeelMm} errors={e?.stackHeelMm} />
        <Num label="Stack avampiede (mm)" name="stackForeMm" value={s?.stackForeMm} errors={e?.stackForeMm} />
        <Num label="Peso (g)" name="weightG" value={s?.weightG} errors={e?.weightG} />
        <Field label="Taglia del peso" name="weightRefSize" required={false} defaultValue={str(s?.weightRefSize)} placeholder="US 9" errors={e?.weightRefSize} />
        <Num label="Tasselli (mm)" name="lugMm" value={s?.lugMm} errors={e?.lugMm} />
        <SelectField label="Piastra" name="plate" options={entries(PLATE_LABELS)} emptyLabel="—" defaultValue={s?.plate ?? ""} errors={e?.plate} />
        <Field label="Tomaia" name="upper" required={false} defaultValue={str(s?.upper)} errors={e?.upper} />
        <Field label="Intersuola" name="midsole" required={false} defaultValue={str(s?.midsole)} errors={e?.midsole} />
        <Field label="Suola" name="outsole" required={false} defaultValue={str(s?.outsole)} errors={e?.outsole} />
        <Field label="Vestibilità" name="fitNote" required={false} defaultValue={str(s?.fitNote)} placeholder="True to size" errors={e?.fitNote} />
        <SelectField
          label="Impermeabile"
          name="waterproof"
          options={[["true", "Sì"], ["false", "No"]]}
          emptyLabel="—"
          defaultValue={s?.waterproof == null ? "" : String(s.waterproof)}
          errors={e?.waterproof}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Terreni</legend>
        <div className="flex flex-wrap gap-4">
          {entries(TERRAIN_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="terrains" value={value} defaultChecked={s?.terrains?.includes(value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

/** Caratteristiche delle categorie diverse dalle scarpe. */
export function AttributeFields({
  category,
  values,
  errors,
}: {
  category: Category;
  values?: Record<string, unknown>;
  errors: Errors;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {attributeDefs(category).map((d) => (
        <AttrInput key={d.key} def={d} value={values?.[d.key]} errors={errors?.[d.key]} />
      ))}
    </div>
  );
}

function AttrInput({ def: d, value, errors }: { def: AttrDef; value: unknown; errors?: string[] }) {
  const v = str(value);
  if (d.type === "bool") {
    return <SelectField label={d.label} name={d.key} options={[["true", "Sì"], ["false", "No"]]} emptyLabel="—" defaultValue={v} errors={errors} />;
  }
  if (d.type === "enum") {
    return <SelectField label={d.label} name={d.key} options={Object.entries(d.options)} emptyLabel="—" defaultValue={v} errors={errors} />;
  }
  const numeric = d.type === "int" || d.type === "decimal";
  return (
    <Field
      label={numeric && d.unit ? `${d.label} (${d.unit})` : d.label}
      name={d.key}
      required={false}
      inputMode={numeric ? (d.type === "int" ? "numeric" : "decimal") : undefined}
      defaultValue={numeric ? v.replace(".", ",") : v}
      hint={d.hint}
      errors={errors}
    />
  );
}
