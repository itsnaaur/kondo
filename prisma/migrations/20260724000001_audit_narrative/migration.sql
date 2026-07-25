-- AlterTable
ALTER TABLE "AuditReport" ADD COLUMN     "findingsSummary" TEXT;
ALTER TABLE "AuditReport" ADD COLUMN     "briefUnderstanding" TEXT;
ALTER TABLE "AuditReport" ADD COLUMN     "recommendations" JSONB;
