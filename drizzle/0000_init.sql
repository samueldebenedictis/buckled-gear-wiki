-- Ricerca fuzzy (pg_trgm): serve agli indici trigram più sotto.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('scarpe', 'zaini', 'fasce', 'idratazione', 'apparel', 'eyewear', 'cuffie', 'tech', 'accessori');--> statement-breakpoint
CREATE TYPE "public"."distance_band" AS ENUM('20k', '50k', '100k', '100M');--> statement-breakpoint
CREATE TYPE "public"."gear_status" AS ENUM('in_uso', 'dismessa');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('youtube', 'spotify', 'foto');--> statement-breakpoint
CREATE TYPE "public"."plate_type" AS ENUM('nessuna', 'rock_plate', 'carbonio', 'altro');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('bozza', 'pubblicato');--> statement-breakpoint
CREATE TYPE "public"."proposal_kind" AS ENUM('nuovo_prodotto', 'correzione');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('in_attesa', 'approvata', 'rifiutata', 'unita');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('bozza', 'pubblicata');--> statement-breakpoint
CREATE TYPE "public"."size_system" AS ENUM('US_M', 'US_W');--> statement-breakpoint
CREATE TYPE "public"."terrain" AS ENUM('strada', 'sterrato', 'collinare', 'singletrack', 'tecnico', 'fango', 'roccia', 'neve');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'utente' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"must_change_password" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_ck" CHECK ("user"."role" in ('utente', 'redattore'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_brand_slug_uq" UNIQUE("brand_id","slug")
);
--> statement-breakpoint
CREATE TABLE "product_aliases" (
	"product_id" uuid NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "product_aliases_product_id_alias_pk" PRIMARY KEY("product_id","alias")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"version" text DEFAULT '' NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"release_year" smallint,
	"price_eur" numeric(7, 2),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_path" text,
	"status" "product_status" DEFAULT 'bozza' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_model_version_uq" UNIQUE("model_id","version"),
	CONSTRAINT "products_release_year_ck" CHECK ("products"."release_year" between 1990 and 2100),
	CONSTRAINT "products_price_ck" CHECK ("products"."price_eur" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shoe_specs" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"drop_mm" smallint,
	"stack_heel_mm" smallint,
	"stack_fore_mm" smallint,
	"weight_g" integer,
	"weight_ref_size" text,
	"lug_mm" smallint,
	"plate" "plate_type",
	"terrains" "terrain"[] DEFAULT '{}' NOT NULL,
	"waterproof" boolean,
	"upper" text,
	"midsole" text,
	"outsole" text,
	"fit_note" text,
	CONSTRAINT "shoe_specs_drop_ck" CHECK ("shoe_specs"."drop_mm" between 0 and 20),
	CONSTRAINT "shoe_specs_stack_heel_ck" CHECK ("shoe_specs"."stack_heel_mm" between 0 and 60),
	CONSTRAINT "shoe_specs_stack_fore_ck" CHECK ("shoe_specs"."stack_fore_mm" between 0 and 60),
	CONSTRAINT "shoe_specs_weight_ck" CHECK ("shoe_specs"."weight_g" between 50 and 1000),
	CONSTRAINT "shoe_specs_lug_ck" CHECK ("shoe_specs"."lug_mm" between 0 and 15)
);
--> statement-breakpoint
CREATE TABLE "gear_feedback" (
	"gear_id" uuid PRIMARY KEY NOT NULL,
	"fit_length" smallint,
	"fit_width" smallint,
	"fit_volume" smallint,
	"heel_hold" smallint,
	"durability" smallint,
	"comfort" smallint,
	"cushioning" smallint,
	"stability" smallint,
	"grip_dry" smallint,
	"grip_wet" smallint,
	"distances" "distance_band"[] DEFAULT '{}' NOT NULL,
	"terrains" "terrain"[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gear_feedback_fit_ck" CHECK ("gear_feedback"."fit_length" between -1 and 1 and "gear_feedback"."fit_width" between -1 and 1 and "gear_feedback"."fit_volume" between -1 and 1),
	CONSTRAINT "gear_feedback_scores_ck" CHECK ("gear_feedback"."heel_hold" between 1 and 5 and "gear_feedback"."durability" between 1 and 5 and "gear_feedback"."comfort" between 1 and 5 and "gear_feedback"."cushioning" between 1 and 5 and "gear_feedback"."stability" between 1 and 5 and "gear_feedback"."grip_dry" between 1 and 5 and "gear_feedback"."grip_wet" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "user_gear" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"nickname" text,
	"size_system" "size_system" NOT NULL,
	"size_value" text NOT NULL,
	"purchased_on" date,
	"retired_on" date,
	"km" integer DEFAULT 0 NOT NULL,
	"status" "gear_status" DEFAULT 'in_uso' NOT NULL,
	"private_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_gear_km_ck" CHECK ("user_gear"."km" >= 0),
	CONSTRAINT "user_gear_dates_ck" CHECK ("user_gear"."retired_on" >= "user_gear"."purchased_on"),
	CONSTRAINT "user_gear_retired_status_ck" CHECK ("user_gear"."retired_on" is null or "user_gear"."status" = 'dismessa')
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposer_id" text NOT NULL,
	"kind" "proposal_kind" NOT NULL,
	"product_id" uuid,
	"payload" jsonb NOT NULL,
	"status" "proposal_status" DEFAULT 'in_attesa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_correction_ck" CHECK ("proposals"."kind" <> 'correzione' or "proposals"."product_id" is not null or "proposals"."status" <> 'in_attesa')
);
--> statement-breakpoint
CREATE TABLE "review_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"url" text NOT NULL,
	"start_s" integer,
	CONSTRAINT "review_media_start_ck" CHECK ("review_media"."start_s" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"author_id" text,
	"title" text NOT NULL,
	"body_md" text DEFAULT '' NOT NULL,
	"verdict" text,
	"km_tested" integer,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"distances" "distance_band"[] DEFAULT '{}' NOT NULL,
	"status" "review_status" DEFAULT 'bozza' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_km_ck" CHECK ("reviews"."km_tested" >= 0),
	CONSTRAINT "reviews_published_ck" CHECK ("reviews"."status" <> 'pubblicata' or "reviews"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "guide_items" (
	"guide_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"award" text,
	"badges" text[] DEFAULT '{}' NOT NULL,
	"note_md" text DEFAULT '' NOT NULL,
	CONSTRAINT "guide_items_guide_id_product_id_pk" PRIMARY KEY("guide_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"intro_md" text DEFAULT '' NOT NULL,
	"why_md" text DEFAULT '' NOT NULL,
	"source_url" text,
	"updated_on" date,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoe_specs" ADD CONSTRAINT "shoe_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_feedback" ADD CONSTRAINT "gear_feedback_gear_id_user_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."user_gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear" ADD CONSTRAINT "user_gear_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gear" ADD CONSTRAINT "user_gear_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposer_id_user_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_items" ADD CONSTRAINT "guide_items_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_items" ADD CONSTRAINT "guide_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_lower_uq" ON "brands" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "models_brand_name_lower_uq" ON "models" USING btree ("brand_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "product_aliases_alias_lower_uq" ON "product_aliases" USING btree (lower("alias"));--> statement-breakpoint
CREATE INDEX "product_aliases_alias_trgm_idx" ON "product_aliases" USING gin ("alias" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_display_name_trgm_idx" ON "products" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_gear_user_idx" ON "user_gear" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_gear_product_idx" ON "user_gear" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposals_proposer_idx" ON "proposals" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "review_media_review_idx" ON "review_media" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "guide_items_product_idx" ON "guide_items" USING btree ("product_id");