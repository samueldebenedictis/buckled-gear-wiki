# Buckled Gear Wiki

Wiki del materiale da trail running per la community Buckled.

Stack: Next.js 16 (App Router, Cache Components), Postgres, Drizzle ORM, Better Auth, Zod, Vitest + PGlite.

## Sviluppo locale

### Tutto in Docker

```bash
make up      # database + app su http://localhost:3000 (crea .env, migra, fa il seed)
make down    # ferma e rimuove i container, i dati restano
make reset   # cancella anche i dati e riparte da zero
make demo    # aggiunge 8 runner finti con equipaggiamenti e feedback (statistiche e classifiche visibili)
make         # elenco completo (logs, test, psql, shell…)
```

Il codice è montato nel container: le modifiche si vedono subito.

### App sull'host, database in Docker

Serve pnpm.

```bash
pnpm install
cp .env.example .env          # poi genera BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm db:up                    # Postgres 17 in Docker su localhost:5432
pnpm db:migrate               # applica le migrazioni in drizzle/
pnpm db:seed                  # catalogo Sole Survivors + primo redattore
pnpm dev                      # http://localhost:3000
```

Accedi con `SEED_REDATTORE_EMAIL` / `SEED_REDATTORE_PASSWORD` del `.env`: al primo accesso viene chiesto di cambiare password.

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | server di sviluppo |
| `pnpm test` | test (Vitest, database PGlite in memoria: non serve Docker) |
| `pnpm typecheck` / `pnpm lint` | controlli statici |
| `pnpm db:generate` | genera una migrazione dopo aver cambiato `src/db/schema/` |
| `pnpm db:migrate` | applica le migrazioni |
| `pnpm db:seed` | seed idempotente (si può rilanciare) |
| `pnpm db:seed:demo` | runner finti `demoN@buckled.local`, solo sviluppo |
| `pnpm db:studio` | Drizzle Studio per esplorare i dati |
| `pnpm db:reset` | **cancella** il database locale e lo ricrea da zero |

## Struttura

```
drizzle/                 migrazioni SQL generate (0000 abilita pg_trgm)
scripts/                 seed (catalogo + redattore) e seed demo
src/db/schema/           schema Drizzle; src/db/enum-values.ts ha i valori usabili anche nel browser
src/lib/                 logica senza Next, testata con PGlite:
  session.ts             requireUser() / requireRedattore(): unico punto di controllo
  catalog.ts, search.ts  letture pubbliche, filtri e ricerca fuzzy
  categories.ts          campi specifici di ogni categoria (non scarpe): validazione, form, filtri
  guides.ts              guide curate (premi, badge, note)
  stats.ts               aggregati, routing taglia, classifiche (soglia K in config.ts)
  gear.ts, profile.ts    equipaggiamento, feedback, profilo (sempre filtrati per proprietario)
  proposals.ts           proposte e revisione
  admin-*.ts             utenti, catalogo, recensioni (redazione)
src/app/actions/         Server Actions: controllo permessi + validazione Zod + chiamata a src/lib
tests/                   test Vitest
```

## Pagine

| Percorso | Chi |
|---|---|
| `/` ricerca, classifiche, catalogo con filtri · `/scarpe/[slug]` · `/prodotti/[slug]` · `/guide`, `/guide/[slug]` | tutti |
| `/equipaggiamento`, `/proposte`, `/profilo` | utenti |
| `/redazione/catalogo`, `/redazione/guide`, `/redazione/proposte`, `/redazione/utenti` | redazione |

## Note

- Categorie: le scarpe hanno colonne tipizzate (`shoe_specs`) perché alimentano statistiche e filtri; le altre categorie salvano i propri campi in `products.attributes` (jsonb), definiti in `src/lib/categories.ts`. Per aggiungere un campo basta aggiungerlo lì.
- Equipaggiamento, feedback e statistiche della community sono solo per le scarpe.
- Foto prodotto in `public/products/`, **fuori dal repo** (diritti delle immagini): elenco e URL originali in `src/db/seed/images.ts`. Su un clone nuovo la cartella non c'è: si riempie importando uno ZIP del catalogo dalla redazione (Esporta / Importa). Online le foto stanno tutte su Vercel Blob.
- La registrazione è disattivata: gli account li crea la redazione.
- Il ruolo `redattore` non ha il permesso di impersonare utenti, così nessuno vede equipaggiamenti e feedback altrui.
- Le pagine che leggono la sessione stanno dietro `<Suspense>`: con Cache Components leggere cookie o header fuori da un boundary è un errore di build.

## Deploy

Vercel + Neon + Vercel Blob. Build command: `pnpm build:vercel` (migrazioni + build). Variabili d'ambiente in `.env.example`.
