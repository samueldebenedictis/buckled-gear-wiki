// Valori degli enum senza dipendenze: importabili anche dai Client Components.
export const ROLES = ["utente", "redattore"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = [
  "scarpe",
  "zaini",
  "fasce",
  "idratazione",
  "apparel",
  "eyewear",
  "cuffie",
  "tech",
  "accessori",
] as const;
export type Category = (typeof CATEGORIES)[number];
/** Taglie sempre US, come sull'etichetta: uomo e donna sono scale diverse. */
export const SIZE_SYSTEMS = ["US_M", "US_W"] as const;
/** Taglie US selezionabili: 3 … 16 a mezzi numeri. */
export const US_SIZES = Array.from({ length: 27 }, (_, i) => String(3 + i / 2));
export const DISTANCE_BANDS = ["20k", "50k", "100k", "100M"] as const;
export const TERRAINS = [
  "strada",
  "sterrato",
  "collinare",
  "singletrack",
  "tecnico",
  "fango",
  "roccia",
  "neve",
] as const;
export const PLATE_TYPES = ["nessuna", "rock_plate", "carbonio", "altro"] as const;
export const GEAR_STATUSES = ["in_uso", "dismessa"] as const;
export const REVIEW_STATUSES = ["bozza", "pubblicata"] as const;
/** Stato di un prodotto del catalogo: le bozze non compaiono in pubblico. */
export const PRODUCT_STATUSES = ["bozza", "pubblicato"] as const;
export const MEDIA_KINDS = ["youtube", "spotify", "foto"] as const;
export const PROPOSAL_KINDS = ["nuovo_prodotto", "correzione"] as const;
export const PROPOSAL_STATUSES = ["in_attesa", "approvata", "rifiutata", "unita"] as const;

export const FIT_FIELDS = ["fitLength", "fitWidth", "fitVolume"] as const;
export const SCORE_FIELDS = [
  "heelHold",
  "durability",
  "comfort",
  "cushioning",
  "stability",
  "gripDry",
  "gripWet",
] as const;

export type FitField = (typeof FIT_FIELDS)[number];
export type ScoreField = (typeof SCORE_FIELDS)[number];
