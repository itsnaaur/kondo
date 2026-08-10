-- AlterTable
ALTER TABLE "ContentRecord"
  ADD COLUMN     "ctaLabel" TEXT,
  ADD COLUMN     "serviceAreas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "hours" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "offers" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "credentials" JSONB NOT NULL DEFAULT '[]';
