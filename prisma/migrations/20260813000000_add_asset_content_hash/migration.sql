-- AlterTable
ALTER TABLE "Asset"
  ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Asset_clientId_contentHash_idx" ON "Asset"("clientId", "contentHash");
