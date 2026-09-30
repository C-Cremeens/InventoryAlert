-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "checkoutAttemptExpires" TIMESTAMP(3),
ADD COLUMN     "checkoutAttemptId" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "lastAlertAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockingRequest" ADD COLUMN     "submissionKey" TEXT;

-- CreateTable
CREATE TABLE "StoredImage" (
    "url" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deleting" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "RecipientConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "tokenHash" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "itemName" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "providerId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredImage_userId_idx" ON "StoredImage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientConsent_tokenHash_key" ON "RecipientConsent"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientConsent_userId_email_key" ON "RecipientConsent"("userId", "email");

-- CreateIndex
CREATE INDEX "NotificationJob_status_nextAttemptAt_idx" ON "NotificationJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_requestId_kind_recipient_key" ON "NotificationJob"("requestId", "kind", "recipient");

-- CreateIndex
CREATE INDEX "StockingRequest_itemId_createdAt_idx" ON "StockingRequest"("itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockingRequest_itemId_submissionKey_key" ON "StockingRequest"("itemId", "submissionKey");

-- AddForeignKey
ALTER TABLE "StoredImage" ADD CONSTRAINT "StoredImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientConsent" ADD CONSTRAINT "RecipientConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StockingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Accounts linked by the former unsafe Google flow may retain a pre-registrant's
-- password. Keep Google access and all inventory, but remove that legacy password.
-- Owners who want password login can choose a new one using mailbox recovery.
UPDATE "User" u SET "hashedPassword" = NULL, "sessionVersion" = "sessionVersion" + 1
WHERE EXISTS (SELECT 1 FROM "AuthIdentity" a WHERE a."userId" = u."id" AND a."provider" = 'GOOGLE');
DELETE FROM "AuthIdentity" c WHERE c."provider" = 'CREDENTIALS'
AND EXISTS (SELECT 1 FROM "AuthIdentity" g WHERE g."userId" = c."userId" AND g."provider" = 'GOOGLE');
