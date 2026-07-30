CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "auditReportId" TEXT NOT NULL,
    "userPrompt" TEXT,
    "fallbackStatus" TEXT NOT NULL,
    "generatedByUserId" TEXT,
    "totalTasks" INTEGER NOT NULL,
    "remainingTasks" INTEGER NOT NULL,
    "chromeNav" TEXT,
    "chromeFooter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GenerationRun_clientId_idx" ON "GenerationRun"("clientId");

ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
