import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { session, user } from "@/db/schema";
import { createAuth, type Auth } from "@/lib/auth-config";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let auth: Auth;

const PASSWORD = "password-temporanea";

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  auth = createAuth(db, {
    secret: "test-secret-test-secret-test-secret-123",
    baseURL: "http://localhost:3000",
    nextCookies: false,
  });
  // Primo redattore, creato lato server come fa lo script di seed; ha già cambiato la password temporanea.
  const red = await auth.api.createUser({
    body: { email: "red@buckled.it", password: PASSWORD, name: "Red", role: "redattore" },
  });
  await passwordChanged(red.user.id);
});

/** Come fa l'app dopo il cambio password: toglie l'obbligo. */
const passwordChanged = (id: string) => db.update(user).set({ mustChangePassword: false }).where(eq(user.id, id));
afterAll(() => close());

/** Fa login e restituisce gli header con il cookie di sessione. */
async function signIn(email: string, password = PASSWORD) {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function status(p: Promise<unknown>) {
  try {
    await p;
    return "OK";
  } catch (e) {
    return (e as { status?: string }).status ?? String(e);
  }
}

describe("registrazione", () => {
  it("è disattivata", async () => {
    expect(
      await status(
        auth.api.signUpEmail({ body: { email: "x@y.it", password: "abcdefghijkl", name: "X" } }),
      ),
    ).toBe("BAD_REQUEST");
  });
});

describe("account creati dalla redazione", () => {
  let redHeaders: Headers;
  let utenteId: string;

  beforeAll(async () => {
    redHeaders = await signIn("red@buckled.it");
    const res = await auth.api.createUser({
      headers: redHeaders,
      body: { email: "ute@buckled.it", password: PASSWORD, name: "Ute", role: "utente" },
    });
    utenteId = res.user.id;
  });

  it("partono con ruolo utente e password da cambiare", async () => {
    const [u] = await db.select().from(user).where(eq(user.id, utenteId));
    expect(u.role).toBe("utente");
    expect(u.mustChangePassword).toBe(true);
  });

  it("con la password temporanea le API sono bloccate, tranne sessione e cambio password", async () => {
    const tmp = await auth.api.createUser({
      headers: redHeaders,
      body: { email: "tmp@buckled.it", password: PASSWORD, name: "Tmp", role: "utente" },
    });
    const h = await signIn("tmp@buckled.it");
    expect(await status(auth.api.updateUser({ headers: h, body: { name: "Altro" } }))).toBe("FORBIDDEN");
    expect(await status(auth.api.listSessions({ headers: h }))).toBe("FORBIDDEN");
    expect(await status(auth.api.getSession({ headers: h }))).toBe("OK");
    await auth.api.changePassword({ headers: h, body: { currentPassword: PASSWORD, newPassword: "password-nuova-tmp" } });
    await passwordChanged(tmp.user.id);
    expect(await status(auth.api.updateUser({ headers: h, body: { name: "Altro" } }))).toBe("OK");
  });

  it("un utente non può creare utenti né cambiare ruoli", async () => {
    await passwordChanged(utenteId);
    const h = await signIn("ute@buckled.it");
    expect(
      await status(
        auth.api.createUser({
          headers: h,
          body: { email: "z@y.it", password: PASSWORD, name: "Z", role: "utente" },
        }),
      ),
    ).toBe("FORBIDDEN");
    expect(
      await status(auth.api.setRole({ headers: h, body: { userId: utenteId, role: "redattore" } })),
    ).toBe("FORBIDDEN");
  });

  it("un utente non può promuoversi via update-user", async () => {
    const h = await signIn("ute@buckled.it");
    expect(
      await status(
        auth.api.updateUser({ headers: h, body: { role: "redattore" } as Record<string, unknown> }),
      ),
    ).toBe("BAD_REQUEST");
    expect(
      await status(
        auth.api.updateUser({
          headers: h,
          body: { mustChangePassword: false } as Record<string, unknown>,
        }),
      ),
    ).toBe("BAD_REQUEST");
  });

  it("la redazione non può impersonare", async () => {
    expect(
      await status(auth.api.impersonateUser({ headers: redHeaders, body: { userId: utenteId } })),
    ).toBe("FORBIDDEN");
  });

  it("cambio password: la vecchia smette di funzionare", async () => {
    const h = await signIn("ute@buckled.it");
    await auth.api.changePassword({
      headers: h,
      body: { currentPassword: PASSWORD, newPassword: "nuova-password-sicura", revokeOtherSessions: true },
    });
    expect(await status(signIn("ute@buckled.it"))).toBe("UNAUTHORIZED");
    expect(await status(signIn("ute@buckled.it", "nuova-password-sicura"))).toBe("OK");
  });

  it("sospensione: revoca le sessioni e blocca il login", async () => {
    await signIn("ute@buckled.it", "nuova-password-sicura");
    await auth.api.banUser({ headers: redHeaders, body: { userId: utenteId } });
    const sessions = await db.select().from(session).where(eq(session.userId, utenteId));
    expect(sessions).toHaveLength(0);
    expect(await status(signIn("ute@buckled.it", "nuova-password-sicura"))).toBe("FORBIDDEN");
  });

  it("reset della redazione: imposta una password temporanea", async () => {
    await auth.api.unbanUser({ headers: redHeaders, body: { userId: utenteId } });
    await auth.api.setUserPassword({
      headers: redHeaders,
      body: { userId: utenteId, newPassword: "altra-temporanea" },
    });
    expect(await status(signIn("ute@buckled.it", "altra-temporanea"))).toBe("OK");
  });
});
