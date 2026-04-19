ALTER TABLE "InventoryItem"
ADD COLUMN "scanCooldownMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "scanAcknowledgement" TEXT;
