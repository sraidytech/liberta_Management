import { prisma } from '@/config/database';
import { StockLevelSummary } from './types';
import { Prisma } from '@prisma/client';

export class StockLevelService {
  /**
   * Get or create stock level for product/warehouse
   */
  async getOrCreateStockLevel(productId: string, warehouseId: string): Promise<any> {
    let stockLevel = await prisma.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      }
    });

    if (!stockLevel) {
      stockLevel = await prisma.stockLevel.create({
        data: {
          productId,
          warehouseId,
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          totalShipped: 0,
          totalSold: 0
        }
      });
    }

    return stockLevel;
  }

  /**
   * Update stock level after movement
   */
  async updateStockLevel(
    productId: string,
    warehouseId: string,
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER',
    quantity: number,
    unitCost?: number
  ): Promise<any> {
    const stockLevel = await this.getOrCreateStockLevel(productId, warehouseId);

    let totalQuantity = stockLevel.totalQuantity;
    let availableQuantity = stockLevel.availableQuantity;

    // Update quantities based on movement type
    if (movementType === 'IN' || movementType === 'RETURN') {
      totalQuantity += quantity;
      availableQuantity += quantity;
    } else if (movementType === 'OUT') {
      totalQuantity -= quantity;
      availableQuantity -= quantity;
    } else if (movementType === 'ADJUSTMENT') {
      // Adjustment can be positive or negative
      totalQuantity += quantity;
      availableQuantity += quantity;
    }

    // Calculate average cost if unit cost provided
    let averageCost = stockLevel.averageCost;
    if (unitCost && (movementType === 'IN' || movementType === 'RETURN')) {
      const currentValue = (stockLevel.averageCost || 0) * stockLevel.totalQuantity;
      const newValue = unitCost * quantity;
      const newTotalQuantity = stockLevel.totalQuantity + quantity;
      averageCost = newTotalQuantity > 0 ? (currentValue + newValue) / newTotalQuantity : null;
    }

    // Calculate total value
    const totalValue = averageCost ? averageCost * totalQuantity : null;

    // Update stock level
    const updatedStockLevel = await prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      },
      data: {
        totalQuantity,
        availableQuantity,
        averageCost,
        totalValue,
        lastMovementAt: new Date(),
        updatedAt: new Date()
      }
    });

    return updatedStockLevel;
  }

  /**
   * Update shipped/sold counters
   */
  async updateShippedSold(
    productId: string,
    warehouseId: string,
    type: 'SHIPPED' | 'SOLD',
    quantity: number
  ): Promise<any> {
    const stockLevel = await this.getOrCreateStockLevel(productId, warehouseId);

    const updateData: any = {
      updatedAt: new Date()
    };

    if (type === 'SHIPPED') {
      updateData.totalShipped = stockLevel.totalShipped + quantity;
    } else if (type === 'SOLD') {
      updateData.totalSold = stockLevel.totalSold + quantity;
    }

    const updatedStockLevel = await prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      },
      data: updateData
    });

    return updatedStockLevel;
  }

  /**
   * Get stock level summary
   */
  async getStockLevelSummary(filters: {
    productId?: string;
    warehouseId?: string;
    lowStock?: boolean;
  }): Promise<StockLevelSummary[]> {
    const where: Prisma.StockLevelWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    let summaries = stockLevels.map(sl => ({
      productId: sl.productId,
      productSku: sl.product.sku,
      productName: sl.product.name,
      warehouseId: sl.warehouseId,
      warehouseName: sl.warehouse.name,
      totalQuantity: sl.totalQuantity,
      availableQuantity: sl.availableQuantity,
      reservedQuantity: sl.reservedQuantity,
      totalShipped: sl.totalShipped,
      totalSold: sl.totalSold,
      averageCost: sl.averageCost || undefined,
      totalValue: sl.totalValue || undefined,
      minThreshold: sl.product.minThreshold,
      isLowStock: sl.availableQuantity < sl.product.minThreshold,
      lastMovementAt: sl.lastMovementAt || undefined
    }));

    // Filter by low stock if requested
    if (filters.lowStock) {
      summaries = summaries.filter(s => s.isLowStock);
    }

    return summaries;
  }

  /**
   * Get stock level for specific product/warehouse
   */
  async getStockLevel(productId: string, warehouseId: string): Promise<any> {
    const stockLevel = await prisma.stockLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    return stockLevel;
  }

  /**
   * Recalculate stock level from lots (for reconciliation)
   */
  async recalculateStockLevel(productId: string, warehouseId: string): Promise<any> {
    // Get all active lots for this product/warehouse
    const lots = await prisma.lot.findMany({
      where: {
        productId,
        warehouseId,
        isActive: true
      }
    });

    // Calculate totals
    const totalQuantity = lots.reduce((sum, lot) => sum + lot.currentQuantity, 0);
    const reservedQuantity = lots.reduce((sum, lot) => sum + lot.reservedQuantity, 0);
    const availableQuantity = totalQuantity - reservedQuantity;

    // Calculate average cost
    const totalCost = lots.reduce((sum, lot) => {
      return sum + ((lot.unitCost || 0) * lot.currentQuantity);
    }, 0);
    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : null;
    const totalValue = averageCost ? averageCost * totalQuantity : null;

    // Update stock level
    const stockLevel = await this.getOrCreateStockLevel(productId, warehouseId);

    const updatedStockLevel = await prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId
        }
      },
      data: {
        totalQuantity,
        availableQuantity,
        reservedQuantity,
        averageCost,
        totalValue,
        updatedAt: new Date()
      }
    });

    return updatedStockLevel;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    const [
      totalProducts,
      totalStockValue,
      allStockLevels,
      outOfStockCount,
      recentMovements,
      activeAlerts
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.stockLevel.aggregate({
        _sum: { totalValue: true }
      }),
      prisma.stockLevel.findMany({
        where: {
          product: { isActive: true }
        },
        include: {
          product: true
        }
      }),
      prisma.stockLevel.count({
        where: {
          product: { isActive: true },
          availableQuantity: 0
        }
      }),
      // Get recent movements with product info
      prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { name: true, sku: true, unit: true }
          },
          warehouse: {
            select: { name: true }
          },
          lot: {
            select: { lotNumber: true }
          }
        }
      }),
      // Get active alerts (without product relation since it doesn't exist)
      prisma.stockAlert.findMany({
        where: { isResolved: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: {
            select: { name: true }
          }
        }
      })
    ]);

    // Count low stock items
    const lowStockCount = allStockLevels.filter(
      sl => sl.availableQuantity < sl.product.minThreshold && sl.availableQuantity > 0
    ).length;

    // Format recent movements for frontend
    const formattedMovements = recentMovements.map(m => ({
      id: m.id,
      type: m.movementType,
      movementType: m.movementType,
      quantity: m.quantity,
      reason: m.reason,
      reference: m.reference,
      createdAt: m.createdAt.toISOString(),
      product: m.product,
      warehouse: m.warehouse,
      lot: m.lot,
      // Also include flat fields for compatibility
      productName: m.product?.name,
      productSku: m.product?.sku,
      productUnit: m.product?.unit,
      warehouseName: m.warehouse?.name,
      lotNumber: m.lot?.lotNumber
    }));

    // Get product info for alerts (since there's no relation)
    const alertProductIds = [...new Set(activeAlerts.map(a => a.productId))];
    const alertProducts = await prisma.product.findMany({
      where: { id: { in: alertProductIds } },
      select: { id: true, name: true, sku: true, unit: true }
    });
    const productMap = new Map(alertProducts.map(p => [p.id, p]));

    // Format active alerts for frontend
    const formattedAlerts = activeAlerts.map(a => {
      const product = productMap.get(a.productId);
      return {
        id: a.id,
        alertType: a.alertType,
        severity: a.severity,
        message: a.message,
        currentQuantity: a.currentQuantity,
        threshold: a.threshold,
        createdAt: a.createdAt.toISOString(),
        product: product ? { name: product.name, sku: product.sku, unit: product.unit } : null,
        warehouse: a.warehouse,
        // Also include flat fields for compatibility
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku,
        warehouseName: a.warehouse?.name
      };
    });

    return {
      totalProducts,
      totalValue: totalStockValue._sum.totalValue || 0,
      totalStockValue: totalStockValue._sum.totalValue || 0, // Keep for backward compatibility
      lowStockCount,
      outOfStockCount,
      recentMovements: formattedMovements,
      activeAlerts: formattedAlerts
    };
  }
}

export const stockLevelService = new StockLevelService();