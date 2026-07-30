-- AlterTable
ALTER TABLE "Job" ADD COLUMN "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Job_createdByUserId_status_idx" ON "Job"("createdByUserId", "status");
