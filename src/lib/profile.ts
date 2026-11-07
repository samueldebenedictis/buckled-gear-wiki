import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { user } from "@/db/schema";
import type { z } from "zod";
import type { profileSchema } from "./validation/gear";

export async function getProfile(db: Db, userId: string) {
  const [p] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  return p ?? null;
}

export async function updateProfile(db: Db, userId: string, input: z.output<typeof profileSchema>) {
  await db.update(user).set(input).where(eq(user.id, userId));
}
