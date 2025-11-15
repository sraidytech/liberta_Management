-- CreateTable
CREATE TABLE "customer_satisfaction_surveys" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "collectedById" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallRating" INTEGER,
    "deliverySpeedRating" INTEGER,
    "productQualityRating" INTEGER,
    "agentServiceRating" INTEGER,
    "packagingRating" INTEGER,
    "customerComments" TEXT,
    "internalNotes" TEXT,
    "surveyVersion" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_orderId_idx" ON "customer_satisfaction_surveys"("orderId");

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_customerId_idx" ON "customer_satisfaction_surveys"("customerId");

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_collectedById_idx" ON "customer_satisfaction_surveys"("collectedById");

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_overallRating_idx" ON "customer_satisfaction_surveys"("overallRating");

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_createdAt_idx" ON "customer_satisfaction_surveys"("createdAt");

-- CreateIndex
CREATE INDEX "customer_satisfaction_surveys_isLatest_idx" ON "customer_satisfaction_surveys"("isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "customer_satisfaction_surveys_orderId_isLatest_key" ON "customer_satisfaction_surveys"("orderId", "isLatest") WHERE "isLatest" = true;

-- AddForeignKey
ALTER TABLE "customer_satisfaction_surveys" ADD CONSTRAINT "customer_satisfaction_surveys_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_satisfaction_surveys" ADD CONSTRAINT "customer_satisfaction_surveys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_satisfaction_surveys" ADD CONSTRAINT "customer_satisfaction_surveys_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;