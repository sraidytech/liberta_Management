import { prisma } from '@/config/database';
import { Prisma, StockMovementType } from '@prisma/client';

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
}

export interface OverviewData {
  totalValue: number;
  totalProducts: number;
  totalLots: number;
  avgTurnoverRate: number;
  valueHistory: { date: string; value: number }[];
  categoryDistribution: { name: string; value: number }[];
  topProducts: { name: string; value: number; quantity: number }[];
}

export interface MovementAnalytics {
  trend: { date: string; in: number; out: number; adjustment: number; transfer: number; return: number }[];
  typeDistribution: { type: string; count: number; quantity: number }[];
  topProducts: { name: string; inQuantity: number; outQuantity: number; netChange: number }[];
  summary: { period: string; in: number; out: number; net: number }[];
}

export interface HealthAnalytics {
  levelDistribution: { status: string; count: number; percentage: number }[];
  expiryAnalysis: { range: string; count: number; value: number; products: { name: string; quantity: number; expiryDate: string }[] }[];
  agingAnalysis: { range: string; count: number; value: number }[];
  reorderList: { productId: string; productName: string; sku: string; current: number; reorderPoint: number; toOrder: number; warehouseName: string }[];
}

export interface WarehouseAnalytics {
  stats: { id: string; name: string; code: string; totalValue: number; totalQuantity: number; productCount: number; utilization: number }[];
  comparison: { warehouseId: string; warehouseName: string; inMovements: number; outMovements: number; netChange: number }[];
}

export class AnalyticsService {
  /**
   * Get overview analytics data
   */
  async getOverviewAnalytics(filters: AnalyticsFilters): Promise<OverviewData> {
    const { startDate, endDate, warehouseId } = filters;
    
    // Default date range: last 30 days
    const defaultEndDate = endDate || new Date();
    const defaultStartDate = startDate || new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total stock value and products
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere,
      include: {
        product: true,
        warehouse: true
      }
    });

    const totalValue = stockLevels.reduce((sum, sl) => sum + (sl.totalValue || 0), 0);
    const totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.totalQuantity, 0);

    // Get total products count
    const totalProducts = await prisma.product.count({
      where: { isActive: true }
    });

    // Get total lots count
    const lotWhere: Prisma.LotWhereInput = { isActive: true };
    if (warehouseId) {
      lotWhere.warehouseId = warehouseId;
    }
    const totalLots = await prisma.lot.count({ where: lotWhere });

    // Calculate average turnover rate
    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: defaultStartDate,
        lte: defaultEndDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }

    const outMovements = await prisma.stockMovement.aggregate({
      where: {
        ...movementWhere,
        movementType: 'OUT'
      },
      _sum: { quantity: true }
    });

    const avgInventory = totalQuantity > 0 ? totalQuantity : 1;
    const avgTurnoverRate = (outMovements._sum.quantity || 0) / avgInventory;

    // Get value history (daily stock value over time)
    const valueHistory = await this.getValueHistory(defaultStartDate, defaultEndDate, warehouseId);

    // Get category distribution
    const categoryDistribution = await this.getCategoryDistribution(warehouseId);

    // Get top products by value
    const topProducts = await this.getTopProductsByValue(warehouseId, 10);

    return {
      totalValue,
      totalProducts,
      totalLots,
      avgTurnoverRate: Math.round(avgTurnoverRate * 100) / 100,
      valueHistory,
      categoryDistribution,
      topProducts
    };
  }

  /**
   * Get movement analytics data
   */
  async getMovementAnalytics(filters: AnalyticsFilters): Promise<MovementAnalytics> {
    const { startDate, endDate, warehouseId, productId } = filters;
    
    const defaultEndDate = endDate || new Date();
    const defaultStartDate = startDate || new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: defaultStartDate,
        lte: defaultEndDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }
    if (productId) {
      movementWhere.productId = productId;
    }

    // Get movement trend (daily)
    const trend = await this.getMovementTrend(defaultStartDate, defaultEndDate, warehouseId, productId);

    // Get type distribution
    const typeDistribution = await this.getTypeDistribution(movementWhere);

    // Get top products by movement volume
    const topProducts = await this.getTopProductsByMovement(defaultStartDate, defaultEndDate, warehouseId, 10);

    // Get summary (daily, weekly, monthly)
    const summary = await this.getMovementSummary(defaultStartDate, defaultEndDate, warehouseId);

    return {
      trend,
      typeDistribution,
      topProducts,
      summary
    };
  }

  /**
   * Get health analytics data
   */
  async getHealthAnalytics(filters: AnalyticsFilters): Promise<HealthAnalytics> {
    const { warehouseId } = filters;

    // Get stock level distribution
    const levelDistribution = await this.getStockLevelDistribution(warehouseId);

    // Get expiry analysis
    const expiryAnalysis = await this.getExpiryAnalysis(warehouseId);

    // Get aging analysis
    const agingAnalysis = await this.getAgingAnalysis(warehouseId);

    // Get reorder recommendations
    const reorderList = await this.getReorderRecommendations(warehouseId);

    return {
      levelDistribution,
      expiryAnalysis,
      agingAnalysis,
      reorderList
    };
  }

  /**
   * Get warehouse analytics data
   */
  async getWarehouseAnalytics(filters: AnalyticsFilters): Promise<WarehouseAnalytics> {
    const { startDate, endDate } = filters;
    
    const defaultEndDate = endDate || new Date();
    const defaultStartDate = startDate || new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get warehouse stats
    const stats = await this.getWarehouseStats();

    // Get warehouse comparison
    const comparison = await this.getWarehouseComparison(defaultStartDate, defaultEndDate);

    return {
      stats,
      comparison
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getValueHistory(startDate: Date, endDate: Date, warehouseId?: string): Promise<{ date: string; value: number }[]> {
    // Generate daily value history based on movements
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const history: { date: string; value: number }[] = [];

    // Get current total value
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const currentStockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere
    });
    let currentValue = currentStockLevels.reduce((sum, sl) => sum + (sl.totalValue || 0), 0);

    // Get all movements in the period, ordered by date descending
    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }

    const movements = await prisma.stockMovement.findMany({
      where: movementWhere,
      orderBy: { createdAt: 'desc' }
    });

    // Group movements by date
    const movementsByDate = new Map<string, number>();
    for (const movement of movements) {
      const dateKey = movement.createdAt.toISOString().split('T')[0];
      const valueChange = (movement.totalCost || 0) * (movement.movementType === 'IN' || movement.movementType === 'RETURN' ? 1 : -1);
      movementsByDate.set(dateKey, (movementsByDate.get(dateKey) || 0) + valueChange);
    }

    // Build history from end to start
    for (let i = 0; i <= days; i++) {
      const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      history.unshift({
        date: dateKey,
        value: Math.round(currentValue * 100) / 100
      });

      // Subtract the day's movements to get previous day's value
      const dayChange = movementsByDate.get(dateKey) || 0;
      currentValue -= dayChange;
    }

    return history;
  }

  private async getCategoryDistribution(warehouseId?: string): Promise<{ name: string; value: number }[]> {
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere,
      include: {
        product: true
      }
    });

    const categoryMap = new Map<string, number>();
    for (const sl of stockLevels) {
      const category = sl.product.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (sl.totalValue || 0));
    }

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }

  private async getTopProductsByValue(warehouseId: string | undefined, limit: number): Promise<{ name: string; value: number; quantity: number }[]> {
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere,
      include: {
        product: true
      },
      orderBy: {
        totalValue: 'desc'
      },
      take: limit
    });

    return stockLevels.map(sl => ({
      name: sl.product.name,
      value: Math.round((sl.totalValue || 0) * 100) / 100,
      quantity: sl.totalQuantity
    }));
  }

  private async getMovementTrend(
    startDate: Date, 
    endDate: Date, 
    warehouseId?: string,
    productId?: string
  ): Promise<{ date: string; in: number; out: number; adjustment: number; transfer: number; return: number }[]> {
    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }
    if (productId) {
      movementWhere.productId = productId;
    }

    const movements = await prisma.stockMovement.findMany({
      where: movementWhere,
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const trendMap = new Map<string, { in: number; out: number; adjustment: number; transfer: number; return: number }>();
    
    // Initialize all dates in range
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trendMap.set(dateKey, { in: 0, out: 0, adjustment: 0, transfer: 0, return: 0 });
    }

    // Aggregate movements
    for (const movement of movements) {
      const dateKey = movement.createdAt.toISOString().split('T')[0];
      const existing = trendMap.get(dateKey) || { in: 0, out: 0, adjustment: 0, transfer: 0, return: 0 };
      
      switch (movement.movementType) {
        case 'IN':
          existing.in += movement.quantity;
          break;
        case 'OUT':
          existing.out += movement.quantity;
          break;
        case 'ADJUSTMENT':
          existing.adjustment += movement.quantity;
          break;
        case 'TRANSFER':
          existing.transfer += movement.quantity;
          break;
        case 'RETURN':
          existing.return += movement.quantity;
          break;
      }
      
      trendMap.set(dateKey, existing);
    }

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTypeDistribution(where: Prisma.StockMovementWhereInput): Promise<{ type: string; count: number; quantity: number }[]> {
    const movements = await prisma.stockMovement.groupBy({
      by: ['movementType'],
      where,
      _count: { id: true },
      _sum: { quantity: true }
    });

    return movements.map(m => ({
      type: m.movementType,
      count: m._count.id,
      quantity: m._sum.quantity || 0
    }));
  }

  private async getTopProductsByMovement(
    startDate: Date,
    endDate: Date,
    warehouseId: string | undefined,
    limit: number
  ): Promise<{ name: string; inQuantity: number; outQuantity: number; netChange: number }[]> {
    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }

    const movements = await prisma.stockMovement.findMany({
      where: movementWhere,
      include: {
        product: true
      }
    });

    // Aggregate by product
    const productMap = new Map<string, { name: string; inQuantity: number; outQuantity: number }>();
    
    for (const movement of movements) {
      const existing = productMap.get(movement.productId) || { 
        name: movement.product.name, 
        inQuantity: 0, 
        outQuantity: 0 
      };
      
      if (movement.movementType === 'IN' || movement.movementType === 'RETURN') {
        existing.inQuantity += movement.quantity;
      } else if (movement.movementType === 'OUT') {
        existing.outQuantity += movement.quantity;
      }
      
      productMap.set(movement.productId, existing);
    }

    return Array.from(productMap.values())
      .map(p => ({
        ...p,
        netChange: p.inQuantity - p.outQuantity
      }))
      .sort((a, b) => (b.inQuantity + b.outQuantity) - (a.inQuantity + a.outQuantity))
      .slice(0, limit);
  }

  private async getMovementSummary(
    startDate: Date,
    endDate: Date,
    warehouseId?: string
  ): Promise<{ period: string; in: number; out: number; net: number }[]> {
    const movementWhere: Prisma.StockMovementWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }

    const movements = await prisma.stockMovement.findMany({
      where: movementWhere
    });

    // Group by week
    const weekMap = new Map<string, { in: number; out: number }>();
    
    for (const movement of movements) {
      const weekStart = this.getWeekStart(movement.createdAt);
      const weekKey = weekStart.toISOString().split('T')[0];
      const existing = weekMap.get(weekKey) || { in: 0, out: 0 };
      
      if (movement.movementType === 'IN' || movement.movementType === 'RETURN') {
        existing.in += movement.quantity;
      } else if (movement.movementType === 'OUT') {
        existing.out += movement.quantity;
      }
      
      weekMap.set(weekKey, existing);
    }

    return Array.from(weekMap.entries())
      .map(([period, data]) => ({
        period: `Week of ${period}`,
        in: data.in,
        out: data.out,
        net: data.in - data.out
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private async getStockLevelDistribution(warehouseId?: string): Promise<{ status: string; count: number; percentage: number }[]> {
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere,
      include: {
        product: true
      }
    });

    let lowStock = 0;
    let normal = 0;
    let overstock = 0;
    let outOfStock = 0;

    for (const sl of stockLevels) {
      const minThreshold = sl.product.minThreshold || 100;
      const maxThreshold = minThreshold * 3; // Assume max is 3x min

      if (sl.totalQuantity === 0) {
        outOfStock++;
      } else if (sl.totalQuantity < minThreshold) {
        lowStock++;
      } else if (sl.totalQuantity > maxThreshold) {
        overstock++;
      } else {
        normal++;
      }
    }

    const total = stockLevels.length || 1;

    return [
      { status: 'Out of Stock', count: outOfStock, percentage: Math.round((outOfStock / total) * 100) },
      { status: 'Low Stock', count: lowStock, percentage: Math.round((lowStock / total) * 100) },
      { status: 'Normal', count: normal, percentage: Math.round((normal / total) * 100) },
      { status: 'Overstock', count: overstock, percentage: Math.round((overstock / total) * 100) }
    ];
  }

  private async getExpiryAnalysis(warehouseId?: string): Promise<{ range: string; count: number; value: number; products: { name: string; quantity: number; expiryDate: string }[] }[]> {
    const lotWhere: Prisma.LotWhereInput = {
      isActive: true,
      expiryDate: { not: null }
    };
    if (warehouseId) {
      lotWhere.warehouseId = warehouseId;
    }

    const lots = await prisma.lot.findMany({
      where: lotWhere,
      include: {
        product: true
      }
    });

    const now = new Date();
    const ranges = [
      { label: 'Expired', days: 0 },
      { label: 'Within 7 days', days: 7 },
      { label: 'Within 30 days', days: 30 },
      { label: 'Within 60 days', days: 60 },
      { label: 'Within 90 days', days: 90 }
    ];

    const result: { range: string; count: number; value: number; products: { name: string; quantity: number; expiryDate: string }[] }[] = [];

    for (const range of ranges) {
      const filteredLots = lots.filter(lot => {
        if (!lot.expiryDate) return false;
        const daysUntilExpiry = Math.ceil((lot.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        if (range.days === 0) {
          return daysUntilExpiry < 0;
        } else if (range.days === 7) {
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
        } else if (range.days === 30) {
          return daysUntilExpiry > 7 && daysUntilExpiry <= 30;
        } else if (range.days === 60) {
          return daysUntilExpiry > 30 && daysUntilExpiry <= 60;
        } else {
          return daysUntilExpiry > 60 && daysUntilExpiry <= 90;
        }
      });

      result.push({
        range: range.label,
        count: filteredLots.length,
        value: filteredLots.reduce((sum, lot) => sum + (lot.totalCost || 0), 0),
        products: filteredLots.slice(0, 5).map(lot => ({
          name: lot.product.name,
          quantity: lot.currentQuantity,
          expiryDate: lot.expiryDate?.toISOString().split('T')[0] || ''
        }))
      });
    }

    return result;
  }

  private async getAgingAnalysis(warehouseId?: string): Promise<{ range: string; count: number; value: number }[]> {
    const lotWhere: Prisma.LotWhereInput = {
      isActive: true
    };
    if (warehouseId) {
      lotWhere.warehouseId = warehouseId;
    }

    const lots = await prisma.lot.findMany({
      where: lotWhere
    });

    const now = new Date();
    const ranges = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91-180 days', min: 91, max: 180 },
      { label: '180+ days', min: 181, max: Infinity }
    ];

    return ranges.map(range => {
      const filteredLots = lots.filter(lot => {
        const age = Math.ceil((now.getTime() - lot.receivedDate.getTime()) / (24 * 60 * 60 * 1000));
        return age >= range.min && age <= range.max;
      });

      return {
        range: range.label,
        count: filteredLots.length,
        value: filteredLots.reduce((sum, lot) => sum + (lot.totalCost || 0), 0)
      };
    });
  }

  private async getReorderRecommendations(warehouseId?: string): Promise<{ productId: string; productName: string; sku: string; current: number; reorderPoint: number; toOrder: number; warehouseName: string }[]> {
    const stockLevelWhere: Prisma.StockLevelWhereInput = {};
    if (warehouseId) {
      stockLevelWhere.warehouseId = warehouseId;
    }

    const stockLevels = await prisma.stockLevel.findMany({
      where: stockLevelWhere,
      include: {
        product: true,
        warehouse: true
      }
    });

    const recommendations: { productId: string; productName: string; sku: string; current: number; reorderPoint: number; toOrder: number; warehouseName: string }[] = [];

    for (const sl of stockLevels) {
      const reorderPoint = sl.product.reorderPoint || sl.product.minThreshold || 100;
      
      if (sl.totalQuantity < reorderPoint) {
        const optimalStock = reorderPoint * 2; // Target 2x reorder point
        recommendations.push({
          productId: sl.productId,
          productName: sl.product.name,
          sku: sl.product.sku,
          current: sl.totalQuantity,
          reorderPoint,
          toOrder: optimalStock - sl.totalQuantity,
          warehouseName: sl.warehouse.name
        });
      }
    }

    return recommendations.sort((a, b) => (a.current / a.reorderPoint) - (b.current / b.reorderPoint));
  }

  private async getWarehouseStats(): Promise<{ id: string; name: string; code: string; totalValue: number; totalQuantity: number; productCount: number; utilization: number }[]> {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        stockLevels: {
          include: {
            product: true
          }
        }
      }
    });

    return warehouses.map(warehouse => {
      const totalValue = warehouse.stockLevels.reduce((sum, sl) => sum + (sl.totalValue || 0), 0);
      const totalQuantity = warehouse.stockLevels.reduce((sum, sl) => sum + sl.totalQuantity, 0);
      const productCount = warehouse.stockLevels.length;
      
      // Calculate utilization based on products with stock vs total products
      const totalProducts = warehouse.stockLevels.length;
      const productsWithStock = warehouse.stockLevels.filter(sl => sl.totalQuantity > 0).length;
      const utilization = totalProducts > 0 ? Math.round((productsWithStock / totalProducts) * 100) : 0;

      return {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        totalValue: Math.round(totalValue * 100) / 100,
        totalQuantity,
        productCount,
        utilization
      };
    });
  }

  private async getWarehouseComparison(startDate: Date, endDate: Date): Promise<{ warehouseId: string; warehouseName: string; inMovements: number; outMovements: number; netChange: number }[]> {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true }
    });

    const result: { warehouseId: string; warehouseName: string; inMovements: number; outMovements: number; netChange: number }[] = [];

    for (const warehouse of warehouses) {
      const movements = await prisma.stockMovement.findMany({
        where: {
          warehouseId: warehouse.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      let inMovements = 0;
      let outMovements = 0;

      for (const movement of movements) {
        if (movement.movementType === 'IN' || movement.movementType === 'RETURN') {
          inMovements += movement.quantity;
        } else if (movement.movementType === 'OUT') {
          outMovements += movement.quantity;
        }
      }

      result.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        inMovements,
        outMovements,
        netChange: inMovements - outMovements
      });
    }

    return result;
  }
}

export const analyticsService = new AnalyticsService();