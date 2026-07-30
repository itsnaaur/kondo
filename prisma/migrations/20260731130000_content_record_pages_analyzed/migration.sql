-- AlterTable
ALTER TABLE "ContentRecord" ADD COLUMN     "pagesAnalyzed" INTEGER NOT NULL DEFAULT 0;
-- NOTE: intentionally not dropping "signup_email_domains" — same false positive as the
-- rebuild_content_pipeline migration; that table belongs to the Supabase auth domain-
-- restriction hook, not to anything Prisma tracks as a model.
