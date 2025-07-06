-- CreateTable
CREATE TABLE "wilaya_delivery_settings" (
    "id" TEXT NOT NULL,
    "wilayaName" TEXT NOT NULL,
    "maxDeliveryDays" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wilaya_delivery_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wilaya_delivery_settings_wilayaName_key" ON "wilaya_delivery_settings"("wilayaName");