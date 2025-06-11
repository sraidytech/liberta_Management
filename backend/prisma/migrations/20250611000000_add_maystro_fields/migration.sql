-- Add new Maystro integration fields to orders table
ALTER TABLE "orders" ADD COLUMN "alertedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "alertReason" TEXT;
ALTER TABLE "orders" ADD COLUMN "abortReason" TEXT;
ALTER TABLE "orders" ADD COLUMN "additionalMetaData" JSONB;

-- Add indexes for better performance
CREATE INDEX "orders_alertedAt_idx" ON "orders"("alertedAt");
CREATE INDEX "orders_additionalMetaData_idx" ON "orders" USING GIN ("additionalMetaData");