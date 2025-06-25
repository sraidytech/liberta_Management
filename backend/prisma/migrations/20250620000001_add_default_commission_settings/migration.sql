-- CreateTable
CREATE TABLE "default_commission_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_commission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_commission_settings_name_key" ON "default_commission_settings"("name");

-- Insert default commission settings
INSERT INTO "default_commission_settings" ("id", "name", "settings", "isActive", "createdAt", "updatedAt") 
VALUES (
    'default_settings_001',
    'default',
    '{
        "baseCommission": 5000,
        "tier78Bonus": 4000,
        "tier80Bonus": 4500,
        "tier82Bonus": 5000,
        "upsellBonus": 1000,
        "upsellMinPercent": 30,
        "pack2Bonus": 500,
        "pack2MinPercent": 50,
        "pack4Bonus": 600,
        "pack4MinPercent": 25
    }',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);