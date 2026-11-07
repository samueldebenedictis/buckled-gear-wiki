// Campi specifici per categoria (tutte tranne le scarpe, che hanno `shoe_specs`).
// I valori stanno in `products.attributes` (jsonb). Da queste definizioni nascono
// validazione, form della redazione, scheda pubblica e filtri del catalogo.
// Nessuna dipendenza server: si importa anche nei Client Components.
import { z } from "zod";
import type { Category } from "@/db/enum-values";

type Base = { key: string; label: string; hint?: string };
export type AttrDef = Base &
  (
    | { type: "int" | "decimal"; unit?: string; min: number; max: number; ranges?: Record<string, [number, number, string]> }
    | { type: "text"; max?: number }
    | { type: "bool"; filter?: boolean }
    | { type: "enum"; options: Record<string, string>; filter?: boolean }
  );

const weight: AttrDef = {
  key: "weightG",
  label: "Peso",
  type: "int",
  unit: "g",
  min: 1,
  max: 3000,
};
const sizes: AttrDef = { key: "sizes", label: "Taglie", type: "text", max: 60, hint: "Es. XS → XL, Unica" };
const water: AttrDef = { key: "waterCapacity", label: "Capacità idrica", type: "text", max: 120, hint: "Es. 2 flask da 500 ml" };
const poles: AttrDef = {
  key: "poleHolder",
  label: "Porta bastoncini",
  type: "enum",
  options: { nessuno: "Nessuno", laccio: "Con laccio", faretra: "Con faretra", entrambi: "Laccio e faretra" },
  filter: true,
};
const adjustable: AttrDef = { key: "adjustable", label: "Regolabile", type: "bool" };
const techNotes: AttrDef = { key: "techNotes", label: "Note tecniche", type: "text", max: 500 };
const battery: AttrDef = {
  key: "batteryH",
  label: "Autonomia",
  type: "int",
  unit: "ore",
  min: 0,
  max: 2000,
  hint: "Vuoto se non ha batteria",
};
const connectivity: AttrDef = { key: "connectivity", label: "Connettività", type: "text", max: 80 };

export const CATEGORY_ATTRIBUTES: Record<Exclude<Category, "scarpe">, AttrDef[]> = {
  zaini: [
    weight,
    {
      key: "liters",
      label: "Capacità",
      type: "decimal",
      unit: "l",
      min: 0,
      max: 60,
      ranges: { piccolo: [0, 5, "fino a 5 l"], medio: [5.1, 10, "5–10 l"], grande: [10.1, 60, "oltre 10 l"] },
    },
    sizes,
    water,
    { key: "bladderCompatible", label: "Compatibile con sacca idrica", type: "bool", filter: true },
    poles,
    adjustable,
    techNotes,
  ],
  fasce: [
    weight,
    { key: "liters", label: "Capacità", type: "decimal", unit: "l", min: 0, max: 10 },
    sizes,
    water,
    poles,
    adjustable,
    techNotes,
  ],
  idratazione: [
    weight,
    {
      key: "capacityMl",
      label: "Capacità",
      type: "int",
      unit: "ml",
      min: 0,
      max: 5000,
      ranges: { piccola: [0, 500, "fino a 500 ml"], grande: [501, 5000, "oltre 500 ml"] },
    },
    { key: "insulated", label: "Termica", type: "bool", filter: true },
    sizes,
    techNotes,
  ],
  apparel: [
    {
      key: "garment",
      label: "Capo",
      type: "enum",
      options: { giacca: "Giacca", antivento: "Antivento", maglia: "Maglia", guanti: "Guanti", altro: "Altro" },
      filter: true,
    },
    weight,
    sizes,
    { key: "fabric", label: "Tessuto", type: "text", max: 80 },
    {
      key: "waterproofMm",
      label: "Impermeabilità",
      type: "int",
      unit: "mm H₂O",
      min: 0,
      max: 100_000,
      ranges: { no: [0, 0, "non impermeabile"], media: [1, 15_000, "fino a 15.000"], alta: [15_001, 100_000, "oltre 15.000"] },
    },
    { key: "breathability", label: "Traspirabilità", type: "int", unit: "g/m²/24h", min: 0, max: 100_000 },
    { key: "technologies", label: "Tecnologie", type: "text", max: 120 },
    techNotes,
  ],
  eyewear: [
    weight,
    sizes,
    { key: "lensName", label: "Lente", type: "text", max: 80 },
    {
      key: "lensType",
      label: "Tipo di lente",
      type: "enum",
      options: {
        fotocromatica: "Fotocromatica",
        statica: "Statica",
        polarizzata: "Polarizzata",
        specchiata: "Specchiata",
        intercambiabili: "Lenti intercambiabili",
      },
      filter: true,
    },
    { key: "lensCategory", label: "Categoria lente", type: "text", max: 40, hint: "Es. 1-3" },
    { key: "lensFilter", label: "Filtro", type: "text", max: 40, hint: "Es. 17-75%" },
    { key: "base", label: "Base", type: "int", min: 1, max: 10 },
    { key: "noseFit", label: "Nasello", type: "text", max: 40 },
    { key: "temples", label: "Aste", type: "text", max: 40 },
    {
      key: "prescription",
      label: "Lenti graduate",
      type: "enum",
      options: { no: "No", si: "Sì", clip: "Solo con clip", si_clip: "Sì, anche con clip" },
      filter: true,
    },
  ],
  cuffie: [
    weight,
    sizes,
    battery,
    { key: "ipRating", label: "Protezione acqua/polvere", type: "text", max: 10, hint: "Es. IP67" },
    connectivity,
    techNotes,
  ],
  tech: [
    weight,
    sizes,
    battery,
    { key: "display", label: "Display", type: "text", max: 40 },
    connectivity,
    { key: "charging", label: "Ricarica", type: "text", max: 60 },
    techNotes,
  ],
  accessori: [weight, sizes, techNotes],
};

export function attributeDefs(category: Category): AttrDef[] {
  return category === "scarpe" ? [] : CATEGORY_ATTRIBUTES[category];
}

export type Attributes = Record<string, string | number | boolean>;

/** Schema Zod per i campi di una categoria, dal form HTML (tutto stringhe) ai valori tipizzati. */
export function attributesSchema(category: Category) {
  const shape: Record<string, z.ZodType> = {};
  for (const d of attributeDefs(category)) {
    const empty = (v: unknown) => v === "" || v === undefined || v === null;
    if (d.type === "int" || d.type === "decimal") {
      let n = z.number({ error: "Deve essere un numero" }).min(d.min, `Minimo ${d.min}`).max(d.max, `Massimo ${d.max}`);
      if (d.type === "int") n = n.int("Deve essere un numero intero");
      shape[d.key] = z.preprocess((v) => (empty(v) ? undefined : Number(String(v).replace(",", "."))), n.optional());
    } else if (d.type === "text") {
      shape[d.key] = z.preprocess(
        (v) => (empty(v) ? undefined : v),
        z.string().trim().max(d.max ?? 200, `Massimo ${d.max ?? 200} caratteri`).optional(),
      );
    } else if (d.type === "bool") {
      shape[d.key] = z.preprocess(
        (v) => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined),
        z.boolean().optional(),
      );
    } else if (d.type === "enum") {
      const keys = Object.keys(d.options) as [string, ...string[]];
      shape[d.key] = z.preprocess(
        (v) => (empty(v) ? undefined : v),
        z.enum(keys).optional(),
      );
    }
  }
  // Solo i campi compilati finiscono nel jsonb.
  return z
    .object(shape)
    .transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Attributes);
}

/** Valore leggibile di un attributo, es. "293 g", "Sì", "Con faretra". */
export function formatAttribute(d: AttrDef, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (d.type === "bool") return v ? "Sì" : "No";
  if (d.type === "enum") return d.options[String(v)] ?? String(v);
  if (d.type === "int" || d.type === "decimal") {
    const n = Number(v).toLocaleString("it-IT", { maximumFractionDigits: 1 });
    return d.unit ? `${n} ${d.unit}` : n;
  }
  return String(v);
}

export type AttrFilter = { def: AttrDef; options: [string, string][] };

/** Filtri del catalogo per una categoria: enum/bool marcati `filter`, numeri con fasce. */
export function filterableAttributes(category: Category): AttrFilter[] {
  const out: AttrFilter[] = [];
  for (const d of attributeDefs(category)) {
    if (d.type === "enum" && d.filter) out.push({ def: d, options: Object.entries(d.options) });
    else if (d.type === "bool" && d.filter) out.push({ def: d, options: [["true", "Sì"], ["false", "No"]] });
    else if ((d.type === "int" || d.type === "decimal") && d.ranges) {
      out.push({ def: d, options: Object.entries(d.ranges).map(([k, [, , l]]) => [k, l]) });
    }
  }
  return out;
}

/** URL pubblico di un prodotto. */
export function productUrl(category: Category, slug: string) {
  return category === "scarpe" ? `/scarpe/${slug}` : `/prodotti/${slug}`;
}
