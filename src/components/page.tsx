// Larghezze delle pagine, uguali per pagine pubbliche e redazione:
// liste e griglie larghe come la home, schede e form più stretti, accesso piccolo.
const base = "mx-auto flex w-full flex-col gap-6 px-4 py-10";

/** Liste e griglie: catalogo, guide, classifiche, equipaggiamento, liste della redazione. */
export const PAGE_WIDE = `${base} max-w-295`;
/** Schede e form: pagina prodotto, proposte, singolo paio, schede della redazione. */
export const PAGE_NARROW = `${base} max-w-3xl`;
/** Accesso e profilo. */
export const PAGE_SMALL = `${base} max-w-md`;

/** Titolo di pagina, uguale ovunque (Unbounded maiuscolo dal tema). */
export const pageTitleClass = "text-3xl leading-tight sm:text-4xl";
