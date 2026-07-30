ALTER TABLE "Generation"
  ADD COLUMN "manifest" JSONB,
  ADD COLUMN "qaReport" JSONB,
  ADD COLUMN "qaPassed" BOOLEAN;
