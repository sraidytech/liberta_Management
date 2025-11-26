import { prisma } from '@/config/database';
import { CreateAlertDto } from './types';
import { StockAlertType, AlertSeverity, UserRole } from '@prisma/client';

export class AlertService {
  /**
   * Create a stock alert
   */
  async createAlert(data: CreateAlertDto): Promise<any> {
    const alert = await prisma.stockAlert.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        alertType: data.alertType,
        severity: data.severity,
        currentQuantity: data.currentQuantity,
        threshold: data.threshold,
        message: data.message
      },
      include: {
        warehouse: true
      }
    });

    // Send notifications to relevant users
    await this.sendAlertNotifications(alert);

    return alert;
  }

  /**
   * Create low stock alert
   */
  async createLowStockAlert(
    productId: string,
    warehouseId: string,
    currentQuantity: number,
    threshold: number
  ): Promise<any> {
    // Check if alert already exists and is not resolved
    const existingAlert = await prisma.stockAlert.findFirst({
      where: {
        productId,
        warehouseId,
        alertType: 'LOW_STOCK',
        isResolved: false
      }
    });

    if (existingAlert) {
      // Update existing alert
      return await prisma.stockAlert.update({
        where: { id: existingAlert.id },
        data: {
          currentQuantity,
          message: `Low stock alert: ${currentQuantity} units remaining (threshold: ${threshold})`,
          updatedAt: new Date()
        }
      });
    }

    // Create new alert
    return await this.createAlert({
      productId,
      warehouseId,
      alertType: 'LOW_STOCK',
      severity: currentQuantity === 0 ? 'CRITICAL' : 'WARNING',
      currentQuantity,
      threshold,
      message: `Low stock alert: ${currentQuantity} units remaining (threshold: ${threshold})`
    });
  }

  /**
   * Create out of stock alert
   */
  async createOutOfStockAlert(
    productId: string,
    warehouseId: string
  ): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return null;

    return await this.createAlert({
      productId,
      warehouseId,
      alertType: 'OUT_OF_STOCK',
      severity: 'CRITICAL',
      currentQuantity: 0,
      threshold: product.minThreshold,
      message: `Product ${product.sku} is out of stock`
    });
  }

  /**
   * Create insufficient stock alert
   */
  async createInsufficientStockAlert(
    productId: string,
    warehouseId: string,
    required: number,
    available: number
  ): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return null;

    return await this.createAlert({
      productId,
      warehouseId,
      alertType: 'INSUFFICIENT_STOCK',
      severity: 'CRITICAL',
      currentQuantity: available,
      threshold: required,
      message: `Insufficient stock for ${product.sku}: Required ${required}, Available ${available}`
    });
  }

  /**
   * Create missing SKU alert
   */
  async createMissingSKUAlert(
    orderId: string,
    productName: string,
    warehouseId: string
  ): Promise<any> {
    // Use a placeholder product ID for missing SKU alerts
    const placeholderProductId = 'missing-sku-placeholder';

    return await this.createAlert({
      productId: placeholderProductId,
      warehouseId,
      alertType: 'MISSING_SKU',
      severity: 'WARNING',
      currentQuantity: 0,
      threshold: 0,
      message: `Order ${orderId}: Product "${productName}" missing SKU - cannot track stock`
    });
  }

  /**
   * Create expiring soon alert
   */
  async createExpiringSoonAlert(
    productId: string,
    warehouseId: string,
    lotNumber: string,
    expiryDate: Date,
    quantity: number
  ): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return null;

    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return await this.createAlert({
      productId,
      warehouseId,
      alertType: 'EXPIRING_SOON',
      severity: daysUntilExpiry <= 7 ? 'CRITICAL' : 'WARNING',
      currentQuantity: quantity,
      threshold: 30, // 30 days threshold
      message: `Lot ${lotNumber} of ${product.sku} expiring in ${daysUntilExpiry} days (${quantity} units)`
    });
  }

  /**
   * Get all alerts with filters
   */
  async getAlerts(filters: {
    productId?: string;
    warehouseId?: string;
    alertType?: StockAlertType;
    severity?: AlertSeverity;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ alerts: any[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.alertType) {
      where.alertType = filters.alertType;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.isResolved !== undefined) {
      where.isResolved = filters.isResolved;
    }

    const [alerts, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        include: {
          warehouse: true
        },
        orderBy: [
          { isResolved: 'asc' },
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.stockAlert.count({ where })
    ]);

    return {
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Resolve alert
   */
  async resolveAlert(id: string, userId: string): Promise<any> {
    const alert = await prisma.stockAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.isResolved) {
      throw new Error('Alert already resolved');
    }

    return await prisma.stockAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      }
    });
  }

  /**
   * Get alert summary
   */
  async getAlertSummary(): Promise<any> {
    const [
      totalAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      unresolvedAlerts
    ] = await Promise.all([
      prisma.stockAlert.count(),
      prisma.stockAlert.count({
        where: { severity: 'CRITICAL', isResolved: false }
      }),
      prisma.stockAlert.count({
        where: { severity: 'WARNING', isResolved: false }
      }),
      prisma.stockAlert.count({
        where: { severity: 'INFO', isResolved: false }
      }),
      prisma.stockAlert.count({
        where: { isResolved: false }
      })
    ]);

    return {
      totalAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      unresolvedAlerts
    };
  }

  /**
   * Send alert notifications to relevant users
   */
  private async sendAlertNotifications(alert: any): Promise<void> {
    try {
      // Get all managers and stock agents
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.TEAM_MANAGER, UserRole.STOCK_MANAGEMENT_AGENT]
          },
          isActive: true
        }
      });

      // Create notifications for each user
      const notifications = users.map(user => ({
        userId: user.id,
        type: 'SYSTEM_ALERT' as any,
        title: `Stock Alert: ${alert.alertType}`,
        message: alert.message,
        isRead: false
      }));

      await prisma.notification.createMany({
        data: notifications
      });

      console.log(`✅ Sent ${notifications.length} alert notifications for ${alert.alertType}`);
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Check and create expiry alerts for all lots
   */
  async checkExpiryAlerts(): Promise<void> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLots = await prisma.lot.findMany({
      where: {
        isActive: true,
        currentQuantity: { gt: 0 },
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      },
      include: {
        product: true
      }
    });

    for (const lot of expiringLots) {
      await this.createExpiringSoonAlert(
        lot.productId,
        lot.warehouseId,
        lot.lotNumber,
        lot.expiryDate!,
        lot.currentQuantity
      );
    }

    console.log(`✅ Checked ${expiringLots.length} expiring lots`);
  }
}

export const alertService = new AlertService();