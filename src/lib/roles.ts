import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

export const ac = createAccessControl(defaultStatements);

export const roles = {
  utente: ac.newRole({ user: [], session: [] }),
  // Niente "impersonate": la redazione non deve poter vedere equipaggiamenti e feedback altrui.
  redattore: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
};
