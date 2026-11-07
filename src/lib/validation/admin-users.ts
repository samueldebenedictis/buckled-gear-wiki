import { z } from "zod";
import { ROLES } from "@/db/schema/enums";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Inserisci il nickname").max(50, "Massimo 50 caratteri"),
  email: z.email("Email non valida").trim().toLowerCase(),
  role: z.enum(ROLES),
});

export const userIdSchema = z.object({ userId: z.string().min(1) });
export const setRoleSchema = userIdSchema.extend({ role: z.enum(ROLES) });
export const setBannedSchema = userIdSchema.extend({ banned: z.enum(["true", "false"]) });
