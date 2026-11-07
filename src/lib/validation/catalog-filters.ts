// Filtri del catalogo pubblico, letti dai parametri dell'URL. Un valore non valido
// viene ignorato (nessun errore): l'URL lo può scrivere chiunque.
import { z } from "zod";
import { CATEGORIES, DISTANCE_BANDS, PLATE_TYPES, TERRAINS } from "@/db/enum-values";
import { filterableAttributes } from "@/lib/categories";

export const DROP_RANGES = { basso: [0, 4], medio: [5, 8], alto: [9, 20] } as const;
export const WEIGHT_RANGES = { leggera: [0, 250], media: [251, 300], pesante: [301, 1000] } as const;

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

export const catalogFiltersSchema = z.object({
  /** Testo cercato (ricerca fuzzy su nome e alias). */
  q: optional(z.string().trim().min(2).max(60)),
  tipo: optional(z.enum(CATEGORIES)),
  marca: optional(z.string().regex(/^[a-z0-9-]{1,60}$/)),
  distanza: optional(z.enum(DISTANCE_BANDS)),
  terreno: optional(z.enum(TERRAINS)),
  drop: optional(z.enum(Object.keys(DROP_RANGES) as [keyof typeof DROP_RANGES])),
  peso: optional(z.enum(Object.keys(WEIGHT_RANGES) as [keyof typeof WEIGHT_RANGES])),
  piastra: optional(z.enum(PLATE_TYPES)),
  impermeabile: optional(z.enum(["si", "no"])),
  /** Non è un filtro: "lista" = vista compatta invece delle schede. */
  vista: optional(z.enum(["lista"])),
});

/** Prefisso dei parametri URL dei filtri per attributo, es. ?tipo=zaini&f_poleHolder=faretra */
export const ATTR_PARAM = "f_";

export type CatalogFilters = z.output<typeof catalogFiltersSchema> & {
  /** Filtri sugli attributi della categoria scelta: chiave → valore dell'opzione. */
  attrs?: Record<string, string>;
};

/** Dai searchParams di Next (stringhe o array) ai filtri validi. */
export function parseCatalogFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const first = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== "" && v !== undefined),
  ) as Record<string, string>;
  const base: CatalogFilters = catalogFiltersSchema.parse(first);
  if (base.tipo && base.tipo !== "scarpe") {
    const attrs: Record<string, string> = {};
    for (const { def, options } of filterableAttributes(base.tipo)) {
      const v = first[ATTR_PARAM + def.key];
      if (v && options.some(([o]) => o === v)) attrs[def.key] = v;
    }
    if (Object.keys(attrs).length) base.attrs = attrs;
  }
  return base;
}

export const hasFilters = (f: CatalogFilters) =>
  Object.entries(f).some(([k, v]) =>
    k === "vista" ? false : k === "attrs" ? Object.keys(v ?? {}).length > 0 : v !== undefined,
  );
