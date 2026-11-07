import { describe, expect, it } from "vitest";
import { checkAccess, type SessionUser } from "@/lib/permissions";

const base: SessionUser = {
  id: "u1",
  name: "Ale",
  email: "a@b.it",
  role: "utente",
  mustChangePassword: false,
  banned: false,
};

describe("checkAccess", () => {
  it("anonimo va al login", () => {
    expect(checkAccess(null, "utente")).toBe("login");
    expect(checkAccess(null, "redattore")).toBe("login");
  });

  it("utente sospeso va al login", () => {
    expect(checkAccess({ ...base, banned: true }, "utente")).toBe("login");
  });

  it("password temporanea obbliga al cambio, salvo la pagina di cambio", () => {
    const u = { ...base, mustChangePassword: true };
    expect(checkAccess(u, "utente")).toBe("change-password");
    expect(checkAccess({ ...u, role: "redattore" }, "redattore")).toBe("change-password");
    expect(checkAccess(u, "utente", { allowPendingPasswordChange: true })).toBe("ok");
  });

  it("utente non accede alla redazione", () => {
    expect(checkAccess(base, "utente")).toBe("ok");
    expect(checkAccess(base, "redattore")).toBe("forbidden");
  });

  it("redattore accede a tutto", () => {
    const r = { ...base, role: "redattore" as const };
    expect(checkAccess(r, "utente")).toBe("ok");
    expect(checkAccess(r, "redattore")).toBe("ok");
  });
});
