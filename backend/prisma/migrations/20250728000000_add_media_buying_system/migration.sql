-- CreateEnum
CREATE TYPE "BudgetAlertType" AS ENUM ('THRESHOLD_WARNING', 'BUDGET_EXCEEDED', 'DAILY_SPIKE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MEDIA_BUYER';

-- CreateTable
CREATE TABLE "ad_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_buying_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "sourceId" TEXT NOT NULL,
    "totalSpend" DOUBLE PRECISION NOT NULL,
    "totalLeads" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION,
    "spendInDZD" DOUBLE PRECISION,
    "storeId" TEXT,
    "productId" TEXT,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_buying_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_buying_budgets" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sourceId" TEXT,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_buying_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_alerts" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "alertType" "BudgetAlertType" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "currentSpend" DOUBLE PRECISION NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_conversions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "conversionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderValue" DOUBLE PRECISION,
    "attributionType" TEXT NOT NULL DEFAULT 'direct',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_sources_name_key" ON "ad_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ad_sources_slug_key" ON "ad_sources"("slug");

-- CreateIndex
CREATE INDEX "media_buying_entries_date_idx" ON "media_buying_entries"("date");

-- CreateIndex
CREATE INDEX "media_buying_entries_sourceId_idx" ON "media_buying_entries"("sourceId");

-- CreateIndex
CREATE INDEX "media_buying_entries_storeId_idx" ON "media_buying_entries"("storeId");

-- CreateIndex
CREATE INDEX "media_buying_entries_productId_idx" ON "media_buying_entries"("productId");

-- CreateIndex
CREATE INDEX "media_buying_entries_createdById_idx" ON "media_buying_entries"("createdById");

-- CreateIndex
CREATE INDEX "media_buying_entries_createdAt_idx" ON "media_buying_entries"("createdAt");

-- CreateIndex
CREATE INDEX "media_buying_budgets_month_year_idx" ON "media_buying_budgets"("month", "year");

-- CreateIndex
CREATE INDEX "media_buying_budgets_sourceId_idx" ON "media_buying_budgets"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "media_buying_budgets_month_year_sourceId_key" ON "media_buying_budgets"("month", "year", "sourceId");

-- CreateIndex
CREATE INDEX "budget_alerts_budgetId_idx" ON "budget_alerts"("budgetId");

-- CreateIndex
CREATE INDEX "budget_alerts_isRead_idx" ON "budget_alerts"("isRead");

-- CreateIndex
CREATE INDEX "budget_alerts_createdAt_idx" ON "budget_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "lead_conversions_entryId_idx" ON "lead_conversions"("entryId");

-- CreateIndex
CREATE INDEX "lead_conversions_orderId_idx" ON "lead_conversions"("orderId");

-- CreateIndex
CREATE INDEX "lead_conversions_conversionDate_idx" ON "lead_conversions"("conversionDate");

-- CreateIndex
CREATE UNIQUE INDEX "lead_conversions_entryId_orderId_key" ON "lead_conversions"("entryId", "orderId");

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON "exchange_rates"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");

-- AddForeignKey
ALTER TABLE "media_buying_entries" ADD CONSTRAINT "media_buying_entries_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ad_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_buying_entries" ADD CONSTRAINT "media_buying_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_buying_budgets" ADD CONSTRAINT "media_buying_budgets_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ad_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_buying_budgets" ADD CONSTRAINT "media_buying_budgets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "media_buying_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "media_buying_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversions" ADD CONSTRAINT "lead_conversions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default ad sources
INSERT INTO "ad_sources" ("id", "name", "slug", "icon", "color", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
('clsource001', 'Facebook Ads', 'facebook', 'facebook', '#1877F2', true, 1, NOW(), NOW()),
('clsource002', 'Google Ads', 'google', 'google', '#4285F4', true, 2, NOW(), NOW()),
('clsource003', 'TikTok Ads', 'tiktok', 'tiktok', '#000000', true, 3, NOW(), NOW()),
('clsource004', 'Instagram Ads', 'instagram', 'instagram', '#E4405F', true, 4, NOW(), NOW()),
('clsource005', 'Snapchat Ads', 'snapchat', 'snapchat', '#FFFC00', true, 5, NOW(), NOW()),
('clsource006', 'Influencer Marketing', 'influencer', 'users', '#9333EA', true, 6, NOW(), NOW()),
('clsource007', 'Other', 'other', 'more-horizontal', '#6B7280', true, 99, NOW(), NOW());