import type { SelectHTMLAttributes } from "react";
import { inputClass } from "./field";

export type SelectableProduct = { id: string; name: string; brand: string };

/** Select del catalogo raggruppata per brand. */
export function ProductSelect({
  products,
  label = "Scarpa",
  errors,
  ...select
}: {
  products: SelectableProduct[];
  label?: string;
  errors?: string[];
  name: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const groups = new Map<string, SelectableProduct[]>();
  for (const p of products) groups.set(p.brand, [...(groups.get(p.brand) ?? []), p]);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <select
        aria-invalid={errors ? true : undefined}
        className={inputClass}
        {...select}
      >
        <option value="">— scegli —</option>
        {[...groups].map(([brand, items]) => (
          <optgroup key={brand} label={brand}>
            {items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {errors?.map((e) => (
        <span key={e} className="text-sm text-red-600">
          {e}
        </span>
      ))}
    </label>
  );
}
