-- CreateTable
CREATE TABLE "order_confirmations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "ecoManagerOrderId" INTEGER NOT NULL,
    "orderReference" TEXT NOT NULL,
    "storeIdentifier" TEXT NOT NULL,
    "confirmatorId" INTEGER,
    "confirmatorName" TEXT,
    "confirmationState" TEXT,
    "orderState" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configurations" (
    "id" TEXT NOT NULL,
    "storeIdentifier" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "ecoManagerWebhookId" INTEGER,
    "webhookSecret" TEXT NOT NULL,
    "deliveryUrl" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_confirmations_orderId_key" ON "order_confirmations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_confirmations_ecoManagerOrderId_key" ON "order_confirmations"("ecoManagerOrderId");

-- CreateIndex
CREATE INDEX "order_confirmations_ecoManagerOrderId_idx" ON "order_confirmations"("ecoManagerOrderId");

-- CreateIndex
CREATE INDEX "order_confirmations_storeIdentifier_idx" ON "order_confirmations"("storeIdentifier");

-- CreateIndex
CREATE INDEX "order_confirmations_confirmatorId_idx" ON "order_confirmations"("confirmatorId");

-- CreateIndex
CREATE INDEX "order_confirmations_confirmationState_idx" ON "order_confirmations"("confirmationState");

-- CreateIndex
CREATE INDEX "order_confirmations_confirmedAt_idx" ON "order_confirmations"("confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configurations_storeIdentifier_key" ON "webhook_configurations"("storeIdentifier");

-- CreateIndex
CREATE INDEX "webhook_configurations_storeIdentifier_idx" ON "webhook_configurations"("storeIdentifier");

-- CreateIndex
CREATE INDEX "webhook_configurations_isActive_idx" ON "webhook_configurations"("isActive");

-- AddForeignKey
ALTER TABLE "order_confirmations" ADD CONSTRAINT "order_confirmations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;