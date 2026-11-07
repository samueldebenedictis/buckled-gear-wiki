import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-config";

export const loginSchema = z.object({
  email: z.email("Email non valida").trim().toLowerCase(),
  password: z.string().min(1, "Inserisci la password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Inserisci la password attuale"),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Almeno ${MIN_PASSWORD_LENGTH} caratteri`)
      .max(128, "Massimo 128 caratteri"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "La nuova password deve essere diversa da quella attuale",
  });
