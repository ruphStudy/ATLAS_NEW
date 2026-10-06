-- AlterTable
ALTER TABLE "listing_publications" ADD COLUMN     "marketplace_account_id" TEXT;

-- CreateIndex
CREATE INDEX "listing_publications_marketplace_account_id_idx" ON "listing_publications"("marketplace_account_id");
