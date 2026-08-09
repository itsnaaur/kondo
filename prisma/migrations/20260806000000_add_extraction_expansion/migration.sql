-- AlterTable
ALTER TABLE "ContentRecord"
  ADD COLUMN     "stats" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "differentiators" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN     "process" JSONB NOT NULL DEFAULT '[]';
