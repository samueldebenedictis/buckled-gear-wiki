// Runner finti con equipaggiamenti e feedback, per vedere statistiche, confronto
// taglie e classifiche popolate. Uso (dopo pnpm db:seed):
//   pnpm db:seed:demo            crea i runner demo (se non ci sono già)
//   pnpm db:seed:demo --rimuovi  cancella runner demo, equipaggiamenti e feedback
//   pnpm db:seed:demo --rifai    cancella e ricrea
// I runner demo hanno email demoN@buckled.local e password casuale non salvata:
// nessuno può entrare con quegli account. Su un database remoto serve ALLOW_DEMO_SEED=1.
// Dopo averlo lanciato su Vercel: Redeploy, perché statistiche e classifiche sono in cache.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { createDb, type Db } from "@/db/client";
import { DISTANCE_BANDS, TERRAINS } from "@/db/enum-values";
import { gearFeedback, models, products, shoeSpecs, user, userGear } from "@/db/schema";
import { createAuth } from "@/lib/auth-config";

if (process.env.NODE_ENV === "production") throw new Error("Seed demo vietato dentro l'app in produzione.");
// Dal proprio computer verso Neon NODE_ENV non è impostato: si controlla anche l'host.
const dbHost = new URL(process.env.DATABASE_URL ?? "postgres://localhost").hostname;
if (!["localhost", "127.0.0.1", "db"].includes(dbHost) && process.env.ALLOW_DEMO_SEED !== "1") {
  throw new Error(`Seed demo bloccato: il database (${dbHost}) non è locale. Se è voluto: ALLOW_DEMO_SEED=1.`);
}

const RUNNERS = 30;
const MIN_PER_SHOE = 5; // sopra la soglia di privacy K = 3, così ogni scarpa ha statistiche
const DEMO_EMAIL = "demo%@buckled.local";

// Generatore deterministico: stessi dati a ogni esecuzione.
let state = 42;
const rnd = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const around = (base: number, spread = 0.8) => clamp(Math.round(base + (rnd() * 2 - 1) * spread), 1, 5);

/** Numero stabile da uno slug: ogni scarpa ha il suo carattere a ogni esecuzione. */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 2 ** 32;
}

type Shoe = {
  id: string;
  slug: string;
  stack: number | null;
  lug: number | null;
  waterproof: boolean | null;
  terrains: string[];
};

/** Profilo della scarpa: in parte dalle specifiche, in parte dallo slug. */
function profile(s: Shoe) {
  const h = hash(s.slug);
  const stack = s.stack ?? 32;
  const lug = s.lug ?? 4;
  return {
    // Taglia rispetto al solito: -0.5 (calza grande), 0, +0.5 (calza piccola).
    sizeOffset: h < 0.2 ? -0.5 : h > 0.7 ? 0.5 : 0,
    narrow: hash(`${s.slug}:w`) < 0.3,
    comfort: 3.2 + hash(`${s.slug}:c`) * 1.5,
    durability: 2.8 + hash(`${s.slug}:d`) * 2,
    cushioning: clamp(1.5 + (stack - 20) / 6, 1.5, 4.8),
    stability: clamp(4.6 - (stack - 25) / 8, 2.2, 4.6),
    gripDry: clamp(3 + lug / 3, 3, 4.8),
    gripWet: clamp(2.4 + lug / 3, 2.2, 4.6),
    heelHold: 3.3 + hash(`${s.slug}:h`) * 1.4,
    // Più ammortizzata = distanze più lunghe.
    longBias: clamp((stack - 22) / 16, 0, 1),
    km: Math.round(450 + hash(`${s.slug}:k`) * 700),
    terrains: s.terrains.length ? s.terrains : ["sterrato", "collinare"],
  };
}

const NAMES = [
  "Giulia", "Marco", "Sara", "Luca", "Chiara", "Matteo", "Elena", "Andrea", "Francesca", "Davide",
  "Martina", "Simone", "Alice", "Federico", "Silvia", "Paolo", "Valentina", "Stefano", "Laura", "Nicola",
  "Anna", "Giorgio", "Irene", "Riccardo", "Marta", "Alessio", "Elisa", "Tommaso", "Beatrice", "Filippo",
];
// Nomi alternati donna/uomo: le donne usano la scala US donna.
const isWoman = (i: number) => i % 2 === 0;

async function remove(db: Db) {
  const gone = await db.delete(user).where(like(user.email, DEMO_EMAIL)).returning({ id: user.id });
  // Equipaggiamenti, feedback, sessioni e proposte si cancellano a cascata.
  console.log(`Rimossi ${gone.length} runner demo con equipaggiamenti e feedback.`);
}

async function create(db: Db) {
  const existing = await db.select({ id: user.id }).from(user).where(like(user.email, DEMO_EMAIL));
  if (existing.length) {
    console.log(`Dati demo già presenti (${existing.length} runner). Per rifarli: pnpm db:seed:demo --rifai`);
    return;
  }
  const shoes: Shoe[] = (
    await db
      .select({ p: products, s: shoeSpecs })
      .from(products)
      .innerJoin(models, eq(models.id, products.modelId))
      .leftJoin(shoeSpecs, eq(shoeSpecs.productId, products.id))
      .where(eq(models.category, "scarpe"))
  )
    .filter(({ p }) => p.status === "pubblicato")
    .map(({ p, s }) => ({
      id: p.id,
      slug: p.slug,
      stack: s?.stackHeelMm ?? null,
      lug: s?.lugMm ?? null,
      waterproof: s?.waterproof ?? null,
      terrains: s?.terrains ?? [],
    }));
  if (!shoes.length) throw new Error("Nessuna scarpa pubblicata: lancia prima pnpm db:seed.");

  // Chi usa cosa: 4–8 scarpe a testa, poi si completa finché ogni scarpa ha MIN_PER_SHOE runner.
  const owned: Set<number>[] = Array.from({ length: RUNNERS }, () => new Set());
  for (const set of owned) {
    const n = 4 + Math.floor(rnd() * 5);
    while (set.size < Math.min(n, shoes.length)) set.add(Math.floor(rnd() * shoes.length));
  }
  shoes.forEach((_, si) => {
    while (owned.filter((s) => s.has(si)).length < Math.min(MIN_PER_SHOE, RUNNERS)) {
      const free = owned.filter((s) => !s.has(si));
      pick(free).add(si);
    }
  });

  const auth = createAuth(db, { nextCookies: false });
  let gearCount = 0;
  for (let i = 0; i < RUNNERS; i++) {
    const woman = isWoman(i);
    const { user: u } = await auth.api.createUser({
      body: {
        email: `demo${i + 1}@buckled.local`,
        name: `${NAMES[i % NAMES.length]} (demo)`,
        password: randomBytes(18).toString("base64url"),
        role: "utente",
      },
    });
    await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, u.id));

    // Taglia abituale: donne US 6–8.5, uomini US 8–11.
    const usual = woman ? 6 + Math.floor(rnd() * 6) * 0.5 : 8 + Math.floor(rnd() * 7) * 0.5;
    const wideFoot = rnd() < 0.3;

    for (const si of owned[i]) {
      const shoe = shoes[si];
      const pr = profile(shoe);
      // Il 70% compra la taglia giusta per quella scarpa, gli altri la solita.
      const adjusted = rnd() < 0.7;
      const size = usual + (adjusted ? pr.sizeOffset : 0);
      const fitLength = adjusted || pr.sizeOffset === 0 ? (rnd() < 0.85 ? 0 : pick([-1, 1])) : pr.sizeOffset > 0 ? -1 : 1;
      const fitWidth = pr.narrow && wideFoot ? -1 : rnd() < 0.8 ? 0 : pick([-1, 1]);

      const retired = rnd() < 0.35;
      const year = 2024 + Math.floor(rnd() * 2);
      const month = 1 + Math.floor(rnd() * 12);
      const purchasedOn = `${year}-${String(month).padStart(2, "0")}-01`;
      const km = retired ? Math.round(pr.km * (0.75 + rnd() * 0.5)) : Math.round(rnd() * pr.km * 0.8);

      const [g] = await db
        .insert(userGear)
        .values({
          userId: u.id,
          productId: shoe.id,
          sizeSystem: woman ? "US_W" : "US_M",
          sizeValue: String(size),
          purchasedOn,
          retiredOn: retired ? `${year + 1}-${String(month).padStart(2, "0")}-01` : null,
          status: retired ? "dismessa" : "in_uso",
          km,
        })
        .returning({ id: userGear.id });
      gearCount++;

      // Non tutti compilano tutto: qualche voto resta vuoto.
      const maybe = (v: number) => (rnd() < 0.85 ? v : null);
      const distances = DISTANCE_BANDS.filter((_, d) => rnd() < (d === 0 ? 0.75 : d === 1 ? 0.6 : 0.15 + pr.longBias * 0.55 - d * 0.08));
      const terrains = TERRAINS.filter((t) => rnd() < (pr.terrains.includes(t) ? 0.7 : 0.08));
      await db.insert(gearFeedback).values({
        gearId: g.id,
        fitLength,
        fitWidth,
        fitVolume: maybe(fitWidth === -1 ? pick([-1, 0]) : rnd() < 0.8 ? 0 : pick([-1, 1])),
        comfort: around(pr.comfort),
        durability: maybe(around(pr.durability)),
        cushioning: maybe(around(pr.cushioning)),
        stability: maybe(around(pr.stability)),
        gripDry: maybe(around(pr.gripDry)),
        gripWet: maybe(around(pr.gripWet)),
        heelHold: maybe(around(pr.heelHold)),
        distances: distances.length ? distances : ["20k"],
        terrains,
      });
    }
  }
  console.log(`Creati ${RUNNERS} runner demo con ${gearCount} scarpe e feedback su ${shoes.length} modelli.`);
}

async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const args = process.argv.slice(2);
  try {
    if (args.includes("--rimuovi") || args.includes("--rifai")) await remove(db);
    if (!args.includes("--rimuovi")) await create(db);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
