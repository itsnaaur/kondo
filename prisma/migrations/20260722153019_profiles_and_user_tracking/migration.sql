-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "Generation" ADD COLUMN     "generatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: copy any Supabase Auth users that already exist (e.g. accounts created
-- via the dashboard before this migration ran) into public."Profile".
INSERT INTO "Profile" (id, email, "createdAt")
SELECT id::text, email, created_at FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Keep public."Profile" in sync going forward: every new Supabase Auth signup
-- gets a matching row here automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO "Profile" (id, email, "createdAt")
  VALUES (NEW.id::text, NEW.email, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
