-- CreateTable
CREATE TABLE "agent_product_confirmation_rates" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "confirmationRate" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_product_confirmation_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_product_confirmation_rates_agentId_productName_startDate_key" ON "agent_product_confirmation_rates"("agentId", "productName", "startDate");

-- AddForeignKey
ALTER TABLE "agent_product_confirmation_rates" ADD CONSTRAINT "agent_product_confirmation_rates_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;