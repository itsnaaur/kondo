CREATE TABLE "JobOutcome" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "generationId" TEXT,
    "platform" TEXT,
    "pageCount" INTEGER,
    "businessType" TEXT,
    "intensityLevel" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "wallClockMs" INTEGER,
    "qaPassed" BOOLEAN,
    "manualFixMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOutcome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobOutcome_generationId_key" ON "JobOutcome"("generationId");
CREATE INDEX "JobOutcome_clientId_idx" ON "JobOutcome"("clientId");

ALTER TABLE "JobOutcome" ADD CONSTRAINT "JobOutcome_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOutcome" ADD CONSTRAINT "JobOutcome_generationId_fkey"
    FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
