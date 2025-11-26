import { prisma } from '@/config/database';
import { 
  StockReportFilters, 
  ValuationReport, 
  TurnoverReport, 
  ExpiryReport, 
  LowStockReport 
} from './types';

export class ReportService {
  /**
   * Generate stock level report
   */
  async generateStockLevelReport(filters: StockReportFilters): Promise<any> {
    const where: any = {};

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
        product: {
          sku: 'asc'
        }
      }
    });

    return {
      generatedAt: new Date(),
      filters,
      data: stockLevels.map(sl => ({
        productSku: sl.product.sku,
        productName: sl.product.name,
        warehouseName: sl.warehouse.name,
        totalQuantity: sl.totalQuantity,
        availableQuantity: sl.availableQuantity,
        reservedQuantity: sl.reservedQuantity,
        totalShipped: sl.totalShipped,
        totalSold: sl.totalSold,
        averageCost: sl.averageCost,
        totalValue: sl.totalValue,
        minThreshold: sl.product.minThreshold,
        status: sl.availableQuantity === 0 ? 'OUT_OF_STOCK' : 
                sl.availableQuantity < sl.product.minThreshold ? 'LOW_STOCK' : 'IN_STOCK'
      }))
    };
  }

  /**
   * Generate movement report
   */
  async generateMovementReport(filters: StockReportFilters): Promise<any> {
    const where: any = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        lot: true,
        warehouse: true,
        user: true,
        order: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate summary by movement type
    const summary = await prisma.stockMovement.groupBy({
      by: ['movementType'],
      where,
      _sum: {
        quantity: true,
        totalCost: true
      },
      _count: {
        id: true
      }
    });

    return {
      generatedAt: new Date(),
      filters,
      summary: summary.map(s => ({
        movementType: s.movementType,
        totalQuantity: s._sum.quantity || 0,
        totalCost: s._sum.totalCost || 0,
        count: s._count.id
      })),
      movements: movements.map(m => ({
        date: m.createdAt,
        movementType: m.movementType,
        productSku: m.product.sku,
        productName: m.product.name,
        lotNumber: m.lot?.lotNumber,
        warehouseName: m.warehouse.name,
        orderReference: m.order?.reference,
        userName: m.user.name || m.user.email,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
        quantityBefore: m.quantityBefore,
        quantityAfter: m.quantityAfter,
        reference: m.reference,
        reason: m.reason
      }))
    };
  }

  /**
   * Generate expiry report
   */
  async generateExpiryReport(daysAhead: number = 30): Promise<ExpiryReport> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get expiring soon lots
    const expiringSoon = await prisma.lot.findMany({
      where: {
        isActive: true,
        currentQuantity: { gt: 0 },
        expiryDate: {
          gte: now,
          lte: futureDate
        }
      },
      include: {
        product: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    // Get expired lots
    const expired = await prisma.lot.findMany({
      where: {
        isActive: true,
        currentQuantity: { gt: 0 },
        expiryDate: {
          lt: now
        }
      },
      include: {
        product: true
      },
      orderBy: {
        expiryDate: 'desc'
      }
    });

    return {
      expiringSoon: expiringSoon.map(lot => ({
        lotNumber: lot.lotNumber,
        productSku: lot.product.sku,
        productName: lot.product.name,
        quantity: lot.currentQuantity,
        expiryDate: lot.expiryDate!,
        daysUntilExpiry: Math.ceil(
          (lot.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      })),
      expired: expired.map(lot => ({
        lotNumber: lot.lotNumber,
        productSku: lot.product.sku,
        productName: lot.product.name,
        quantity: lot.currentQuantity,
        expiryDate: lot.expiryDate!,
        daysExpired: Math.ceil(
          (now.getTime() - lot.expiryDate!.getTime()) / (1000 * 60 * 60 * 24)
        )
      }))
    };
  }

  /**
   * Generate valuation report
   */
  async generateValuationReport(filters: StockReportFilters): Promise<ValuationReport> {
    const where: any = {};

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      }
    });

    const totalProducts = new Set(stockLevels.map(sl => sl.productId)).size;
    const totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.totalQuantity, 0);
    const totalValue = stockLevels.reduce((sum, sl) => sum + (sl.totalValue || 0), 0);

    // Group by product
    const byProduct = stockLevels.map(sl => ({
      sku: sl.product.sku,
      name: sl.product.name,
      quantity: sl.totalQuantity,
      averageCost: sl.averageCost || 0,
      totalValue: sl.totalValue || 0
    }));

    // Group by warehouse
    const warehouseMap = new Map<string, { warehouseId: string; warehouseName: string; totalQuantity: number; totalValue: number }>();
    
    stockLevels.forEach(sl => {
      const existing = warehouseMap.get(sl.warehouseId);
      if (existing) {
        existing.totalQuantity += sl.totalQuantity;
        existing.totalValue += sl.totalValue || 0;
      } else {
        warehouseMap.set(sl.warehouseId, {
          warehouseId: sl.warehouseId,
          warehouseName: sl.warehouse.name,
          totalQuantity: sl.totalQuantity,
          totalValue: sl.totalValue || 0
        });
      }
    });

    return {
      totalProducts,
      totalQuantity,
      totalValue,
      byProduct,
      byWarehouse: Array.from(warehouseMap.values())
    };
  }

  /**
   * Generate turnover report
   */
  async generateTurnoverReport(filters: StockReportFilters): Promise<TurnoverReport> {
    const startDate = filters.startDate || new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = filters.endDate || new Date();

    const where: any = {};
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    // Get all products
    const products = await prisma.product.findMany({
      where: filters.productId ? { id: filters.productId } : { isActive: true },
      include: {
        stockLevels: {
          where: filters.warehouseId ? { warehouseId: filters.warehouseId } : {}
        }
      }
    });

    const byProduct = await Promise.all(
      products.map(async (product) => {
        // Get movements in period
        const movements = await prisma.stockMovement.findMany({
          where: {
            productId: product.id,
            ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        const received = movements
          .filter(m => m.movementType === 'IN' || m.movementType === 'RETURN')
          .reduce((sum, m) => sum + m.quantity, 0);

        const sold = movements
          .filter(m => m.movementType === 'OUT')
          .reduce((sum, m) => sum + m.quantity, 0);

        const currentStock = product.stockLevels.reduce((sum, sl) => sum + sl.totalQuantity, 0);
        const openingStock = currentStock - received + sold;

        // Calculate turnover rate (times stock turned over in period)
        const avgStock = (openingStock + currentStock) / 2;
        const turnoverRate = avgStock > 0 ? sold / avgStock : 0;

        // Calculate days of stock remaining
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailySales = daysDiff > 0 ? sold / daysDiff : 0;
        const daysOfStock = dailySales > 0 ? currentStock / dailySales : 999;

        return {
          sku: product.sku,
          name: product.name,
          openingStock,
          received,
          sold,
          closingStock: currentStock,
          turnoverRate: Math.round(turnoverRate * 100) / 100,
          daysOfStock: Math.round(daysOfStock)
        };
      })
    );

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      byProduct
    };
  }

  /**
   * Generate low stock report
   */
  async generateLowStockReport(filters: StockReportFilters): Promise<LowStockReport> {
    const where: any = {};

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      }
    });

    const lowStockProducts = stockLevels
      .filter(sl => sl.availableQuantity < sl.product.minThreshold)
      .map(sl => ({
        sku: sl.product.sku,
        name: sl.product.name,
        currentQuantity: sl.availableQuantity,
        minThreshold: sl.product.minThreshold,
        deficit: sl.product.minThreshold - sl.availableQuantity,
        warehouseName: sl.warehouse.name
      }))
      .sort((a, b) => b.deficit - a.deficit);

    return {
      products: lowStockProducts
    };
  }

  /**
   * Export report to CSV format
   */
  async exportReportToCSV(reportType: string, filters: StockReportFilters): Promise<string> {
    let data: any;
    let headers: string[];
    let rows: string[][];

    switch (reportType) {
      case 'stock-level':
        data = await this.generateStockLevelReport(filters);
        headers = ['SKU', 'Product', 'Warehouse', 'Total Qty', 'Available', 'Reserved', 'Shipped', 'Sold', 'Avg Cost', 'Total Value', 'Status'];
        rows = data.data.map((item: any) => [
          item.productSku,
          item.productName,
          item.warehouseName,
          item.totalQuantity.toString(),
          item.availableQuantity.toString(),
          item.reservedQuantity.toString(),
          item.totalShipped.toString(),
          item.totalSold.toString(),
          (item.averageCost || 0).toFixed(2),
          (item.totalValue || 0).toFixed(2),
          item.status
        ]);
        break;

      case 'low-stock':
        data = await this.generateLowStockReport(filters);
        headers = ['SKU', 'Product', 'Current Qty', 'Min Threshold', 'Deficit', 'Warehouse'];
        rows = data.products.map((item: any) => [
          item.sku,
          item.name,
          item.currentQuantity.toString(),
          item.minThreshold.toString(),
          item.deficit.toString(),
          item.warehouseName
        ]);
        break;

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Generate CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

export const reportService = new ReportService();