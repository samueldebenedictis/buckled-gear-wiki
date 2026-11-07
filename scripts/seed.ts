// Popola il database locale: catalogo iniziale + primo redattore.
// Uso: pnpm db:seed
import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { user } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import { seedGuidesData } from "@/db/seed/guides";
import { seedProductImages } from "@/db/seed/product-images";
import { createAuth } from "@/lib/auth-config";

async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  try {
    const { created, total } = await seedCatalog(db);
    console.log(`Catalogo: ${created} prodotti creati (${total - created} già presenti).`);
    const g = await seedGuidesData(db);
    console.log(`Guide: ${g.createdProducts} prodotti nuovi, ${g.createdItems} voci di guida aggiunte.`);
    // Le foto locali valgono solo per un database locale: online arrivano da "Importa ZIP" (su Vercel Blob).
    const dbHost = new URL(process.env.DATABASE_URL!).hostname;
    if (["localhost", "127.0.0.1", "db"].includes(dbHost)) {
      console.log(`Foto: ${await seedProductImages(db)} prodotti collegati alla loro immagine.`);
    } else {
      console.log("Foto: database remoto, nessun collegamento. Caricale con Importa ZIP dalla redazione.");
    }

    const email = process.env.SEED_REDATTORE_EMAIL;
    const password = process.env.SEED_REDATTORE_PASSWORD;
    const name = process.env.SEED_REDATTORE_NAME ?? "Redazione";
    if (!email || !password) {
      console.log("SEED_REDATTORE_EMAIL/PASSWORD non impostate: nessun redattore creato.");
      return;
    }
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (existing) {
      console.log(`Redattore ${email} già presente.`);
      return;
    }
    const auth = createAuth(db);
    await auth.api.createUser({ body: { email, password, name, role: "redattore" } });
    console.log(`Redattore creato: ${email} (dovrà cambiare password al primo accesso).`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
