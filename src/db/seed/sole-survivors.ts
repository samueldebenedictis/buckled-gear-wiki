// Le scarpe di Sole Survivors (https://buckled.it/reviews/) al 06/11/2026.
// Solo dati presenti sulla pagina: brand, modello, link al video. Le specifiche
// tecniche si aggiungono dalla redazione.
export type SeedShoe = {
  brand: string;
  model: string;
  /** Vuota se il modello non ha versioni numerate. */
  version?: string;
  /** Nome mostrato, se diverso da "brand model version". */
  displayName?: string;
  aliases?: string[];
  video: string;
};

export const soleSurvivors: SeedShoe[] = [
  { brand: "Hoka", model: "Tecton X", version: "4", video: "https://youtu.be/kOav2T1EyXE" },
  { brand: "Brooks", model: "Cascadia Elite", video: "https://www.youtube.com/watch?v=OTJNFe-YJog" },
  { brand: "VJ", model: "Ultra", version: "3", video: "https://www.youtube.com/watch?v=_pl9ChgxW1I" },
  { brand: "Norda", model: "055", video: "https://youtu.be/nCMdwhMsE_A" },
  { brand: "Kiprun", model: "Kipsummit Max", video: "https://youtu.be/WHoSSCne17o" },
  { brand: "Norda", model: "001A", video: "https://youtu.be/F4QsnsknG4g" },
  {
    brand: "Dynafit",
    model: "Ultra 100",
    version: "3",
    displayName: "Dynafit Ultra 100 V3",
    video: "https://youtu.be/1iMIKbbDQbA",
  },
  {
    brand: "Hoka",
    model: "Speedgoat",
    version: "7",
    aliases: ["sg7", "speedgoat VII", "speed goat 7"],
    video: "https://www.youtube.com/watch?v=rKkaXyviBB0",
  },
  { brand: "Scott", model: "Kinabalu Trail", video: "https://youtu.be/0Ryu4iFVPFc" },
  { brand: "Mount to Coast", model: "H1", video: "https://youtu.be/izB4ipxZvDU" },
  { brand: "Scott", model: "Kinabalu Ultra", video: "https://www.youtube.com/watch?v=e6CNPhpXMZM" },
  { brand: "Mount to Coast", model: "T1", video: "https://www.youtube.com/watch?v=vIvIYRvKXYs" },
  { brand: "Topo", model: "Vista", video: "https://www.youtube.com/watch?v=-q_69RT_jF4" },
  { brand: "Hoka", model: "Rocket X Trail", video: "https://www.youtube.com/watch?v=9BtVDEDGu5Q" },
  { brand: "La Sportiva", model: "Prodigio Max", video: "https://www.youtube.com/watch?v=HZEWQ-MNTtk" },
  { brand: "Altra", model: "Olympus", version: "275", video: "https://www.youtube.com/watch?v=mL9PD9ZqXwY" },
  { brand: "Salomon", model: "S/LAB Ultra Glide", video: "https://www.youtube.com/watch?v=wI5TSEmUmog" },
  { brand: "Satisfy", model: "TheROCKER", video: "https://www.youtube.com/watch?v=2rP0wGhBlZM" },
  { brand: "Scarpa", model: "Spin Ultra", version: "2", video: "https://youtu.be/kSFvDOFnm2s" },
  { brand: "Hoka", model: "Tecton X", version: "3", video: "https://www.youtube.com/watch?v=4tNgbtEqRCs" },
  { brand: "Norda", model: "005", video: "https://www.youtube.com/watch?v=GcAFHS3busw" },
  { brand: "Hoka", model: "Mafate X", video: "https://www.youtube.com/watch?v=QeIOR8_IhaI" },
  { brand: "La Sportiva", model: "Prodigio Pro", video: "https://www.youtube.com/watch?v=epzTctIbX8Q" },
  {
    brand: "Adidas Terrex",
    model: "Agravic Speed Ultra",
    video: "https://www.youtube.com/watch?v=QUg-mojMuRc",
  },
  { brand: "Adidas Terrex", model: "Agravic Speed", video: "https://www.youtube.com/watch?v=QUg-mojMuRc" },
  { brand: "Adidas Terrex", model: "Agravic", version: "3", video: "https://www.youtube.com/watch?v=NNjvGWg2Eys" },
  { brand: "Altra", model: "Mont Blanc Carbon", video: "https://www.youtube.com/watch?v=YR0FeNqdsbo" },
  {
    brand: "Hoka",
    model: "Speedgoat",
    version: "6",
    aliases: ["sg6", "speedgoat VI", "speed goat 6"],
    video: "https://www.youtube.com/watch?v=6SSm5xMwuq4",
  },
  {
    brand: "New Balance",
    model: "Fresh Foam X Hierro",
    version: "8",
    displayName: "New Balance Fresh Foam X Hierro V8",
    aliases: ["hierro v8"],
    video: "https://www.youtube.com/watch?v=hrKsA08DA1I",
  },
  { brand: "La Sportiva", model: "Prodigio", video: "https://www.youtube.com/watch?v=Kr08rxp-cPQ" },
  { brand: "Hoka", model: "Mafate Speed", version: "4", video: "https://www.youtube.com/watch?v=USdDXug2bUE" },
  { brand: "Scarpa", model: "Ribelle Kalibra Run", video: "https://www.youtube.com/watch?v=aB-C9wv5Sh8" },
  {
    brand: "Nike",
    model: "Ultrafly",
    displayName: "Nike Trail Ultrafly",
    video: "https://www.youtube.com/watch?v=Ygk0OpLp8y4",
  },
];
