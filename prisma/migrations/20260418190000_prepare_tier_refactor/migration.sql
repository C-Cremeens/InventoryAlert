-- Forward-compatible bridge for fresh databases. The historical tier-refactor
-- migration uses PRO in the same batch that adds it, which PostgreSQL rejects.
-- Commit the enum addition in this separate migration. Do not edit checksums
-- of already-applied migrations. On an existing FREE/PRO database this is a no-op.
ALTER TYPE "Tier" ADD VALUE IF NOT EXISTS 'PRO';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Tier' AND e.enumlabel IN ('FAMILY', 'ENTERPRISE')
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "tier" DROP DEFAULT;
  END IF;
END $$;
