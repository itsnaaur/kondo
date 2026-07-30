-- Wipe existing dev/test data before this migration (confirmed acceptable — no real
-- prospect data exists yet). Also required for correctness: it clears rows that would
-- otherwise violate the new NOT NULL "Asset"."url" column added below, and those Asset
-- rows point at the old local-disk storage convention this rebuild replaces anyway.
-- CASCADE also empties CrawledPage/AuditReport/Generation/GenerationRun/JobOutcome/
-- Reference via their FKs to Client before those tables are dropped further down.
TRUNCATE TABLE "Client" CASCADE;

-- AlterEnum
BEGIN;
CREATE TYPE "AssetType_new" AS ENUM ('LOGO', 'IMAGE');
ALTER TABLE "public"."Asset" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Asset" ALTER COLUMN "type" TYPE "AssetType_new" USING ("type"::text::"AssetType_new");
ALTER TYPE "AssetType" RENAME TO "AssetType_old";
ALTER TYPE "AssetType_new" RENAME TO "AssetType";
DROP TYPE "public"."AssetType_old";
ALTER TABLE "Asset" ALTER COLUMN "type" SET DEFAULT 'IMAGE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ClientStatus_new" AS ENUM ('NEW', 'ANALYZING', 'ANALYSIS_FAILED', 'READY_FOR_REVIEW');
ALTER TABLE "public"."Client" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Client" ALTER COLUMN "status" TYPE "ClientStatus_new" USING ("status"::text::"ClientStatus_new");
ALTER TYPE "ClientStatus" RENAME TO "ClientStatus_old";
ALTER TYPE "ClientStatus_new" RENAME TO "ClientStatus";
DROP TYPE "public"."ClientStatus_old";
ALTER TABLE "Client" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "AuditReport" DROP CONSTRAINT "AuditReport_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Generation" DROP CONSTRAINT "Generation_auditReportId_fkey";

-- DropForeignKey
ALTER TABLE "Generation" DROP CONSTRAINT "Generation_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Generation" DROP CONSTRAINT "Generation_generatedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "GenerationMessage" DROP CONSTRAINT "GenerationMessage_clientId_fkey";

-- DropForeignKey
ALTER TABLE "GenerationMessage" DROP CONSTRAINT "GenerationMessage_generationId_fkey";

-- DropForeignKey
ALTER TABLE "GenerationRun" DROP CONSTRAINT "GenerationRun_clientId_fkey";

-- DropForeignKey
ALTER TABLE "JobOutcome" DROP CONSTRAINT "JobOutcome_clientId_fkey";

-- DropForeignKey
ALTER TABLE "JobOutcome" DROP CONSTRAINT "JobOutcome_generationId_fkey";

-- DropForeignKey
ALTER TABLE "Reference" DROP CONSTRAINT "Reference_clientId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "storagePath",
ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'IMAGE';

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "briefText",
DROP COLUMN "businessType",
DROP COLUMN "cancelRequested",
DROP COLUMN "designSpec",
DROP COLUMN "designSpecApprovedAt",
DROP COLUMN "intent",
DROP COLUMN "interpretedBrief",
DROP COLUMN "interpretedBriefApprovedAt",
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "CrawledPage" DROP COLUMN "htmlPath",
DROP COLUMN "screenshotPath";

-- DropTable
DROP TABLE "AuditReport";

-- DropTable
DROP TABLE "Generation";

-- DropTable
DROP TABLE "GenerationMessage";

-- DropTable
DROP TABLE "GenerationRun";

-- DropTable
DROP TABLE "JobOutcome";

-- DropTable
DROP TABLE "Reference";
-- NOTE: intentionally NOT dropping "signup_email_domains" here — Prisma's diff flags it
-- because it isn't modeled in schema.prisma, but it belongs to the Supabase Before-User-
-- Created domain-restriction hook (auth infra explicitly out of scope for this rebuild),
-- not to anything this migration owns.

-- DropEnum
DROP TYPE "ProjectIntent";

-- CreateTable
CREATE TABLE "ContentRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "businessName" TEXT,
    "tagline" TEXT,
    "aboutCopy" TEXT,
    "services" JSONB NOT NULL,
    "testimonials" JSONB NOT NULL,
    "brandColors" JSONB NOT NULL,
    "images" JSONB NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "logoAssetId" TEXT,
    "detectedIndustry" TEXT,
    "fieldFlags" JSONB,
    "crawlPagesCount" INTEGER NOT NULL DEFAULT 0,
    "sourceCrawlTruncated" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contentRecordId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "publishSlug" TEXT,
    "publishStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRecord_clientId_key" ON "ContentRecord"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRecord_logoAssetId_key" ON "ContentRecord"("logoAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_publishSlug_key" ON "Concept"("publishSlug");

-- CreateIndex
CREATE INDEX "Concept_clientId_createdAt_idx" ON "Concept"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_contentRecordId_fkey" FOREIGN KEY ("contentRecordId") REFERENCES "ContentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

