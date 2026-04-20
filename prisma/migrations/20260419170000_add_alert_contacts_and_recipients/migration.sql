-- CreateEnum
CREATE TYPE "RecipientKind" AS ENUM ('CONTACT', 'INLINE_EMAIL');

-- CreateTable
CREATE TABLE "AlertContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "cellPhone" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItemRecipient" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "RecipientKind" NOT NULL,
    "contactId" TEXT,
    "inlineEmail" TEXT,
    "inlineEmailNormalized" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItemRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertContact_userId_emailNormalized_key" ON "AlertContact"("userId", "emailNormalized");

-- CreateIndex
CREATE INDEX "AlertContact_userId_idx" ON "AlertContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemRecipient_itemId_contactId_key" ON "InventoryItemRecipient"("itemId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemRecipient_itemId_inlineEmailNormalized_key" ON "InventoryItemRecipient"("itemId", "inlineEmailNormalized");

-- CreateIndex
CREATE INDEX "InventoryItemRecipient_itemId_idx" ON "InventoryItemRecipient"("itemId");

-- CreateIndex
CREATE INDEX "InventoryItemRecipient_contactId_idx" ON "InventoryItemRecipient"("contactId");

-- AddForeignKey
ALTER TABLE "AlertContact" ADD CONSTRAINT "AlertContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemRecipient" ADD CONSTRAINT "InventoryItemRecipient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemRecipient" ADD CONSTRAINT "InventoryItemRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AlertContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "InventoryItemRecipient"
ADD CONSTRAINT "InventoryItemRecipient_kind_shape_check"
CHECK (
  (
    "kind" = 'CONTACT'
    AND "contactId" IS NOT NULL
    AND "inlineEmail" IS NULL
    AND "inlineEmailNormalized" IS NULL
  )
  OR (
    "kind" = 'INLINE_EMAIL'
    AND "contactId" IS NULL
    AND "inlineEmail" IS NOT NULL
    AND "inlineEmailNormalized" IS NOT NULL
  )
);

-- Backfill one inline recipient per existing item using the current alertEmail
INSERT INTO "InventoryItemRecipient" (
    "id",
    "itemId",
    "kind",
    "inlineEmail",
    "inlineEmailNormalized",
    "position",
    "createdAt",
    "updatedAt"
)
SELECT
    'backfill_' || md5("id" || ':' || "alertEmail"),
    "id",
    'INLINE_EMAIL'::"RecipientKind",
    "alertEmail",
    lower(trim("alertEmail")),
    0,
    "createdAt",
    "updatedAt"
FROM "InventoryItem";
