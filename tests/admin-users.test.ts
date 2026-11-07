import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { products, session, user, userGear } from "@/db/schema";
import { seedCatalog } from "@/db/seed/catalog";
import * as admin from "@/lib/admin-users";
import { createAuth, type Auth } from "@/lib/auth-config";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let auth: Auth;
let ctx: admin.AdminContext;

async function signIn(email: string, password: string) {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") });
}

async function getUser(id: string) {
  const [u] = await db.select().from(user).where(eq(user.id, id));
  return u;
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  auth = createAuth(db, {
    secret: "test-secret-test-secret-test-secret-123",
    baseURL: "http://localhost:3000",
    nextCookies: false,
  });
  const res = await auth.api.createUser({
    body: { email: "red@buckled.it", password: "password-redattore", name: "Red", role: "redattore" },
  });
  // Il redattore ha già cambiato la password temporanea (con quella le API sono bloccate).
  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, res.user.id));
  ctx = { auth, db, headers: await signIn("red@buckled.it", "password-redattore"), actorId: res.user.id };
});
afterAll(() => close());

describe("generateTempPassword", () => {
  it("è lunga abbastanza e senza caratteri ambigui", () => {
    const p = admin.generateTempPassword();
    expect(p).toMatch(/^[a-km-np-z2-9]{4}-[a-km-np-z2-9]{4}-[a-km-np-z2-9]{4}$/);
    expect(new Set(Array.from({ length: 50 }, admin.generateTempPassword)).size).toBe(50);
  });
});

describe("gestione utenti", () => {
  let userId: string;
  let password: string;

  it("crea un utente con password temporanea da cambiare", async () => {
    ({ userId, password } = await admin.createUser(ctx, {
      name: "Ute",
      email: "ute@buckled.it",
      role: "utente",
    }));
    const u = await getUser(userId);
    expect(u.role).toBe("utente");
    expect(u.mustChangePassword).toBe(true);
    await signIn("ute@buckled.it", password);
  });

  it("rifiuta email duplicate", async () => {
    await expect(
      admin.createUser(ctx, { name: "Altro", email: "ute@buckled.it", role: "utente" }),
    ).rejects.toThrow(admin.AdminError);
  });

  it("reset: nuova password, obbligo di cambio, sessioni revocate", async () => {
    await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, userId));
    await signIn("ute@buckled.it", password);

    const reset = await admin.resetPassword(ctx, userId);
    expect(reset.password).not.toBe(password);
    expect((await getUser(userId)).mustChangePassword).toBe(true);
    expect(await db.select().from(session).where(eq(session.userId, userId))).toHaveLength(0);
    await expect(signIn("ute@buckled.it", password)).rejects.toThrow();
    password = reset.password;
    await signIn("ute@buckled.it", password);
  });

  it("sospende e riattiva", async () => {
    await admin.setBanned(ctx, userId, true);
    expect((await getUser(userId)).banned).toBe(true);
    await expect(signIn("ute@buckled.it", password)).rejects.toThrow();
    await admin.setBanned(ctx, userId, false);
    await signIn("ute@buckled.it", password);
  });

  it("promuove e retrocede", async () => {
    await admin.setRole(ctx, userId, "redattore");
    expect((await getUser(userId)).role).toBe("redattore");
    await admin.setRole(ctx, userId, "utente");
    expect((await getUser(userId)).role).toBe("utente");
  });

  it("non permette azioni sul proprio account", async () => {
    for (const p of [
      admin.resetPassword(ctx, ctx.actorId),
      admin.setBanned(ctx, ctx.actorId, true),
      admin.setRole(ctx, ctx.actorId, "utente"),
      admin.deleteUser(ctx, ctx.actorId),
    ]) {
      await expect(p).rejects.toThrow(admin.AdminError);
    }
    expect((await getUser(ctx.actorId)).role).toBe("redattore");
  });

  it("un utente non può usare queste funzioni", async () => {
    const h = await signIn("ute@buckled.it", password);
    const asUser = { ...ctx, headers: h, actorId: userId };
    await expect(
      admin.createUser(asUser, { name: "X", email: "x@buckled.it", role: "redattore" }),
    ).rejects.toThrow();
    await expect(admin.setRole(asUser, ctx.actorId, "utente")).rejects.toThrow();
  });

  it("elimina l'utente insieme al suo equipaggiamento", async () => {
    await seedCatalog(db);
    const [p] = await db.select().from(products).limit(1);
    await db.insert(userGear).values({ userId, productId: p.id, sizeSystem: "US_M", sizeValue: "9" });

    await admin.deleteUser(ctx, userId);
    expect(await getUser(userId)).toBeUndefined();
    expect(await db.select().from(userGear).where(eq(userGear.userId, userId))).toHaveLength(0);
  });

  it("l'elenco non espone dati dell'equipaggiamento", async () => {
    const rows = await admin.listUsers(db);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["createdAt", "email", "id", "mustChangePassword", "name", "role", "banned"].sort(),
    );
  });

  it("cerca per nickname o email, senza maiuscole e con % letterale", async () => {
    expect((await admin.listUsers(db, "RED")).map((u) => u.email)).toContain("red@buckled.it");
    expect((await admin.listUsers(db, "@buckled.it")).length).toBeGreaterThan(0);
    expect(await admin.listUsers(db, "%")).toEqual([]);
    expect(await admin.listUsers(db, "nessuno-così")).toEqual([]);
  });
});
