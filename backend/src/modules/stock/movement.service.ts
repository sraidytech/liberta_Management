import { prisma } from '@/config/database';
import { CreateStockMovementDto, MovementWithDetails } from './types';
import { StockMovementType, Prisma } from '@prisma/client';

export class MovementService {
  /**
   * Create a stock movement
   */
  async createMovement(data: CreateStockMovementDto): Promise<any> {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId }
    });

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Get current quantity for before/after tracking
    let quantityBefore = 0;
    if (data.lotId) {
      const lot = await prisma.lot.findUnique({
        where: { id: data.lotId }
      });
      if (!lot) {
        throw new Error('Lot not found');
      }
      quantityBefore = lot.currentQuantity;
    }

    // Calculate quantity after based on movement type
    let quantityAfter = quantityBefore;
    if (data.movementType === 'IN' || data.movementType === 'RETURN') {
      quantityAfter = quantityBefore + data.quantity;
    } else if (data.movementType === 'OUT' || data.movementType === 'ADJUSTMENT') {
      quantityAfter = quantityBefore - data.quantity;
    }

    // Calculate total cost
    const totalCost = data.unitCost ? data.unitCost * data.quantity : null;

    // Create movement
    const movement = await prisma.stockMovement.create({
      data: {
        movementType: data.movementType,
        productId: data.productId,
        lotId: data.lotId,
        warehouseId: data.warehouseId,
        orderId: data.orderId,
        userId: data.userId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost,
        quantityBefore,
        quantityAfter,
        reference: data.reference,
        reason: data.reason,
        notes: data.notes
      },
      include: {
        product: true,
        lot: true,
        warehouse: true,
        user: true,
        order: true
      }
    });

    return movement;
  }

  /**
   * Get movement by ID
   */
  async getMovementById(id: string): Promise<MovementWithDetails | null> {
    const movement = await prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: true,
        lot: true,
        warehouse: true,
        user: true,
        order: true
      }
    });

    if (!movement) {
      return null;
    }

    return this.formatMovementWithDetails(movement);
  }

  /**
   * Get all movements with filters
   */
  async getMovements(filters: {
    productId?: string;
    warehouseId?: string;
    orderId?: string;
    userId?: string;
    movementType?: StockMovementType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ movements: MovementWithDetails[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
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

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          lot: true,
          warehouse: true,
          user: true,
          order: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.stockMovement.count({ where })
    ]);

    return {
      movements: movements.map(m => this.formatMovementWithDetails(m)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get movement summary by type
   */
  async getMovementSummary(filters: {
    startDate?: Date;
    endDate?: Date;
    productId?: string;
    warehouseId?: string;
  }): Promise<any> {
    const where: Prisma.StockMovementWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
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

    const movements = await prisma.stockMovement.groupBy({
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

    return movements.map(m => ({
      movementType: m.movementType,
      totalQuantity: m._sum.quantity || 0,
      totalCost: m._sum.totalCost || 0,
      count: m._count.id
    }));
  }

  /**
   * Format movement with details
   */
  private formatMovementWithDetails(movement: any): MovementWithDetails {
    return {
      id: movement.id,
      movementType: movement.movementType,
      productSku: movement.product.sku,
      productName: movement.product.name,
      lotNumber: movement.lot?.lotNumber,
      warehouseName: movement.warehouse.name,
      orderReference: movement.order?.reference,
      userName: movement.user.name || movement.user.email,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      quantityBefore: movement.quantityBefore,
      quantityAfter: movement.quantityAfter,
      reference: movement.reference,
      reason: movement.reason,
      notes: movement.notes,
      createdAt: movement.createdAt
    };
  }
}

export const movementService = new MovementService();