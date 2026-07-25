/*
  Warnings:

  - Added the required column `intent` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProjectIntent" AS ENUM ('FACELIFT', 'WORDPRESS_TRANSFER');

-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'PROJECT_ARCHIVE';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "intent" "ProjectIntent" NOT NULL;

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationMessage" ADD CONSTRAINT "GenerationMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationMessage" ADD CONSTRAINT "GenerationMessage_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
