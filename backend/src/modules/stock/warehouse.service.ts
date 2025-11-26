import { prisma } from '@/config/database';

export class WarehouseService {
  /**
   * Get all warehouses
   */
  async getWarehouses(): Promise<any[]> {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return warehouses;
  }

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(id: string): Promise<any> {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        lots: {
          where: { isActive: true }
        },
        stockLevels: {
          include: {
            product: true
          }
        }
      }
    });

    return warehouse;
  }

  /**
   * Create warehouse
   */
  async createWarehouse(data: {
    name: string;
    code: string;
    address?: string;
  }): Promise<any> {
    // Check if code already exists
    const existing = await prisma.warehouse.findUnique({
      where: { code: data.code }
    });

    if (existing) {
      throw new Error('Warehouse code already exists');
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address
      }
    });

    return warehouse;
  }

  /**
   * Update warehouse
   */
  async updateWarehouse(id: string, data: {
    name?: string;
    code?: string;
    address?: string;
  }): Promise<any> {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data
    });

    return warehouse;
  }

  /**
   * Delete warehouse (soft delete)
   */
  async deleteWarehouse(id: string): Promise<void> {
    await prisma.warehouse.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

export const warehouseService = new WarehouseService();