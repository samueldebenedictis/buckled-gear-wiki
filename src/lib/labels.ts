import type { PLATE_TYPES, SIZE_SYSTEMS, TERRAINS } from "@/db/schema/enums";

export const SIZE_SYSTEM_LABELS: Record<(typeof SIZE_SYSTEMS)[number], string> = {
  US_M: "US uomo",
  US_W: "US donna",
};

export const PLATE_LABELS: Record<(typeof PLATE_TYPES)[number], string> = {
  nessuna: "Nessuna",
  rock_plate: "Rock plate",
  carbonio: "Carbonio",
  altro: "Altro",
};

export const TERRAIN_LABELS: Record<(typeof TERRAINS)[number], string> = {
  strada: "Strada / asfalto",
  sterrato: "Sterrato / gravel",
  collinare: "Collinare",
  singletrack: "Singletrack",
  tecnico: "Tecnico",
  fango: "Fango",
  roccia: "Roccia",
  neve: "Neve",
};

export const entries = <K extends string>(r: Record<K, string>) =>
  Object.entries(r) as [K, string][];

export const FIT_LABELS = {
  fitLength: "Lunghezza",
  fitWidth: "Larghezza",
  fitVolume: "Volume",
} as const;

/** Fit a tre scelte (−1, 0, +1): la lunghezza è corta/lunga, larghezza e volume stretta/larga. */
export const FIT_CHOICES: Record<keyof typeof FIT_LABELS, readonly [string, string, string]> = {
  fitLength: ["Corta", "Giusta", "Lunga"],
  fitWidth: ["Stretta", "Giusta", "Larga"],
  fitVolume: ["Stretta", "Giusta", "Larga"],
};

/** Parola per un valore o una media di fit (la media si arrotonda alla scelta più vicina). */
export const fitWord = (field: keyof typeof FIT_LABELS, v: number) =>
  FIT_CHOICES[field][Math.max(-1, Math.min(1, Math.round(v))) + 1];

export const SCORE_LABELS = {
  heelHold: "Tenuta tallone",
  durability: "Durata",
  comfort: "Comfort",
  cushioning: "Ammortizzazione",
  stability: "Stabilità",
  gripDry: "Grip asciutto",
  gripWet: "Grip bagnato",
} as const;

export const MEDIA_KIND_LABELS = { youtube: "YouTube", spotify: "Spotify", foto: "Foto" } as const;

export const REVIEW_STATUS_LABELS = { bozza: "Bozza", pubblicata: "Pubblicata" } as const;

export function formatTimestamp(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}


export const GEAR_STATUS_LABELS = { in_uso: "In uso", dismessa: "Dismessa" } as const;

export const PROPOSAL_KIND_LABELS = { nuovo_prodotto: "Nuovo prodotto", correzione: "Correzione" } as const;


export function formatSize(system: keyof typeof SIZE_SYSTEM_LABELS, value: string) {
  return `${SIZE_SYSTEM_LABELS[system]} ${value}`;
}

// Stessi nomi delle sezioni della guida attrezzatura di buckled.it.
export const CATEGORY_LABELS = {
  scarpe: "Scarpe",
  zaini: "Zaini",
  fasce: "Fasce",
  idratazione: "Idratazione",
  apparel: "Apparel",
  eyewear: "Eyewear",
  cuffie: "Cuffie",
  tech: "Tech",
  accessori: "Accessori",
} as const;

export const DROP_RANGE_LABELS = { basso: "0–4 mm", medio: "5–8 mm", alto: "9 mm e oltre" } as const;

export const WEIGHT_RANGE_LABELS = { leggera: "fino a 250 g", media: "251–300 g", pesante: "oltre 300 g" } as const;
