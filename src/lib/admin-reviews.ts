// Recensioni della redazione, gestite dalla scheda prodotto. Senza dipendenze da Next.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { reviewMedia, reviews, user } from "@/db/schema";
import type { MediaInput, ReviewInput } from "./validation/review";

export async function listReviewsForProduct(db: Db, productId: string) {
  const rows = await db
    .select({ review: reviews, author: user.name })
    .from(reviews)
    .leftJoin(user, eq(user.id, reviews.authorId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
  const media = rows.length
    ? await db
        .select()
        .from(reviewMedia)
        .where(inArray(reviewMedia.reviewId, rows.map((r) => r.review.id)))
        .orderBy(asc(reviewMedia.id))
    : [];
  return rows.map((r) => ({
    ...r.review,
    author: r.author,
    media: media.filter((m) => m.reviewId === r.review.id),
  }));
}

export type AdminReview = Awaited<ReturnType<typeof listReviewsForProduct>>[number];

export async function createReview(db: Db, productId: string, authorId: string, input: ReviewInput) {
  const [r] = await db
    .insert(reviews)
    .values({
      productId,
      authorId,
      ...input,
      publishedAt: input.status === "pubblicata" ? new Date() : null,
    })
    .returning({ id: reviews.id });
  return r.id;
}

export async function updateReview(db: Db, reviewId: string, input: ReviewInput) {
  const [current] = await db
    .select({ publishedAt: reviews.publishedAt })
    .from(reviews)
    .where(eq(reviews.id, reviewId));
  if (!current) return;
  await db
    .update(reviews)
    .set({
      ...input,
      // Mantiene la data della prima pubblicazione; una bozza non ne ha.
      publishedAt: input.status === "pubblicata" ? (current.publishedAt ?? new Date()) : null,
    })
    .where(eq(reviews.id, reviewId));
}

export async function deleteReview(db: Db, reviewId: string) {
  await db.delete(reviews).where(eq(reviews.id, reviewId));
}

export async function addMedia(db: Db, reviewId: string, input: MediaInput) {
  await db.insert(reviewMedia).values({ reviewId, ...input });
}

export async function removeMedia(db: Db, reviewId: string, mediaId: string) {
  await db.delete(reviewMedia).where(and(eq(reviewMedia.id, mediaId), eq(reviewMedia.reviewId, reviewId)));
}
