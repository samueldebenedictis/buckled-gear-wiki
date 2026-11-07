// Correzioni strutturate: confronto tra scheda attuale e valori proposti, e testo
// leggibile delle modifiche. Nessuna dipendenza server: si usa anche nei componenti.
import type { Category } from "@/db/enum-values";
import { attributeDefs, formatAttribute } from "./categories";
import { PLATE_LABELS, TERRAIN_LABELS } from "./labels";
import type { CorrectionChanges } from "./validation/proposal";

type Section = keyof CorrectionChanges;
type Values = Record<string, unknown>;

export const PRODUCT_FIELD_LABELS: Record<string, string> = {
  releaseYear: "Anno",
  priceEur: "Prezzo",
};

export const SPEC_LABELS: Record<string, string> = {
  dropMm: "Drop",
  stackHeelMm: "Stack tallone",
  stackForeMm: "Stack avampiede",
  weightG: "Peso",
  weightRefSize: "Taglia del peso",
  lugMm: "Tasselli",
  plate: "Piastra",
  terrains: "Terreni",
  waterproof: "Impermeabile",
  upper: "Tomaia",
  midsole: "Intersuola",
  outsole: "Suola",
  fitNote: "Vestibilità",
};

const SPEC_UNITS: Record<string, string> = { dropMm: "mm", stackHeelMm: "mm", stackForeMm: "mm", weightG: "g", lugMm: "mm" };

/** Valore confrontabile: vuoto = null, liste ordinate. */
function norm(v: unknown): unknown {
  if (v === undefined || v === null || v === "") return null;
  if (Array.isArray(v)) return v.length ? [...v].sort() : null;
  return v;
}

function diffSection(current: Values, proposed: Values, keys: string[]) {
  const out: Record<string, string | number | boolean | string[] | null> = {};
  for (const k of keys) {
    const a = norm(current[k]);
    const b = norm(proposed[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = (b ?? (Array.isArray(current[k]) ? [] : null)) as never;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Solo i campi diversi dalla scheda attuale. */
export function diffChanges(
  category: Category,
  current: { product: Values; specs: Values | null; attributes: Values },
  proposed: { product: Values; specs?: Values; attributes?: Values },
): CorrectionChanges {
  const changes: CorrectionChanges = {};
  const product = diffSection(current.product, proposed.product, Object.keys(PRODUCT_FIELD_LABELS));
  if (product) changes.product = product;
  if (category === "scarpe" && proposed.specs) {
    const specs = diffSection(current.specs ?? {}, proposed.specs, Object.keys(SPEC_LABELS));
    if (specs) changes.specs = specs;
  } else if (proposed.attributes) {
    const keys = attributeDefs(category).map((d) => d.key);
    const attributes = diffSection(current.attributes, proposed.attributes, keys);
    if (attributes) changes.attributes = attributes;
  }
  return changes;
}

export function hasChanges(c: CorrectionChanges | undefined) {
  return !!c && (!!c.product || !!c.specs || !!c.attributes);
}

function formatValue(category: Category, section: Section, key: string, v: unknown): string {
  if (norm(v) === null) return "—";
  if (section === "product") {
    if (key === "priceEur") return `${Number(v).toLocaleString("it-IT")} €`;
    return String(v);
  }
  if (section === "specs") {
    if (key === "plate") return PLATE_LABELS[v as keyof typeof PLATE_LABELS] ?? String(v);
    if (key === "terrains") return (v as string[]).map((t) => TERRAIN_LABELS[t as keyof typeof TERRAIN_LABELS] ?? t).join(", ");
    if (key === "waterproof") return v ? "Sì" : "No";
    return SPEC_UNITS[key] ? `${v} ${SPEC_UNITS[key]}` : String(v);
  }
  const def = attributeDefs(category).find((d) => d.key === key);
  return def ? formatAttribute(def, v) : String(v);
}

function labelOf(category: Category, section: Section, key: string) {
  if (section === "product") return PRODUCT_FIELD_LABELS[key] ?? key;
  if (section === "specs") return SPEC_LABELS[key] ?? key;
  return attributeDefs(category).find((d) => d.key === key)?.label ?? key;
}

export type ChangeRow = { label: string; from?: string; to: string };

/** Righe leggibili "Drop: 5 mm → 4 mm"; `current` (facoltativo) per il valore attuale. */
export function describeChanges(
  category: Category,
  changes: CorrectionChanges,
  current?: { product: Values; specs: Values | null; attributes: Values },
): ChangeRow[] {
  const rows: ChangeRow[] = [];
  for (const section of ["product", "specs", "attributes"] as const) {
    const values = changes[section];
    if (!values) continue;
    const now = current ? (section === "product" ? current.product : section === "specs" ? current.specs ?? {} : current.attributes) : null;
    for (const [key, v] of Object.entries(values)) {
      rows.push({
        label: labelOf(category, section, key),
        from: now ? formatValue(category, section, key, now[key]) : undefined,
        to: formatValue(category, section, key, v),
      });
    }
  }
  return rows;
}
