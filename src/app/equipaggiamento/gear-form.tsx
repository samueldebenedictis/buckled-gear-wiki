"use client";

import { addGearAction, deleteGearAction, saveFeedbackAction, updateGearAction } from "@/app/actions/utente";
import { buttonClass, dangerButtonClass, Field, FormMessage, SelectField, inputClass } from "@/components/field";
import { ProductSelect, type SelectableProduct } from "@/components/product-select";
import { ScoreInputs } from "@/components/score-inputs";
import { useFormAction } from "@/components/use-form-action";
import { US_SIZES, type FitField, type ScoreField } from "@/db/enum-values";
import { entries, SIZE_SYSTEM_LABELS, TERRAIN_LABELS } from "@/lib/labels";

const SIZE_OPTIONS = US_SIZES.map((v) => [v, v] as const);

type Gear = {
  id: string;
  productId: string;
  nickname: string | null;
  sizeSystem: string;
  sizeValue: string;
  purchasedOn: string | null;
  retiredOn: string | null;
  km: number;
  privateNote: string | null;
};

export function GearForm({ products, gear }: { products: SelectableProduct[]; gear?: Gear }) {
  const { state, onSubmit, pending } = useFormAction(gear ? updateGearAction : addGearAction);
  const e = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {gear && <input type="hidden" name="gearId" value={gear.id} />}
      <ProductSelect
        name="productId"
        products={products}
        defaultValue={gear?.productId ?? ""}
        errors={e?.productId}
      />
      <Field
        label="Soprannome"
        name="nickname"
        required={false}
        maxLength={40}
        defaultValue={gear?.nickname ?? ""}
        placeholder="es. quelle da gara"
        errors={e?.nickname}
        hint="Facoltativo: serve a distinguere più paia dello stesso modello. Lo vedi solo tu."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Scala"
          name="sizeSystem"
          options={entries(SIZE_SYSTEM_LABELS)}
          defaultValue={gear?.sizeSystem ?? "US_M"}
          errors={e?.sizeSystem}
        />
        <SelectField
          label="Taglia US"
          name="sizeValue"
          options={SIZE_OPTIONS}
          emptyLabel="— scegli —"
          defaultValue={gear?.sizeValue ?? ""}
          errors={e?.sizeValue}
        />
        <Field label="Acquistata il" name="purchasedOn" type="date" required={false} defaultValue={gear?.purchasedOn ?? ""} errors={e?.purchasedOn} />
        <Field label="Km percorsi" name="km" type="number" inputMode="numeric" required={false} min={0} defaultValue={gear ? String(gear.km) : ""} errors={e?.km} />
        <Field label="Dismessa il" name="retiredOn" type="date" required={false} defaultValue={gear?.retiredOn ?? ""} errors={e?.retiredOn} hint="Vuota se la usi ancora" />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Nota privata</span>
        <textarea name="privateNote" rows={2} defaultValue={gear?.privateNote ?? ""} className={inputClass} />
        <span className="text-xs text-zinc-500">La vedi solo tu.</span>
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : gear ? "Salva" : "Aggiungi all'equipaggiamento"}
      </button>
    </form>
  );
}

export function FeedbackForm({
  gearId,
  feedback,
}: {
  gearId: string;
  feedback: (Partial<Record<FitField | ScoreField, number | null>> & { distances: string[]; terrains: string[] }) | null;
}) {
  const { state, onSubmit, pending } = useFormAction(saveFeedbackAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="gearId" value={gearId} />
      <ScoreInputs values={feedback ?? {}} errors={state.fieldErrors} />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Terreni dove la usi</legend>
        <div className="flex flex-wrap gap-4">
          {entries(TERRAIN_LABELS).map(([t, label]) => (
            <label key={t} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="terrains" value={t} defaultChecked={feedback?.terrains.includes(t)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? "Salvataggio…" : "Salva feedback"}
      </button>
    </form>
  );
}

export function DeleteGear({ gearId, name }: { gearId: string; name: string }) {
  const { onSubmit, pending } = useFormAction(deleteGearAction, `Togliere ${name} dall'equipaggiamento? Si perde anche il feedback.`);
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="gearId" value={gearId} />
      <button type="submit" disabled={pending} className={dangerButtonClass}>
        Togli dall&apos;equipaggiamento
      </button>
    </form>
  );
}
