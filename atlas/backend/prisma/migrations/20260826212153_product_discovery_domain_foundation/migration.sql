-- CreateEnum
CREATE TYPE "DiscoveryMode" AS ENUM ('KEYWORD', 'ASIN', 'TREND_COLD_START');

-- CreateEnum
CREATE TYPE "TrendSignalSubjectType" AS ENUM ('CATEGORY', 'PRODUCT_CONCEPT');

-- CreateEnum
CREATE TYPE "TrendSignalClassification" AS ENUM ('RAW_PROVIDER', 'ATLAS_DERIVED', 'AI_EXPLANATION');

-- AlterTable
ALTER TABLE "discovery_results" ADD COLUMN     "marketplace_product_candidate_id" TEXT;

-- AlterTable
ALTER TABLE "discovery_sessions" ADD COLUMN     "mode" "DiscoveryMode" NOT NULL DEFAULT 'KEYWORD',
ADD COLUMN     "seed_category_id" TEXT;

-- AlterTable
ALTER TABLE "marketplace_category_mappings" ADD COLUMN     "category_id" TEXT;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "marketplace_product_candidate_id" TEXT,
ADD COLUMN     "normalized_keyword" TEXT;

-- Backfill: populate normalized_keyword for every existing row so the
-- partial unique index added at the end of this migration has a value to
-- key on. Display `keyword` is untouched — only this new column changes.
UPDATE "opportunities" SET "normalized_keyword" = lower(trim("keyword"));

-- Case 11 cleanup: before the migration existing manual tests already
-- produced true duplicate active rows (same workspace/keyword/marketplace/
-- country, marketplace_product_candidate_id was not a concept yet so every
-- pre-existing row is NULL there). Deterministically keep the oldest row
-- per group and soft-delete the rest — never a hard delete, so the
-- business record and its full history remain queryable/restorable.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workspace_id", lower(trim("keyword")), "marketplace", "country"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS rn
  FROM "opportunities"
  WHERE "deleted_at" IS NULL
)
UPDATE "opportunities" o
SET "deleted_at" = NOW()
FROM ranked
WHERE o."id" = ranked."id" AND ranked.rn > 1;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_concepts" (
    "id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_from" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_signals" (
    "id" TEXT NOT NULL,
    "subject_type" "TrendSignalSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "classification" "TrendSignalClassification" NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "raw_payload" JSONB,
    "explanation_text" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_product_candidates" (
    "id" TEXT NOT NULL,
    "marketplace_key" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "external_product_id" TEXT NOT NULL,
    "product_concept_id" TEXT,
    "title" TEXT,
    "marketplace_category" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_product_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_snapshots" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "sales_rank" INTEGER,
    "price" DOUBLE PRECISION,
    "offer_count" INTEGER,
    "source" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_source_idx" ON "categories"("source");

-- CreateIndex
CREATE UNIQUE INDEX "categories_parent_id_slug_key" ON "categories"("parent_id", "slug");

-- CreateIndex
CREATE INDEX "product_concepts_normalized_name_idx" ON "product_concepts"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_concepts_category_id_normalized_name_key" ON "product_concepts"("category_id", "normalized_name");

-- CreateIndex
CREATE INDEX "trend_signals_subject_type_subject_id_idx" ON "trend_signals"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "trend_signals_signal_type_idx" ON "trend_signals"("signal_type");

-- CreateIndex
CREATE INDEX "trend_signals_source_idx" ON "trend_signals"("source");

-- CreateIndex
CREATE INDEX "trend_signals_captured_at_idx" ON "trend_signals"("captured_at");

-- CreateIndex
CREATE INDEX "marketplace_product_candidates_product_concept_id_idx" ON "marketplace_product_candidates"("product_concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_product_candidates_marketplace_key_country_exte_key" ON "marketplace_product_candidates"("marketplace_key", "country", "external_product_id");

-- CreateIndex
CREATE INDEX "marketplace_snapshots_candidate_id_idx" ON "marketplace_snapshots"("candidate_id");

-- CreateIndex
CREATE INDEX "marketplace_snapshots_captured_at_idx" ON "marketplace_snapshots"("captured_at");

-- CreateIndex
CREATE INDEX "discovery_results_marketplace_product_candidate_id_idx" ON "discovery_results"("marketplace_product_candidate_id");

-- CreateIndex
CREATE INDEX "discovery_sessions_mode_idx" ON "discovery_sessions"("mode");

-- CreateIndex
CREATE INDEX "marketplace_category_mappings_category_id_idx" ON "marketplace_category_mappings"("category_id");

-- CreateIndex
CREATE INDEX "opportunities_marketplace_product_candidate_id_idx" ON "opportunities"("marketplace_product_candidate_id");

-- CreateIndex
CREATE INDEX "opportunities_normalized_keyword_idx" ON "opportunities"("normalized_keyword");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_marketplace_product_candidate_id_fkey" FOREIGN KEY ("marketplace_product_candidate_id") REFERENCES "marketplace_product_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_seed_category_id_fkey" FOREIGN KEY ("seed_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_results" ADD CONSTRAINT "discovery_results_marketplace_product_candidate_id_fkey" FOREIGN KEY ("marketplace_product_candidate_id") REFERENCES "marketplace_product_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_concepts" ADD CONSTRAINT "product_concepts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_candidates" ADD CONSTRAINT "marketplace_product_candidates_product_concept_id_fkey" FOREIGN KEY ("product_concept_id") REFERENCES "product_concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_snapshots" ADD CONSTRAINT "marketplace_snapshots_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "marketplace_product_candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_category_mappings" ADD CONSTRAINT "marketplace_category_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Case 11 active-row identity constraints. Not representable as Prisma
-- `@@unique` (Postgres partial index WHERE predicate has no schema.prisma
-- DSL equivalent), so these exist only here — see the comment on the
-- Opportunity model in schema.prisma. Applied last, after the backfill and
-- dedup pass above, so pre-existing data cannot violate them.
CREATE UNIQUE INDEX "opportunities_candidate_active_key"
  ON "opportunities" ("workspace_id", "marketplace_product_candidate_id")
  WHERE "deleted_at" IS NULL AND "marketplace_product_candidate_id" IS NOT NULL;

CREATE UNIQUE INDEX "opportunities_manual_active_key"
  ON "opportunities" ("workspace_id", "normalized_keyword", "marketplace", "country")
  WHERE "deleted_at" IS NULL AND "marketplace_product_candidate_id" IS NULL;
