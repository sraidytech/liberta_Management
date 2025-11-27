import { Request, Response } from 'express';
import { productService } from './product.service';
import { lotService } from './lot.service';
import { movementService } from './movement.service';
import { stockLevelService } from './stock-level.service';
import { alertService } from './alert.service';
import { reportService } from './report.service';
import { warehouseService } from './warehouse.service';
import { productSyncService } from './product-sync.service';
import { analyticsService } from './analytics.service';

export class StockController {
  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(req: Request, res: Response) {
    try {
      const { isActive, category, search, lowStock, page, limit } = req.query;

      const result = await productService.getProducts({
        // Only set isActive filter if explicitly provided, default to true (show active products)
        isActive: isActive !== undefined ? isActive === 'true' : true,
        category: category as string,
        search: search as string,
        lowStock: lowStock === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: { message: 'Product not found' }
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async createProduct(req: Request, res: Response) {
    try {
      const product = await productService.createProduct(req.body);

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id, req.body);

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deactivated successfully'
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await productService.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // LOTS
  // ============================================

  async getLots(req: Request, res: Response) {
    try {
      const { productId, warehouseId, isActive, expiringBefore, search, page, limit } = req.query;

      const result = await lotService.getLots({
        productId: productId as string,
        warehouseId: warehouseId as string,
        // Only filter by isActive if explicitly provided, default to true (show active lots)
        isActive: isActive !== undefined ? isActive === 'true' : true,
        expiringBefore: expiringBefore ? new Date(expiringBefore as string) : undefined,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching lots:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getLotById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lot = await lotService.getLotById(id);

      if (!lot) {
        return res.status(404).json({
          success: false,
          error: { message: 'Lot not found' }
        });
      }

      res.json({
        success: true,
        data: lot
      });
    } catch (error: any) {
      console.error('Error fetching lot:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async createLot(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const lot = await lotService.createLot(req.body);

      // Update stock level
      await stockLevelService.updateStockLevel(
        lot.productId,
        lot.warehouseId,
        'IN',
        lot.initialQuantity,
        lot.unitCost
      );

      // Create stock movement
      await movementService.createMovement({
        movementType: 'IN',
        productId: lot.productId,
        lotId: lot.id,
        warehouseId: lot.warehouseId,
        userId: userId || 'system',
        quantity: lot.initialQuantity,
        unitCost: lot.unitCost,
        reference: `Lot ${lot.lotNumber}`,
        reason: 'New lot received'
      });

      res.status(201).json({
        success: true,
        data: lot
      });
    } catch (error: any) {
      console.error('Error creating lot:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async updateLot(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const lot = await lotService.updateLot(id, req.body);

      res.json({
        success: true,
        data: lot
      });
    } catch (error: any) {
      console.error('Error updating lot:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async deleteLot(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await lotService.deleteLot(id);

      res.json({
        success: true,
        message: 'Lot deactivated successfully'
      });
    } catch (error: any) {
      console.error('Error deleting lot:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // MOVEMENTS
  // ============================================

  async getMovements(req: Request, res: Response) {
    try {
      const { productId, warehouseId, orderId, userId, movementType, startDate, endDate, page, limit } = req.query;

      const result = await movementService.getMovements({
        productId: productId as string,
        warehouseId: warehouseId as string,
        orderId: orderId as string,
        userId: userId as string,
        movementType: movementType as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching movements:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async createAdjustment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { productId, lotId, warehouseId, quantity, reason, notes } = req.body;

      // Create movement
      const movement = await movementService.createMovement({
        movementType: 'ADJUSTMENT',
        productId,
        lotId,
        warehouseId,
        userId: userId || 'system',
        quantity,
        reason,
        notes
      });

      // Update lot
      const lot = await lotService.getLotById(lotId);
      if (lot) {
        await lotService.updateLot(lotId, {
          currentQuantity: lot.currentQuantity + quantity
        });
      }

      // Update stock level
      await stockLevelService.updateStockLevel(
        productId,
        warehouseId,
        'ADJUSTMENT',
        quantity
      );

      res.status(201).json({
        success: true,
        data: movement
      });
    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async createMovement(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { productId, warehouseId, type, quantity, reason, reference, lotId } = req.body;

      // Map frontend type to backend movementType
      const movementType = type || 'ADJUSTMENT';

      // Create movement
      const movement = await movementService.createMovement({
        movementType,
        productId,
        lotId,
        warehouseId,
        userId: userId || 'system',
        quantity,
        reason,
        reference
      });

      // Update lot if provided
      if (lotId) {
        const lot = await lotService.getLotById(lotId);
        if (lot) {
          const newQuantity = movementType === 'IN'
            ? lot.currentQuantity + quantity
            : lot.currentQuantity - Math.abs(quantity);
          await lotService.updateLot(lotId, {
            currentQuantity: Math.max(0, newQuantity)
          });
        }
      }

      // Update stock level
      await stockLevelService.updateStockLevel(
        productId,
        warehouseId,
        movementType,
        quantity
      );

      res.status(201).json({
        success: true,
        data: movement
      });
    } catch (error: any) {
      console.error('Error creating movement:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // STOCK LEVELS
  // ============================================

  async getStockLevels(req: Request, res: Response) {
    try {
      const { productId, warehouseId, lowStock } = req.query;

      const levels = await stockLevelService.getStockLevelSummary({
        productId: productId as string,
        warehouseId: warehouseId as string,
        lowStock: lowStock === 'true'
      });

      res.json({
        success: true,
        data: levels
      });
    } catch (error: any) {
      console.error('Error fetching stock levels:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await stockLevelService.getDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // ALERTS
  // ============================================

  async getAlerts(req: Request, res: Response) {
    try {
      const { productId, warehouseId, alertType, severity, isResolved, page, limit } = req.query;

      const result = await alertService.getAlerts({
        productId: productId as string,
        warehouseId: warehouseId as string,
        alertType: alertType as any,
        severity: severity as any,
        isResolved: isResolved === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async resolveAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const alert = await alertService.resolveAlert(id, userId);

      res.json({
        success: true,
        data: alert
      });
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getAlertSummary(req: Request, res: Response) {
    try {
      const summary = await alertService.getAlertSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error fetching alert summary:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // REPORTS
  // ============================================

  async getStockLevelReport(req: Request, res: Response) {
    try {
      const { productId, warehouseId, sku } = req.query;

      const report = await reportService.generateStockLevelReport({
        productId: productId as string,
        warehouseId: warehouseId as string,
        sku: sku as string
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating stock level report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getMovementReport(req: Request, res: Response) {
    try {
      const { productId, warehouseId, movementType, startDate, endDate } = req.query;

      const report = await reportService.generateMovementReport({
        productId: productId as string,
        warehouseId: warehouseId as string,
        movementType: movementType as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating movement report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getExpiryReport(req: Request, res: Response) {
    try {
      const { daysAhead } = req.query;

      const report = await reportService.generateExpiryReport(
        daysAhead ? parseInt(daysAhead as string) : 30
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating expiry report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getValuationReport(req: Request, res: Response) {
    try {
      const { warehouseId } = req.query;

      const report = await reportService.generateValuationReport({
        warehouseId: warehouseId as string
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating valuation report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getTurnoverReport(req: Request, res: Response) {
    try {
      const { productId, warehouseId, startDate, endDate } = req.query;

      const report = await reportService.generateTurnoverReport({
        productId: productId as string,
        warehouseId: warehouseId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating turnover report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getLowStockReport(req: Request, res: Response) {
    try {
      const { warehouseId } = req.query;

      const report = await reportService.generateLowStockReport({
        warehouseId: warehouseId as string
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error generating low stock report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async exportReport(req: Request, res: Response) {
    try {
      const { reportType, productId, warehouseId } = req.query;

      const csv = await reportService.exportReportToCSV(
        reportType as string,
        {
          productId: productId as string,
          warehouseId: warehouseId as string
        }
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // WAREHOUSES
  // ============================================

  async getWarehouses(req: Request, res: Response) {
    try {
      const warehouses = await warehouseService.getWarehouses();

      res.json({
        success: true,
        data: warehouses
      });
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getWarehouseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const warehouse = await warehouseService.getWarehouseById(id);

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          error: { message: 'Warehouse not found' }
        });
      }

      res.json({
        success: true,
        data: warehouse
      });
    } catch (error: any) {
      console.error('Error fetching warehouse:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async createWarehouse(req: Request, res: Response) {
    try {
      const warehouse = await warehouseService.createWarehouse(req.body);

      res.status(201).json({
        success: true,
        data: warehouse
      });
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async updateWarehouse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const warehouse = await warehouseService.updateWarehouse(id, req.body);

      res.json({
        success: true,
        data: warehouse
      });
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // PRODUCT SYNC (Auto-fetch from Order Items)
  // ============================================

  async syncOrderItems(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      await productSyncService.syncOrderItems(orderId);

      res.json({
        success: true,
        message: 'Order items synced to products successfully'
      });
    } catch (error: any) {
      console.error('Error syncing order items:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async batchSyncAllOrderItems(req: Request, res: Response) {
    try {
      const result = await productSyncService.syncAllOrderItems();

      res.json({
        success: true,
        data: result,
        message: `Batch sync complete: ${result.synced} products created, ${result.skipped} skipped, ${result.errors} errors`
      });
    } catch (error: any) {
      console.error('Error batch syncing order items:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getSyncStats(req: Request, res: Response) {
    try {
      const stats = await productSyncService.getSyncStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getOverviewAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate, warehouseId, categoryId } = req.query;

      const data = await analyticsService.getOverviewAnalytics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId as string,
        categoryId: categoryId as string
      });

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error fetching overview analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getMovementAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate, warehouseId, productId } = req.query;

      const data = await analyticsService.getMovementAnalytics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId as string,
        productId: productId as string
      });

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error fetching movement analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getHealthAnalytics(req: Request, res: Response) {
    try {
      const { warehouseId } = req.query;

      const data = await analyticsService.getHealthAnalytics({
        warehouseId: warehouseId as string
      });

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error fetching health analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async getWarehouseAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const data = await analyticsService.getWarehouseAnalytics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error fetching warehouse analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  async exportAnalytics(req: Request, res: Response) {
    try {
      const { type, startDate, endDate, warehouseId, format } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId as string
      };

      let data: any;
      switch (type) {
        case 'overview':
          data = await analyticsService.getOverviewAnalytics(filters);
          break;
        case 'movements':
          data = await analyticsService.getMovementAnalytics(filters);
          break;
        case 'health':
          data = await analyticsService.getHealthAnalytics(filters);
          break;
        case 'warehouses':
          data = await analyticsService.getWarehouseAnalytics(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: { message: 'Invalid analytics type' }
          });
      }

      // Convert to CSV if requested
      if (format === 'csv') {
        const csv = this.convertToCSV(data, type as string);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  }

  private convertToCSV(data: any, type: string): string {
    let csv = '';
    
    switch (type) {
      case 'overview':
        csv = 'Metric,Value\n';
        csv += `Total Value,${data.totalValue}\n`;
        csv += `Total Products,${data.totalProducts}\n`;
        csv += `Total Lots,${data.totalLots}\n`;
        csv += `Avg Turnover Rate,${data.avgTurnoverRate}\n`;
        csv += '\nValue History\nDate,Value\n';
        data.valueHistory.forEach((item: any) => {
          csv += `${item.date},${item.value}\n`;
        });
        csv += '\nCategory Distribution\nCategory,Value\n';
        data.categoryDistribution.forEach((item: any) => {
          csv += `${item.name},${item.value}\n`;
        });
        csv += '\nTop Products\nProduct,Value,Quantity\n';
        data.topProducts.forEach((item: any) => {
          csv += `${item.name},${item.value},${item.quantity}\n`;
        });
        break;
        
      case 'movements':
        csv = 'Movement Trend\nDate,IN,OUT,Adjustment,Transfer,Return\n';
        data.trend.forEach((item: any) => {
          csv += `${item.date},${item.in},${item.out},${item.adjustment},${item.transfer},${item.return}\n`;
        });
        csv += '\nType Distribution\nType,Count,Quantity\n';
        data.typeDistribution.forEach((item: any) => {
          csv += `${item.type},${item.count},${item.quantity}\n`;
        });
        csv += '\nTop Products by Movement\nProduct,IN Quantity,OUT Quantity,Net Change\n';
        data.topProducts.forEach((item: any) => {
          csv += `${item.name},${item.inQuantity},${item.outQuantity},${item.netChange}\n`;
        });
        break;
        
      case 'health':
        csv = 'Stock Level Distribution\nStatus,Count,Percentage\n';
        data.levelDistribution.forEach((item: any) => {
          csv += `${item.status},${item.count},${item.percentage}%\n`;
        });
        csv += '\nExpiry Analysis\nRange,Count,Value\n';
        data.expiryAnalysis.forEach((item: any) => {
          csv += `${item.range},${item.count},${item.value}\n`;
        });
        csv += '\nReorder Recommendations\nProduct,SKU,Current,Reorder Point,To Order,Warehouse\n';
        data.reorderList.forEach((item: any) => {
          csv += `${item.productName},${item.sku},${item.current},${item.reorderPoint},${item.toOrder},${item.warehouseName}\n`;
        });
        break;
        
      case 'warehouses':
        csv = 'Warehouse Stats\nName,Code,Total Value,Total Quantity,Product Count,Utilization\n';
        data.stats.forEach((item: any) => {
          csv += `${item.name},${item.code},${item.totalValue},${item.totalQuantity},${item.productCount},${item.utilization}%\n`;
        });
        csv += '\nWarehouse Comparison\nWarehouse,IN Movements,OUT Movements,Net Change\n';
        data.comparison.forEach((item: any) => {
          csv += `${item.warehouseName},${item.inMovements},${item.outMovements},${item.netChange}\n`;
        });
        break;
    }
    
    return csv;
  }
}

export const stockController = new StockController();