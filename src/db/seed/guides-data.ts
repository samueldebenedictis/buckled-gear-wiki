// Contenuto delle guide di buckled.it al 06/11/2026:
// - https://buckled.it/guida-attrezzatura/ (aggiornata a ottobre 2026)
// - https://buckled.it/guida-eyewear/ (dicembre 2024)
// - https://buckled.it/guida-door-to-trail/ (maggio 2026)
// Solo dati presenti sulle pagine. Le note sono testi originali; dove la pagina
// non li espone come testo (eyewear, door to trail) restano vuote. I badge sono
// ricavati dalle icone e dalla legenda di ogni guida.
import type { Category } from "@/db/enum-values";

type Attr = Record<string, string | number | boolean>;
type Link = { kind: "youtube" | "spotify"; url: string; startS?: number };

export type SeedGuideItem = {
  category: Category;
  brand: string;
  model: string;
  version?: string;
  displayName?: string;
  priceEur?: number;
  attributes?: Attr;
  shoe?: {
    dropMm?: number;
    stackHeelMm?: number;
    stackForeMm?: number;
    weightG?: number;
    lugMm?: number;
    upper?: string;
    midsole?: string;
    outsole?: string;
    fitNote?: string;
    terrains?: ("strada" | "sterrato" | "collinare" | "singletrack")[];
  };
  award?: string;
  badges?: string[];
  note?: string;
  links?: Link[];
};

export type SeedGuide = {
  slug: string;
  title: string;
  sourceUrl: string;
  updatedOn: string;
  intro: string;
  /** "the why" della pagina originale, in Markdown. */
  why?: string;
  items: SeedGuideItem[];
};

const YT_ATTREZZATURA = "https://youtu.be/WRqP0AM6M2Q";
const yt = (t?: number): Link => ({ kind: "youtube", url: YT_ATTREZZATURA, startS: t });
const YT_HYDRATION: Link = { kind: "youtube", url: "https://www.youtube.com/watch?v=yjV-cUgpWx0" };
const sp = (id: string): Link => ({ kind: "spotify", url: `https://open.spotify.com/episode/${id}` });

const attrezzatura: SeedGuide = {
  slug: "guida-attrezzatura",
  title: "Guida attrezzatura",
  sourceUrl: "https://buckled.it/guida-attrezzatura/",
  updatedOn: "2026-10-01",
  intro:
    "La selezione di attrezzatura testata dalla redazione di Buckled. Non copre in modo esaustivo tutto ciò che offre il mercato.",
  why: "Cos’è questa pagina? È una raccolta ragionata di attrezzatura che negli anni è passata da Buckled. Alcuni prodotti li abbiamo raccontati in puntate audio, altri in video, spesso all’interno di episodi a cui oggi è difficile risalire. L’idea nasce quindi con due obiettivi semplici: creare un archivio (necessariamente parziale) di quello che abbiamo provato nel tempo e raccogliere prodotti che fanno ancora parte della nostra quotidianità o che, negli anni, sono diventati le nostre scelte di riferimento.\n\nCosa non vuole essere questa pagina? Non vuole essere la guida definitiva al trail running.\n\nÈ semplicemente una selezione curata, personale e pratica, costruita sull’esperienza e su ciò che negli anni abbiamo davvero usato, testato e apprezzato.",
  items: [
    // --- Zaini
    {
      category: "zaini", brand: "Salomon", model: "ADV Skin", version: "12",
      attributes: { weightG: 293, liters: 12, sizes: "XS → XL", waterCapacity: "Sacca idrica da 1,5 l / 2 flask da 500 ml", bladderCompatible: true, poleHolder: "faretra", adjustable: true },
      links: [yt(938)],
    },
    {
      category: "zaini", brand: "Asics", model: "Fujitrail Vest",
      attributes: { weightG: 137, liters: 7, sizes: "XS → L", waterCapacity: "2 flask da 500 ml", adjustable: true },
    },
    {
      category: "zaini", brand: "Kailas", model: "FUGA Air Pro", version: "11",
      attributes: { weightG: 230, liters: 11, sizes: "S/M/L", waterCapacity: "2 flask da 500 ml", poleHolder: "laccio", adjustable: true },
      note: "Sistema di regolazione frontale tramite dial",
      links: [yt(3723)],
    },
    {
      category: "zaini", brand: "Dynafit", model: "Ultra", version: "12",
      attributes: { weightG: 190, liters: 12, sizes: "XS/S - M/L - XL", waterCapacity: "Sacca idrica da 1,5 l / 2 flask da 500 ml", bladderCompatible: true, poleHolder: "laccio", adjustable: true },
    },
    {
      category: "zaini", brand: "Black Diamond", model: "Distance", version: "4",
      attributes: { weightG: 330, liters: 4, sizes: "S/M/L", waterCapacity: "2 flask da 500 ml", poleHolder: "laccio" },
      links: [yt(4280)],
    },
    {
      category: "zaini", brand: "Patagonia", model: "Slope Vest", version: "3",
      attributes: { weightG: 175, liters: 3, sizes: "XS/S/M/L", waterCapacity: "2 flask da 500 ml", poleHolder: "laccio", adjustable: true },
      links: [yt(4505)],
    },
    {
      category: "zaini", brand: "Compressport", model: "Ultrun S Pack Evo", version: "10",
      attributes: { weightG: 117, liters: 10, sizes: "XS → XL", waterCapacity: "2 flask da 500 ml", poleHolder: "laccio", adjustable: true },
      note: "Laccetti di fitting in zona ascella. Potrebbero non piacere a tutti",
      links: [yt(4785)],
    },
    {
      category: "zaini", brand: "Dynafit", model: "DNA", version: "8",
      attributes: { weightG: 150, liters: 8, sizes: "XS/S - M/L - XL", waterCapacity: "2 flask da 500 ml", poleHolder: "faretra", adjustable: true },
      links: [yt(2271)],
    },
    {
      category: "zaini", brand: "Camelbak", model: "Apex Pro Vest",
      attributes: { weightG: 353, liters: 12, sizes: "XS → L", waterCapacity: "2 flask da 500 ml", bladderCompatible: true, poleHolder: "faretra", adjustable: true, techNotes: "Tecnologie integrate: Recco" },
      note: "Viene venduto con la faretra (che è ripiegabile in una tasca posteriore dello zaino)",
      links: [sp("4oPQx8KSZyeyU7J8ssjeFa"), yt(2720)],
    },
    {
      category: "zaini", brand: "Salomon", model: "S/LAB Ultra", version: "10",
      attributes: { weightG: 130, liters: 10, sizes: "2XS → 2XL", waterCapacity: "2 flask da 500 ml", poleHolder: "faretra", adjustable: true },
      note: "Faretra da acquistare a parte",
      links: [sp("4oPQx8KSZyeyU7J8ssjeFa"), yt(1567)],
    },
    {
      category: "zaini", brand: "Scott", model: "RC Pro TR'", version: "10",
      attributes: { weightG: 146, liters: 10, sizes: "XS → L/XL", waterCapacity: "Sacca idrica da 1,5 l / 2 flask da 500 ml", bladderCompatible: true, poleHolder: "entrambi" },
    },
    // --- Fasce e cinture
    {
      category: "fasce", brand: "Naked", model: "Running Band",
      attributes: { weightG: 62, liters: 2, sizes: "Basate sul girovita", waterCapacity: "3 flask da 500 ml", poleHolder: "laccio" },
      note: "Al posto che usare le classiche taglie (S->L) usa la taglia del girovita per avere un fit perfetto. Ha un attacco per il pettorale sul fronte. Tre scompartimenti totali.",
      links: [YT_HYDRATION],
    },
    {
      category: "fasce", brand: "Compressport", model: "Free Belt",
      attributes: { weightG: 60, sizes: "XS/S - M/L - XL/2XL", waterCapacity: "1 flask da 500 ml" },
    },
    {
      category: "fasce", brand: "Kiprun", model: "Marsupio idrico running", version: "900",
      attributes: { weightG: 93, sizes: "XS/S - M/L - XL/2XL", waterCapacity: "1 flask da 500 ml", poleHolder: "laccio", adjustable: true },
      note: "A fronte di un buon prezzo, forse una fascia che alla lunga ha le tasche non propriamente dimensionate rispetto al normale uso giornaliero",
      links: [YT_HYDRATION],
    },
    {
      category: "fasce", brand: "Camelbak", model: "Ultra Belt",
      attributes: { weightG: 82, liters: 3, sizes: "XS/S - S/M - M/L", waterCapacity: "1 flask da 500 ml", poleHolder: "laccio" },
      note: "Fascia \"vecchia scuola\" ma se non viene aggiornata da tempo un motivo c'è: funziona. Non ha materiali _flashy_ ma fa il suo.",
      links: [YT_HYDRATION],
    },
    {
      category: "fasce", brand: "Asics", model: "Fujitrail Belt",
      attributes: { sizes: "S/M/L", waterCapacity: "2 flask da 500 ml", poleHolder: "laccio" },
      links: [sp("56tLM9dgcM0CrtcmXj0twP")],
    },
    {
      // Sulla pagina originale è nel gruppo "fasce" (comparisonGroups), pur con scheda da zaino.
      category: "fasce", brand: "Raide", model: "LF", version: "2L",
      attributes: { weightG: 156, liters: 2, sizes: "XS → XL", waterCapacity: "1 flask da 650 ml (inclusa)", poleHolder: "laccio", techNotes: "Peso riferito alla taglia M" },
      links: [sp("56tLM9dgcM0CrtcmXj0twP")],
    },
    // --- Idratazione
    {
      category: "idratazione", brand: "Nathan", model: "QuickSqueeze Plus",
      attributes: { capacityMl: 532, sizes: "Unica" },
      note: "Hard pass! Se il vostro pensiero è “non trovo la speeddraw, ma questa è disponibile” non compratela.",
      links: [sp("2qYl262m1S7F72YZvYaqrW"), YT_HYDRATION],
    },
    {
      category: "idratazione", brand: "Nathan", model: "SpeedDraw Plus Insulated",
      attributes: { weightG: 110, capacityMl: 535, insulated: true, sizes: "Unica" },
      note: "OG. L’assoluto pinnacolo delle borracce a mano. Non facile da trovare (mercato americano incluso). Fit molto stretto, ma si smolla con l’uso.",
      links: [sp("6wuy9KBXFmHGzjavApC7R2"), YT_HYDRATION],
    },
    {
      category: "idratazione", brand: "Camelbak", model: "Quick Grip Chill Insulated",
      attributes: { weightG: 50, capacityMl: 620, insulated: true, sizes: "Unica" },
      note: "Handgrip meno preciso di Nathan, ma comunque funzionale. Alessandro ha modificato il suo in modo da avere il thumb-rest",
      links: [YT_HYDRATION],
    },
    {
      category: "idratazione", brand: "Hydrapak", model: "Skyflask Speed",
      attributes: { capacityMl: 500, sizes: "Unica" },
      links: [YT_HYDRATION],
    },
    {
      category: "idratazione", brand: "Salomon", model: "Active",
      attributes: { weightG: 56, capacityMl: 500, sizes: "Unica" },
      note: "L’handheld preferita di Marcello",
      links: [sp("2qYl262m1S7F72YZvYaqrW"), YT_HYDRATION],
    },
    {
      category: "idratazione", brand: "Amphipod", model: "Hydraform Ergo Minimalist",
      attributes: { weightG: 110, capacityMl: 565, insulated: false, sizes: "Unica" },
      note: "Molto molto minimale, ma fa il suo lavoro ed è comoda in mano. Non insulated e meno solida della speeddraw.",
      links: [sp("6wuy9KBXFmHGzjavApC7R2"), YT_HYDRATION],
    },
    // --- Abbigliamento
    {
      category: "apparel", brand: "Scott", model: "Endurance SL", version: "Giacca 130 g",
      attributes: { garment: "giacca", weightG: 130, sizes: "S → XXL", fabric: "Pertex® Shield", waterproofMm: 20000, breathability: 20000 },
      note: "Ripiegabili nella tasca interna. Le zip laterali facilitano l'indossabilità",
    },
    {
      category: "apparel", brand: "Scott", model: "Endurance SL", version: "Giacca 145 g",
      attributes: { garment: "giacca", weightG: 145, sizes: "S → XXL", fabric: "Pertex® Shield", waterproofMm: 20000, breathability: 20000, technologies: "Recco®" },
      note: "La giacca ha due aperture sul petto all'altezza dello zaino per facilitare l'uso delle flask. Ha un soffietto elastico sulla schiena per accomodare lo zaino.",
    },
    {
      category: "apparel", brand: "Scott", model: "Endurance SL", version: "Top",
      attributes: { garment: "antivento", weightG: 48, sizes: "S → XL", fabric: "Pertex® Quantum Air" },
      note: "Ventina leggerissima che si richiude all'interno di una tasca posta sul colletto",
    },
    {
      category: "apparel", brand: "Scott", model: "Endurance Warm",
      attributes: { garment: "maglia", weightG: 195, sizes: "S → XXL", techNotes: "Fori passa-pollice su entrambe le maniche. Apertura per l'orologio sulla manica sinistra" },
    },
    {
      category: "apparel", brand: "Montane", model: "Minimus Lite",
      attributes: { garment: "giacca", weightG: 237, sizes: "S → 3XL", waterproofMm: 20000, breathability: 10000 },
      note: "Brand non facile da trovare, ma una giacca eccellente per quanto riguarda il rapporto qualità/prezzo. È la go-to di Alessandro da ormai 6 anni e sembra ancora nuova",
    },
    {
      category: "apparel", brand: "Asics", model: "Fujitrail Elite SS Top",
      attributes: { garment: "maglia", sizes: "XS → XXL", technologies: "Actibreeze" },
      note: "Actibreeze. Migliora la traspirabilità e ti mantiene fresco.",
    },
    {
      category: "apparel", brand: "Dynafit", model: "Alpine",
      attributes: { garment: "giacca", weightG: 200, sizes: "S → XXL", waterproofMm: 20000, breathability: 20000 },
      note: "È presente una zip nastrata a tutta schiena per alloggiare sotto la giacca lo zaino",
    },
    {
      category: "apparel", brand: "Dynafit", model: "Sovraguanti DNA",
      attributes: { garment: "guanti", weightG: 20, sizes: "XS/S - M/L" },
      note: "La parte di moffola è apribile in modo da avere le mani eventualmente libere",
    },
    {
      category: "apparel", brand: "Wild Tee", model: "White Canyon",
      attributes: { garment: "giacca", weightG: 128, sizes: "XS → XL", waterproofMm: 10000, breathability: 10000 },
      note: "Iperleggera e comprimibile nella tasca presente sulla manica. Disponibile anche in nero.",
    },
    // --- Occhiali (Julbo Intensity Reactiv è anche nella guida eyewear)
    {
      category: "eyewear", brand: "Julbo", model: "Intensity Reactiv",
      attributes: { weightG: 19, sizes: "Unica", lensName: "Reactive 0-3", lensType: "fotocromatica", lensCategory: "0-3", lensFilter: "15-100%", base: 5, noseFit: "Fisso", temples: "Fisse", prescription: "no" },
    },
    {
      category: "eyewear", brand: "Rudy Project", model: "Astral Sphere",
      attributes: { weightG: 28, sizes: "Unica", lensName: "ImpactX", lensType: "fotocromatica", lensCategory: "1-3", lensFilter: "16-75%", noseFit: "Regolabile", temples: "Fisse" },
    },
    {
      category: "eyewear", brand: "Rudy Project", model: "Spinshield Pro",
      attributes: { weightG: 30, lensName: "RP Optic", lensType: "specchiata", lensCategory: "3", lensFilter: "15%", noseFit: "Regolabile", temples: "Fisse" },
    },
    {
      category: "eyewear", brand: "Julbo", model: "Faster",
      attributes: { weightG: 19, sizes: "M/L/XL", lensName: "REACTIV", lensType: "fotocromatica", lensCategory: "0-3", lensFilter: "15-87%", noseFit: "Aggiustabile", temples: "Fisse" },
    },
    // --- Tech
    {
      category: "tech", brand: "Suunto", model: "Race", version: "2",
      attributes: { weightG: 76, sizes: "Unica", batteryH: 55, display: "AMOLED", connectivity: "Bluetooth", charging: "USB magnetica", techNotes: "Cassa da 49 mm. Autonomia in modalità GNSS tutti i sistemi + multi-banda" },
      note: "Iperversatile e con un processore molto veloce, specie nella gestione delle mappe. Il tutto supportato da quella che è forse la migliore app tra i vari brand. Ha pecche che possono derivare da un uso personale (es: gestione dell'attrezzatura), ma per il resto è ampiamente promosso.",
      links: [sp("0Gs6LL6rsVbsYciixnbJVv"), { kind: "youtube", url: "https://youtu.be/G7ZjiG7iGTE" }],
    },
    {
      category: "tech", brand: "Coros", model: "Heart Rate Monitor",
      attributes: { weightG: 19, sizes: "Unica (18-32 cm)", batteryH: 38, connectivity: "Bluetooth", charging: "USB magnetica" },
    },
    {
      category: "tech", brand: "Coospo", model: "HW807",
      attributes: { weightG: 19, sizes: "Unica", batteryH: 20, connectivity: "Bluetooth, Ant+", charging: "USB magnetica" },
      note: "Alternativa economica alla fascia di Coros. Testata e consigliata da chi vive in un mondo di numeri.",
    },
    // --- Cuffie
    {
      category: "cuffie", brand: "Suunto", model: "Wing",
      attributes: { weightG: 33, sizes: "Unica", batteryH: 10, ipRating: "IP67", techNotes: "Controlli sia tramite pulsante che con movimenti della testa" },
      note: "Vengono vendute con un powerbank che raddoppia di fatto la durata della batteria. Ha luci led di segnalazione sui lati ma che inficiano la durata della batteria.",
      links: [sp("4zkDBYynfQhuv4Q0ge4IeM")],
    },
    {
      category: "cuffie", brand: "Shokz", model: "OpenRun Pro",
      attributes: { weightG: 29, sizes: "Mini/Standard", batteryH: 10, ipRating: "IP55", techNotes: "Ricarica rapida" },
      note: "Sacrificando un po' di batteria, le OpenRun (non pro) sono IP67 (quindi maggiore resistenza ad acqua e sudore) e costano meno",
      links: [sp("4zkDBYynfQhuv4Q0ge4IeM")],
    },
    {
      category: "cuffie", brand: "Apple", model: "EarPods USB-C",
      attributes: { weightG: 8, sizes: "Unica", connectivity: "USB-C" },
      note: "Costano 19 euro e non funzionano a batteria. Sono LA scelta per le gare lunghe. Deve piacere il fit, ma sono the absolute OG.",
      links: [sp("4zkDBYynfQhuv4Q0ge4IeM")],
    },
    // --- Accessori
    {
      category: "accessori", brand: "Nescafe", model: "Gold",
      attributes: { techNotes: "Varietà: Arabica. Intensità: 6. Tazze: 50. Cold brew: sì" },
      note: "Il segreto dietro ogni puntata del podcast e la linfa vitale di ogni coverage sul campo.",
      links: [sp("56tLM9dgcM0CrtcmXj0twP")],
    },
  ],
};

const lens = (type: string, cat: string, filter?: string) => ({
  lensType: type,
  lensCategory: cat,
  ...(filter ? { lensFilter: filter } : {}),
});

const eyewear: SeedGuide = {
  slug: "guida-eyewear",
  title: "Guida eyewear",
  sourceUrl: "https://buckled.it/guida-eyewear/",
  updatedOn: "2024-12-01",
  intro: "Gli occhiali da trail running testati dalla redazione di Buckled.",
  items: [
    {
      category: "eyewear", brand: "Aveo", model: "Cornea", priceEur: 199,
      attributes: { weightG: 28, lensName: "V3DO", ...lens("fotocromatica", "0-2"), base: 5, noseFit: "Intercambiabile (2 taglie)", temples: "Fisse", prescription: "no" },
      badges: ["nightvision", "it's a wrap"],
    },
    {
      category: "eyewear", brand: "Julbo", model: "Frequency Reactiv", priceEur: 214,
      attributes: { weightG: 23, lensName: "Reactive 1-3", ...lens("fotocromatica", "1-3", "17-75%"), base: 5, noseFit: "Fisso", temples: "Fisse", prescription: "si" },
      badges: ["multitool"],
    },
    {
      category: "eyewear", brand: "Julbo", model: "Intensity Reactiv", priceEur: 224,
      attributes: { weightG: 19, sizes: "Unica", lensName: "Reactive 0-3", ...lens("fotocromatica", "0-3", "15-100%"), base: 5, noseFit: "Fisso", temples: "Fisse", prescription: "no" },
      badges: ["peso piuma", "nightvision"],
    },
    {
      category: "eyewear", brand: "Julbo", model: "Intensity Spectron HD", priceEur: 159,
      attributes: { weightG: 23, lensName: "Spectron HD3", ...lens("statica", "3", "15%"), base: 5, noseFit: "Fisso", temples: "Fisse", prescription: "no" },
      badges: ["strobo lens", "Big Steppa"],
    },
    {
      category: "eyewear", brand: "Julbo", model: "Ultimate Reactiv", priceEur: 224,
      attributes: { weightG: 27, lensName: "Reactive High Contrast 1-3", ...lens("fotocromatica", "1-3", "13-72%"), base: 6, noseFit: "Regolabile", temples: "Adattabili", prescription: "si_clip" },
      badges: ["multitool", "transformer"],
    },
    {
      category: "eyewear", brand: "Julbo", model: "Ultimate Cover", priceEur: 249,
      attributes: { weightG: 31, lensName: "Reactive 2-4", ...lens("fotocromatica", "0-4", "7-100%"), base: 6, noseFit: "Regolabile", temples: "Adattabili", prescription: "clip" },
      badges: ["nightvision", "transformer"],
    },
    {
      category: "eyewear", brand: "Oakley", model: "Bisphæra", priceEur: 188,
      attributes: { weightG: 29, lensName: "Prizm Field", ...lens("statica", "3", "17%"), base: 5, noseFit: "Intercambiabile (2 taglie)", temples: "Fisse", prescription: "si" },
      badges: ["turbo runner", "strobo lens"],
    },
    {
      category: "eyewear", brand: "Oakley", model: "Sphæra", priceEur: 264,
      attributes: { weightG: 33, lensName: "Prizm Black Polarized", ...lens("polarizzata", "3", "11%"), base: 6, noseFit: "Intercambiabile (2 taglie)", temples: "Fisse", prescription: "no" },
      badges: ["heavyweight", "turbo runner"],
    },
    {
      category: "eyewear", brand: "Oakley", model: "Corridor", priceEur: 214,
      attributes: { weightG: 29, lensName: "Prizm Road", ...lens("statica", "3", "20%"), base: 5, noseFit: "Intercambiabile (2 taglie)", temples: "Fisse", prescription: "no" },
      badges: ["weekend warrior"],
    },
    {
      category: "eyewear", brand: "Oakley", model: "Corridor SQ", priceEur: 214,
      attributes: { weightG: 28, lensName: "Prizm Sapphire", ...lens("statica", "3", "12%"), base: 5, noseFit: "Intercambiabile (2 taglie)", temples: "Fisse", prescription: "no" },
      badges: ["weekend warrior"],
    },
    {
      category: "eyewear", brand: "Rudy Project", model: "Astral X", priceEur: 139,
      attributes: { weightG: 28, lensName: "RP Optic", ...lens("specchiata", "3", "15%"), base: 6, noseFit: "Regolabile", temples: "Fisse", prescription: "clip" },
      badges: ["multitool", "Big Steppa"],
    },
    {
      category: "eyewear", brand: "Rudy Project", model: "Rydon", priceEur: 195,
      attributes: { weightG: 26, lensName: "ImpactX", ...lens("fotocromatica", "1-3", "9-74%"), base: 8, noseFit: "Regolabile", temples: "Adattabili", prescription: "si_clip" },
      badges: ["oldschool", "king of stamina"],
    },
    {
      category: "eyewear", brand: "Rudy Project", model: "Turbolence", priceEur: 269,
      attributes: { weightG: 29, lensName: "ImpactX Laser Red", ...lens("fotocromatica", "1-3", "16-75%"), base: 7, noseFit: "Regolabile", temples: "Fisse", prescription: "si_clip" },
      badges: ["b1g doll4h", "it's a wrap"],
    },
    {
      category: "eyewear", brand: "Smith", model: "Reverb", priceEur: 190,
      attributes: { weightG: 26, lensName: "Chromapop Ignitor + Chromapop Bronze Mirror", lensType: "intercambiabili", lensCategory: "1 (fotocromatica) / 3 (polarizzata)", base: 5, noseFit: "Regolabile a scatti", temples: "Fisse", prescription: "no" },
      badges: ["transformer"],
    },
  ],
};

const doorToTrail: SeedGuide = {
  slug: "guida-door-to-trail",
  title: "Guida door to trail",
  sourceUrl: "https://buckled.it/guida-door-to-trail/",
  updatedOn: "2026-05-01",
  intro:
    "Scarpe per uscire di casa e arrivare sul sentiero: asfalto, gravel e sterrati facili. Solo modelli testati dalla redazione, la guida non è esaustiva.",
  why: "*Road to trail / door to trail / city trail*: se anni fa con questa definizione era abbastanza semplice trasmettere l’idea dietro un prodotto pensato per allenarsi su terreno ‘misto’, negli ultimi tempi i confini della categoria si sono fatti meno precisi. Partire dalla porta di casa non sempre significa desiderare un prodotto ‘basico’ in grado di donare gran poco in termini di cushioning, o sacrificare la qualità dei materiali in favore della versatilità: molti brand hanno esplorato le ‘nicchie’ all’interno del mondo allenamento e abbiamo pensato fosse ora di metterle assieme in una guida pratica alle diverse possibilità per le così dette ‘daily trainer’ in fatto di door to trail.\n\nAl di là dell’estensiva puntata che si trova su YouTube (che trovate linkata poco sotto), questo compendio serve a lasciare una traccia scritta sui prodotti, riassumendone le specifiche-chiave e dando qualche nota di colore alla *Buckled* con diversi premi e badge in base agli highlights della scarpa.\n\nAbbiamo dato dei voti (da considerarsi *relativi* al batch di test e non assoluti rispetto al mercato), riassumendo le caratteristiche dei prodotti in:\n\n- **Fit**: come veste la scarpa in termini di true-to-size e comfort/precisione calzata;\n- **Intersuola**: il mix di cushioning e reattività dato dal pacchetto midsole;\n- **Stabilità**: come la piattaforma d’appoggio e la tomaia lavorano assieme per tenere in asse gli atterraggi;\n- **Grip**: *probabilmente non serve spiegarlo.*",
  items: [
    {
      category: "scarpe", brand: "Altra", model: "Wild Experience", version: "3+", priceEur: 150,
      shoe: { dropMm: 4, stackHeelMm: 32, stackForeMm: 28, weightG: 320, upper: "Mesh", midsole: "Ego P35", outsole: "Vibram Megagrip con Traction Lug", fitNote: "True to size", terrains: ["sterrato", "collinare", "singletrack"] },
      award: "Jack of all trades", badges: ["overqualified", "heavyweight"],
    },
    {
      category: "scarpe", brand: "Dynafit", model: "Trail", priceEur: 160,
      shoe: { dropMm: 6, stackHeelMm: 33, stackForeMm: 27, weightG: 260, lugMm: 4, upper: "Mesh di jacquard riciclato", midsole: "Speedlite", outsole: "Vibram XS Trek con lugs da 4 mm", fitNote: "Aumentare di mezzo numero (ma anche TTS, va a gusto)", terrains: ["strada", "sterrato"] },
      award: "Durability", badges: ["Glove fit", "king of stamina"],
    },
    {
      category: "scarpe", brand: "Hoka", model: "Challenger", version: "8", priceEur: 150,
      shoe: { dropMm: 8, stackHeelMm: 42, stackForeMm: 34, weightG: 287, lugMm: 4, upper: "Mesh riciclato (rPET)", midsole: "EVA sagomato a compressione", outsole: "Proprietaria con lugs da 4 mm", fitNote: "True to size", terrains: ["strada", "sterrato"] },
      award: "Swiss Ball", badges: ["Oldschool", "easy going"],
    },
    {
      category: "scarpe", brand: "Kiprun", model: "Kipsummit Max", priceEur: 139,
      shoe: { dropMm: 6, stackHeelMm: 38, stackForeMm: 32, weightG: 280, lugMm: 4, upper: "Mesh ingegnerizzato", midsole: "ATPU", outsole: "Vibram Megagrip con lugs da 4 mm", fitNote: "True to size", terrains: ["sterrato", "collinare", "singletrack"] },
      award: "Range", badges: ["easy going", "el cheapo"],
    },
    {
      category: "scarpe", brand: "Mount to Coast", model: "H1", priceEur: 170,
      shoe: { dropMm: 6, stackHeelMm: 35, stackForeMm: 29, weightG: 242, upper: "Jacquard + woven fabric rinforzata con fibre di aramide", midsole: "CircleCELL", outsole: "Versagrip", fitNote: "True to size", terrains: ["strada", "sterrato"] },
      award: "Cruiser", badges: ["Scordo", "fashionista"],
      note: "Sul nostro canale di YouTube c'è una review completa di H1 registrata per Sole Survivors.",
    },
    {
      category: "scarpe", brand: "Nnormal", model: "Cadì", priceEur: 150,
      shoe: { dropMm: 6, stackHeelMm: 35, stackForeMm: 29, weightG: 275, lugMm: 4, upper: "Mesh con TPU", midsole: "EVA supercritica", outsole: "Vibram Megagrip con lugs da 4 mm", fitNote: "True to size", terrains: ["sterrato", "collinare", "singletrack"] },
      award: "Long Run", badges: ["Scordo", "overqualified"],
    },
    {
      category: "scarpe", brand: "Salomon", model: "Aero Glide", version: "4 GRVL", priceEur: 160,
      shoe: { dropMm: 8, stackHeelMm: 41, stackForeMm: 33, weightG: 276, upper: "Mesh 3D", midsole: "optiFOAM²", outsole: "Gravel contaGRIP con lugs da 2,5 mm", fitNote: "True to size", terrains: ["strada", "sterrato"] },
      award: "Comfort", badges: ["Healer", "fashionista"],
    },
    {
      category: "scarpe", brand: "Scarpa", model: "Golden Gate LT", priceEur: 129.95,
      shoe: { dropMm: 6, stackHeelMm: 30, stackForeMm: 24, weightG: 300, upper: "Mesh con inserti in TPU", midsole: "EVA + 20% Pebax", outsole: "Presa", fitNote: "Diminuire di mezza taglia (o fidarsi della taglia US)", terrains: ["collinare", "singletrack"] },
      award: "Affordability", badges: ["el cheapo", "king of stamina"],
    },
    {
      category: "scarpe", brand: "VJ", model: "Fuzion Tempo", priceEur: 179,
      shoe: { dropMm: 6, stackHeelMm: 34, stackForeMm: 28, weightG: 240, lugMm: 3, upper: "Mesh ingegnerizzato", midsole: "SuperFOAMance (Nylon + TPEE + EVA)", outsole: "Proprietaria con lugs da 3 mm", fitNote: "True to size", terrains: ["strada", "sterrato", "singletrack"] },
      award: "Fast & Light", badges: ["B1g doll4h", "turbo runner"],
    },
  ],
};

export const seedGuides: SeedGuide[] = [attrezzatura, eyewear, doorToTrail];

/** Badge delle legende delle guide, suggeriti nel form della redazione (sempre in minuscolo). */
export const BADGE_SUGGESTIONS = [
  "b1g doll4h", "big steppa", "easy going", "el cheapo", "fashionista", "glove fit", "healer", "heavyweight",
  "it's a wrap", "king of stamina", "multitool", "nightvision", "oldschool", "overqualified", "peso piuma",
  "scordo", "strobo lens", "transformer", "turbo runner", "weekend warrior",
];
