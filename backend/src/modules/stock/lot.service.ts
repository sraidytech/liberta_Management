import { prisma } from '@/config/database';
import { CreateLotDto, UpdateLotDto, LotWithDetails } from './types';
import { Prisma } from '@prisma/client';

export class LotService {
  /**
   * Create a new lot
   */
  async createLot(data: CreateLotDto): Promise<any> {
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

    // Check if lot number already exists
    const existingLot = await prisma.lot.findUnique({
      where: { lotNumber: data.lotNumber }
    });

    if (existingLot) {
      throw new Error('Lot number already exists');
    }

    // Calculate total cost if unit cost provided
    const totalCost = data.unitCost ? data.unitCost * data.initialQuantity : undefined;

    // Convert date strings to proper Date objects for Prisma
    // productionDate is required, default to current date if not provided
    const productionDate = data.productionDate ? new Date(data.productionDate) : new Date();
    // expiryDate is optional
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : undefined;

    // Create lot
    const lot = await prisma.lot.create({
      data: {
        lotNumber: data.lotNumber,
        productId: data.productId,
        warehouseId: data.warehouseId,
        initialQuantity: data.initialQuantity,
        currentQuantity: data.initialQuantity,
        productionDate,
        expiryDate,
        unitCost: data.unitCost,
        totalCost,
        supplierInfo: data.supplierInfo,
        qualityStatus: data.qualityStatus || 'APPROVED',
        notes: data.notes
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    return lot;
  }

  /**
   * Get lot by ID with details
   */
  async getLotById(id: string): Promise<LotWithDetails | null> {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true
      }
    });

    if (!lot) {
      return null;
    }

    return this.formatLotWithDetails(lot);
  }

  /**
   * Get all lots with filters
   */
  async getLots(filters: {
    productId?: string;
    warehouseId?: string;
    isActive?: boolean;
    expiringBefore?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ lots: LotWithDetails[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LotWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.expiringBefore) {
      where.expiryDate = {
        lte: filters.expiringBefore,
        gte: new Date()
      };
    }

    if (filters.search) {
      where.OR = [
        { lotNumber: { contains: filters.search, mode: 'insensitive' } },
        { product: { name: { contains: filters.search, mode: 'insensitive' } } },
        { product: { sku: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          product: true,
          warehouse: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.lot.count({ where })
    ]);

    return {
      lots: lots.map(lot => this.formatLotWithDetails(lot)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update lot
   */
  async updateLot(id: string, data: UpdateLotDto): Promise<any> {
    const lot = await prisma.lot.findUnique({
      where: { id }
    });

    if (!lot) {
      throw new Error('Lot not found');
    }

    // Recalculate total cost if unit cost or quantity changed
    let totalCost = lot.totalCost;
    if (data.unitCost !== undefined || data.currentQuantity !== undefined) {
      const unitCost = data.unitCost ?? lot.unitCost;
      const quantity = data.currentQuantity ?? lot.currentQuantity;
      totalCost = unitCost ? unitCost * quantity : null;
    }

    // Convert date strings to proper Date objects for Prisma
    const updateData: any = { ...data };
    if (data.expiryDate) {
      updateData.expiryDate = new Date(data.expiryDate);
    }

    const updatedLot = await prisma.lot.update({
      where: { id },
      data: {
        ...updateData,
        totalCost,
        updatedAt: new Date()
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    return updatedLot;
  }

  /**
   * Delete (deactivate) lot
   */
  async deleteLot(id: string): Promise<void> {
    const lot = await prisma.lot.findUnique({
      where: { id }
    });

    if (!lot) {
      throw new Error('Lot not found');
    }

    if (lot.currentQuantity > 0) {
      throw new Error('Cannot delete lot with remaining quantity. Please adjust stock to zero first.');
    }

    await prisma.lot.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get available lots for a product using FEFO strategy
   */
  async getAvailableLotsForProduct(
    productId: string,
    warehouseId: string,
    requiredQuantity: number
  ): Promise<{ lots: any[]; totalAvailable: number }> {
    const lots = await prisma.lot.findMany({
      where: {
        productId,
        warehouseId,
        isActive: true,
        currentQuantity: { gt: 0 }
      },
      orderBy: [
        { expiryDate: 'asc' }, // FEFO: First Expired, First Out
        { productionDate: 'asc' } // Then by production date
      ],
      include: {
        product: true
      }
    });

    const totalAvailable = lots.reduce((sum, lot) => sum + lot.currentQuantity, 0);

    return {
      lots,
      totalAvailable
    };
  }

  /**
   * Format lot with details
   */
  private formatLotWithDetails(lot: any): LotWithDetails {
    const daysUntilExpiry = lot.expiryDate
      ? Math.ceil((lot.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      id: lot.id,
      lotNumber: lot.lotNumber,
      productSku: lot.product.sku,
      productName: lot.product.name,
      warehouseName: lot.warehouse.name,
      initialQuantity: lot.initialQuantity,
      currentQuantity: lot.currentQuantity,
      reservedQuantity: lot.reservedQuantity,
      productionDate: lot.productionDate,
      expiryDate: lot.expiryDate,
      unitCost: lot.unitCost,
      totalCost: lot.totalCost,
      supplierInfo: lot.supplierInfo,
      qualityStatus: lot.qualityStatus,
      notes: lot.notes,
      isActive: lot.isActive,
      daysUntilExpiry,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt
    };
  }
}

export const lotService = new LotService();