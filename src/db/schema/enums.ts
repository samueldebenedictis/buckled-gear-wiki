import { pgEnum } from "drizzle-orm/pg-core";
import {
  CATEGORIES,
  SIZE_SYSTEMS,
  DISTANCE_BANDS,
  TERRAINS,
  PLATE_TYPES,
  GEAR_STATUSES,
  REVIEW_STATUSES,
  PRODUCT_STATUSES,
  MEDIA_KINDS,
  PROPOSAL_KINDS,
  PROPOSAL_STATUSES,
} from "../enum-values";

export * from "../enum-values";

export const categoryEnum = pgEnum("category", CATEGORIES);
export const sizeSystemEnum = pgEnum("size_system", SIZE_SYSTEMS);
export const distanceBandEnum = pgEnum("distance_band", DISTANCE_BANDS);
export const terrainEnum = pgEnum("terrain", TERRAINS);
export const plateTypeEnum = pgEnum("plate_type", PLATE_TYPES);
export const gearStatusEnum = pgEnum("gear_status", GEAR_STATUSES);
export const reviewStatusEnum = pgEnum("review_status", REVIEW_STATUSES);
export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUSES);
export const mediaKindEnum = pgEnum("media_kind", MEDIA_KINDS);
export const proposalKindEnum = pgEnum("proposal_kind", PROPOSAL_KINDS);
export const proposalStatusEnum = pgEnum("proposal_status", PROPOSAL_STATUSES);
