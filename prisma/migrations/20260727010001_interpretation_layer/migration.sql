-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'INTERPRETING';
ALTER TYPE "ClientStatus" ADD VALUE 'BRIEF_REVIEW';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "interpretedBrief" JSONB,
ADD COLUMN     "interpretedBriefApprovedAt" TIMESTAMP(3);
