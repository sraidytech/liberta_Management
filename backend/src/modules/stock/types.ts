import { StockMovementType, StockAlertType, AlertSeverity } from '@prisma/client';

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  minThreshold?: number;
  reorderPoint?: number;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  minThreshold?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export interface CreateLotDto {
  lotNumber: string;
  productId: string;
  warehouseId: string;
  initialQuantity: number;
  productionDate?: string | Date;
  expiryDate?: string | Date;
  unitCost?: number;
  supplierInfo?: string;
  qualityStatus?: string;
  notes?: string;
}

export interface UpdateLotDto {
  currentQuantity?: number;
  expiryDate?: string | Date;
  unitCost?: number;
  supplierInfo?: string;
  qualityStatus?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateStockMovementDto {
  movementType: StockMovementType;
  productId: string;
  lotId?: string;
  warehouseId: string;
  orderId?: string;
  userId: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  reason?: string;
  notes?: string;
}

export interface StockLevelSummary {
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  totalShipped: number;
  totalSold: number;
  averageCost?: number;
  totalValue?: number;
  minThreshold: number;
  isLowStock: boolean;
  lastMovementAt?: Date;
}

export interface LotWithDetails {
  id: string;
  lotNumber: string;
  productSku: string;
  productName: string;
  warehouseName: string;
  initialQuantity: number;
  currentQuantity: number;
  reservedQuantity: number;
  productionDate: Date;
  expiryDate?: Date;
  unitCost?: number;
  totalCost?: number;
  supplierInfo?: string;
  qualityStatus?: string;
  notes?: string;
  isActive: boolean;
  daysUntilExpiry?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovementWithDetails {
  id: string;
  movementType: StockMovementType;
  productSku: string;
  productName: string;
  lotNumber?: string;
  warehouseName: string;
  orderReference?: string;
  userName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  quantityBefore: number;
  quantityAfter: number;
  reference?: string;
  reason?: string;
  notes?: string;
  createdAt: Date;
}

export interface StockReportFilters {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  warehouseId?: string;
  movementType?: StockMovementType;
  sku?: string;
}

export interface ValuationReport {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  byProduct: Array<{
    sku: string;
    name: string;
    quantity: number;
    averageCost: number;
    totalValue: number;
  }>;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    totalQuantity: number;
    totalValue: number;
  }>;
}

export interface TurnoverReport {
  period: string;
  byProduct: Array<{
    sku: string;
    name: string;
    openingStock: number;
    received: number;
    sold: number;
    closingStock: number;
    turnoverRate: number;
    daysOfStock: number;
  }>;
}

export interface ExpiryReport {
  expiringSoon: Array<{
    lotNumber: string;
    productSku: string;
    productName: string;
    quantity: number;
    expiryDate: Date;
    daysUntilExpiry: number;
  }>;
  expired: Array<{
    lotNumber: string;
    productSku: string;
    productName: string;
    quantity: number;
    expiryDate: Date;
    daysExpired: number;
  }>;
}

export interface LowStockReport {
  products: Array<{
    sku: string;
    name: string;
    currentQuantity: number;
    minThreshold: number;
    deficit: number;
    warehouseName: string;
  }>;
}

export interface CreateAlertDto {
  productId: string;
  warehouseId: string;
  alertType: StockAlertType;
  severity: AlertSeverity;
  currentQuantity: number;
  threshold: number;
  message: string;
}

export interface DeductionResult {
  success: boolean;
  orderId: string;
  itemsProcessed: number;
  itemsSkipped: number;
  totalQuantityDeducted: number;
  errors: Array<{
    itemId: string;
    sku?: string;
    error: string;
  }>;
  movements: Array<{
    movementId: string;
    productSku: string;
    quantity: number;
    lotNumber: string;
  }>;
}