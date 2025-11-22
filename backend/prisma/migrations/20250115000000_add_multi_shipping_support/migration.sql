-- CreateTable: ShippingCompany
CREATE TABLE "shipping_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ShippingAccount
CREATE TABLE "shipping_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "lastTestAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add optional shipping account link to api_configurations
ALTER TABLE "api_configurations" ADD COLUMN "shippingAccountId" TEXT;

-- AlterTable: Add optional shipping account link to orders
ALTER TABLE "orders" ADD COLUMN "shippingAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shipping_companies_name_key" ON "shipping_companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_companies_slug_key" ON "shipping_companies"("slug");

-- AddForeignKey
ALTER TABLE "api_configurations" ADD CONSTRAINT "api_configurations_shippingAccountId_fkey" FOREIGN KEY ("shippingAccountId") REFERENCES "shipping_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAccountId_fkey" FOREIGN KEY ("shippingAccountId") REFERENCES "shipping_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_accounts" ADD CONSTRAINT "shipping_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "shipping_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed initial shipping companies
INSERT INTO "shipping_companies" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES 
    (gen_random_uuid()::text, 'Maystro', 'maystro', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Guepex', 'guepex', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'Nord West', 'nord_west', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);