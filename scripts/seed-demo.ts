// SOLO SVILUPPO: crea runner finti con equipaggiamenti e feedback, per vedere statistiche,
// routing taglia e classifiche. Uso: pnpm db:seed:demo (dopo pnpm db:seed).
// Gli utenti demo hanno email demoN@buckled.local e si eliminano da /redazione/utenti.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { createDb } from "@/db/client";
import { gearFeedback, products, user, userGear } from "@/db/schema";
import { createAuth } from "@/lib/auth-config";

if (process.env.NODE_ENV === "production") throw new Error("Seed demo vietato in produzione.");
// Dal proprio computer verso Neon NODE_ENV non è impostato: si controlla anche l'host.
const dbHost = new URL(process.env.DATABASE_URL ?? "postgres://localhost").hostname;
if (!["localhost", "127.0.0.1", "db"].includes(dbHost) && process.env.ALLOW_DEMO_SEED !== "1") {
  throw new Error(`Seed demo bloccato: il database (${dbHost}) non è locale. Se è voluto: ALLOW_DEMO_SEED=1.`);
}

// Generatore deterministico: stessi dati a ogni reset.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const around = (base: number, spread = 1, min = 1, max = 5) =>
  Math.max(min, Math.min(max, Math.round(base + (rnd() * 2 - 1) * spread)));

const SHOES = [
  { slug: "hoka-speedgoat-7", comfort: 4.3, durability: 3.2, sizeOffset: 0.5, km: 650 },
  { slug: "hoka-speedgoat-6", comfort: 4.0, durability: 3.5, sizeOffset: 0, km: 700 },
  { slug: "hoka-tecton-x-4", comfort: 4.1, durability: 2.8, sizeOffset: 0, km: 500 },
  { slug: "la-sportiva-prodigio-pro", comfort: 3.6, durability: 4.0, sizeOffset: 0.5, km: 800 },
  { slug: "norda-001a", comfort: 4.6, durability: 4.7, sizeOffset: 0, km: 1200 },
  { slug: "salomon-s-lab-ultra-glide", comfort: 3.9, durability: 3.4, sizeOffset: 0, km: 600 },
] as const;

async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  try {
    const existing = await db.select({ id: user.id }).from(user).where(like(user.email, "demo%@buckled.local"));
    if (existing.length) {
      console.log(`Dati demo già presenti (${existing.length} utenti). Per rifarli: make reset && make demo.`);
      return;
    }
    const rows = await db.select().from(products).where(inArray(products.slug, SHOES.map((s) => s.slug)));
    const bySlug = new Map(rows.map((p) => [p.slug, p]));
    const auth = createAuth(db, { nextCookies: false });

    for (let i = 1; i <= 8; i++) {
      const { user: u } = await auth.api.createUser({
        body: {
          email: `demo${i}@buckled.local`,
          name: `Runner demo ${i}`,
          password: randomBytes(18).toString("base64url"),
          role: "utente",
        },
      });
      await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, u.id));

      const baseSize = 8.5 + Math.floor(rnd() * 3) * 0.5; // US 8.5 … 9.5
      for (const shoe of SHOES.filter(() => rnd() < 0.7)) {
        const p = bySlug.get(shoe.slug);
        if (!p) continue;
        const retired = rnd() < 0.4;
        const size = baseSize + (rnd() < 0.6 ? shoe.sizeOffset : 0);
        const [g] = await db
          .insert(userGear)
          .values({
            userId: u.id,
            productId: p.id,
            sizeSystem: "US_M",
            sizeValue: String(size),
            purchasedOn: "2025-03-01",
            retiredOn: retired ? "2026-04-01" : null,
            status: retired ? "dismessa" : "in_uso",
            km: retired ? around(shoe.km, 150, 100, 2000) : Math.round(rnd() * 400),
          })
          .returning();
        await db.insert(gearFeedback).values({
          gearId: g.id,
          fitLength: around(0, 0.7, -1, 1),
          fitWidth: around(0, 0.7, -1, 1),
          comfort: around(shoe.comfort),
          durability: around(shoe.durability),
          gripDry: around(4),
          gripWet: around(3.3),
          cushioning: around(3.8),
          stability: around(3.5),
          heelHold: around(3.9),
          distances: (["20k", "50k", "100k", "100M"] as const).filter(() => rnd() < 0.5),
          terrains: (["sterrato", "collinare", "singletrack", "tecnico", "fango"] as const).filter(() => rnd() < 0.45),
        });
      }
    }
    console.log("Creati 8 runner demo con equipaggiamenti e feedback.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
