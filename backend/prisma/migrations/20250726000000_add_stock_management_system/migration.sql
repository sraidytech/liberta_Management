-- Add STOCK_MANAGEMENT_AGENT role to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STOCK_MANAGEMENT_AGENT';

-- Add stock management fields to User table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stockMovements" TEXT[];

-- Add stock management fields to Order table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stockDeducted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stockDeductedAt" TIMESTAMP(3);

-- Create Product table
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "minThreshold" INTEGER NOT NULL DEFAULT 100,
    "reorderPoint" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- Create Warehouse table
CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- Create Lot table
CREATE TABLE IF NOT EXISTS "lots" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "supplierInfo" TEXT,
    "qualityStatus" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- Create StockMovementType enum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER');

-- Create StockMovement table
CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "productId" TEXT NOT NULL,
    "lotId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- Create StockLevel table
CREATE TABLE IF NOT EXISTS "stock_levels" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalShipped" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "averageCost" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "lastMovementAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- Create StockAlertType enum
CREATE TYPE "StockAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING_SOON', 'EXPIRED', 'NEGATIVE_STOCK', 'MISSING_SKU', 'INSUFFICIENT_STOCK');

-- Create AlertSeverity enum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- Create StockAlert table
CREATE TABLE IF NOT EXISTS "stock_alerts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "alertType" "StockAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_key" ON "warehouses"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "lots_lotNumber_key" ON "lots"("lotNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_levels_productId_warehouseId_key" ON "stock_levels"("productId", "warehouseId");

-- Create indexes for products
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_isActive_idx" ON "products"("isActive");

-- Create indexes for lots
CREATE INDEX IF NOT EXISTS "lots_productId_idx" ON "lots"("productId");
CREATE INDEX IF NOT EXISTS "lots_warehouseId_idx" ON "lots"("warehouseId");
CREATE INDEX IF NOT EXISTS "lots_expiryDate_idx" ON "lots"("expiryDate");
CREATE INDEX IF NOT EXISTS "lots_isActive_idx" ON "lots"("isActive");

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS "stock_movements_movementType_idx" ON "stock_movements"("movementType");
CREATE INDEX IF NOT EXISTS "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX IF NOT EXISTS "stock_movements_lotId_idx" ON "stock_movements"("lotId");
CREATE INDEX IF NOT EXISTS "stock_movements_warehouseId_idx" ON "stock_movements"("warehouseId");
CREATE INDEX IF NOT EXISTS "stock_movements_orderId_idx" ON "stock_movements"("orderId");
CREATE INDEX IF NOT EXISTS "stock_movements_userId_idx" ON "stock_movements"("userId");
CREATE INDEX IF NOT EXISTS "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- Create indexes for stock_levels
CREATE INDEX IF NOT EXISTS "stock_levels_productId_idx" ON "stock_levels"("productId");
CREATE INDEX IF NOT EXISTS "stock_levels_warehouseId_idx" ON "stock_levels"("warehouseId");

-- Create indexes for stock_alerts
CREATE INDEX IF NOT EXISTS "stock_alerts_productId_idx" ON "stock_alerts"("productId");
CREATE INDEX IF NOT EXISTS "stock_alerts_warehouseId_idx" ON "stock_alerts"("warehouseId");
CREATE INDEX IF NOT EXISTS "stock_alerts_alertType_idx" ON "stock_alerts"("alertType");
CREATE INDEX IF NOT EXISTS "stock_alerts_isResolved_idx" ON "stock_alerts"("isResolved");
CREATE INDEX IF NOT EXISTS "stock_alerts_createdAt_idx" ON "stock_alerts"("createdAt");

-- Add foreign key constraints
ALTER TABLE "lots" ADD CONSTRAINT "lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lots" ADD CONSTRAINT "lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default warehouse
INSERT INTO "warehouses" ("id", "code", "name", "isActive", "isPrimary", "createdAt", "updatedAt")
VALUES (
    'default_warehouse_001',
    'WH-MAIN',
    'Main Warehouse',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;