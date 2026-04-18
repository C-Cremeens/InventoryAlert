-- Add PRO value to the existing Tier enum
ALTER TYPE "Tier" ADD VALUE IF NOT EXISTS 'PRO';

-- Migrate existing paid users to PRO
UPDATE "User" SET "tier" = 'PRO' WHERE "tier" IN ('FAMILY', 'ENTERPRISE');

-- Recreate the Tier enum with only FREE and PRO, then swap it in
-- PostgreSQL does not support DROP VALUE on enums, so we rename the old type,
-- create the new one, re-cast the column, then drop the old type.
ALTER TYPE "Tier" RENAME TO "Tier_old";

CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

ALTER TABLE "User" ALTER COLUMN "tier" TYPE "Tier" USING "tier"::text::"Tier";
ALTER TABLE "User" ALTER COLUMN "tier" SET DEFAULT 'FREE';

DROP TYPE "Tier_old";
