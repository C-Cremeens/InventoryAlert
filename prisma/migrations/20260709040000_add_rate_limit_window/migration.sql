-- CreateTable
CREATE TABLE "RateLimitWindow" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitWindow_key_windowStart_key" ON "RateLimitWindow"("key", "windowStart");

-- CreateIndex
CREATE INDEX "RateLimitWindow_windowStart_idx" ON "RateLimitWindow"("windowStart");
