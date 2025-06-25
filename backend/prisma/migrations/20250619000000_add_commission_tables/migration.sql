-- CreateTable
CREATE TABLE "product_commissions" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "packQuantity" INTEGER NOT NULL,
    "commissionCriteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_commission_rates" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "confirmationRate" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_commissions_productName_key" ON "product_commissions"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "agent_commission_rates_agentId_period_startDate_key" ON "agent_commission_rates"("agentId", "period", "startDate");

-- AddForeignKey
ALTER TABLE "agent_commission_rates" ADD CONSTRAINT "agent_commission_rates_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;