-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'DESIGNING';
ALTER TYPE "ClientStatus" ADD VALUE 'DESIGN_REVIEW';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "designSpec" JSONB,
ADD COLUMN     "designSpecApprovedAt" TIMESTAMP(3);
