import { prisma } from '@/config/database';
import { DeductionResult } from './types';
import { productService } from './product.service';
import { lotService } from './lot.service';
import { movementService } from './movement.service';
import { stockLevelService } from './stock-level.service';
import { alertService } from './alert.service';

export class DeductionService {
  /**
   * Process order status change and handle stock deduction/addition
   */
  async processOrderStatusChange(
    order: any,
    oldStatus: string,
    newStatus: string
  ): Promise<DeductionResult> {
    const result: DeductionResult = {
      success: true,
      orderId: order.id,
      itemsProcessed: 0,
      itemsSkipped: 0,
      totalQuantityDeducted: 0,
      errors: [],
      movements: []
    };

    // Get order with items
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        customer: true
      }
    });

    if (!fullOrder) {
      result.success = false;
      result.errors.push({
        itemId: order.id,
        error: 'Order not found'
      });
      return result;
    }

    // Determine action based on status change
    let action: 'DEDUCT_SHIPPED' | 'DEDUCT_SOLD' | 'ADD_BACK' | 'NONE' = 'NONE';

    if (newStatus === 'SHIPPED') {
      action = 'DEDUCT_SHIPPED';
    } else if (newStatus === 'DELIVERED' && order.shippingStatus === 'LIVRÉ') {
      action = 'DEDUCT_SOLD';
    } else if (newStatus === 'CANCELLED' || order.shippingStatus === 'ANNULÉ') {
      action = 'ADD_BACK';
    } else if (newStatus === 'RETURNED') {
      action = 'ADD_BACK';
    }

    if (action === 'NONE') {
      return result;
    }

    // Get default warehouse
    const warehouse = await prisma.warehouse.findFirst({
      where: { isPrimary: true }
    });

    if (!warehouse) {
      result.success = false;
      result.errors.push({
        itemId: order.id,
        error: 'No primary warehouse found'
      });
      return result;
    }

    // Process each order item
    for (const item of fullOrder.items) {
      try {
        // Skip items without SKU
        if (!item.sku) {
          result.itemsSkipped++;
          result.errors.push({
            itemId: item.id,
            sku: undefined,
            error: 'Item missing SKU - cannot process stock'
          });

          // Create alert for missing SKU
          await alertService.createMissingSKUAlert(
            order.id,
            item.title,
            warehouse.id
          );

          continue;
        }

        // Get or create product
        const product = await productService.getOrCreateProductFromOrderItem(
          item.sku,
          item.title
        );

        if (action === 'DEDUCT_SHIPPED' || action === 'DEDUCT_SOLD') {
          // Deduct stock
          const deductResult = await this.deductStock(
            product.id,
            warehouse.id,
            item.quantity,
            order.id,
            order.assignedAgentId || 'system',
            action === 'DEDUCT_SOLD' ? 'SOLD' : 'SHIPPED'
          );

          if (deductResult.success) {
            result.itemsProcessed++;
            result.totalQuantityDeducted += item.quantity;
            result.movements.push(...deductResult.movements);
          } else {
            result.errors.push({
              itemId: item.id,
              sku: item.sku || undefined,
              error: deductResult.error || 'Failed to deduct stock'
            });
          }
        } else if (action === 'ADD_BACK') {
          // Add stock back
          const addResult = await this.addStockBack(
            product.id,
            warehouse.id,
            item.quantity,
            order.id,
            order.assignedAgentId || 'system',
            newStatus === 'RETURNED' ? 'RETURN' : 'CANCELLED'
          );

          if (addResult.success) {
            result.itemsProcessed++;
            result.movements.push(...addResult.movements);
          } else {
            result.errors.push({
              itemId: item.id,
              sku: item.sku,
              error: addResult.error || 'Failed to add stock back'
            });
          }
        }
      } catch (error: any) {
        result.errors.push({
          itemId: item.id,
          sku: item.sku || undefined,
          error: error.message
        });
      }
    }

    // Mark order as stock deducted if successful
    if (result.itemsProcessed > 0 && action !== 'ADD_BACK') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          stockDeducted: true,
          stockDeductedAt: new Date()
        }
      });
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Deduct stock using FEFO strategy
   */
  private async deductStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    orderId: string,
    userId: string,
    type: 'SHIPPED' | 'SOLD'
  ): Promise<{ success: boolean; error?: string; movements: any[] }> {
    const movements: any[] = [];

    try {
      // Get available lots using FEFO
      const { lots, totalAvailable } = await lotService.getAvailableLotsForProduct(
        productId,
        warehouseId,
        quantity
      );

      if (totalAvailable < quantity) {
        // Create insufficient stock alert
        await alertService.createInsufficientStockAlert(
          productId,
          warehouseId,
          quantity,
          totalAvailable
        );

        return {
          success: false,
          error: `Insufficient stock. Required: ${quantity}, Available: ${totalAvailable}`,
          movements: []
        };
      }

      let remainingQuantity = quantity;

      // Deduct from lots using FEFO
      for (const lot of lots) {
        if (remainingQuantity <= 0) break;

        const qtyToDeduct = Math.min(lot.currentQuantity, remainingQuantity);

        // Create stock movement
        const movement = await movementService.createMovement({
          movementType: 'OUT',
          productId,
          lotId: lot.id,
          warehouseId,
          orderId,
          userId,
          quantity: qtyToDeduct,
          unitCost: lot.unitCost || undefined,
          reference: `Order ${orderId}`,
          reason: type === 'SOLD' ? 'Order delivered' : 'Order shipped'
        });

        // Update lot quantity
        await prisma.lot.update({
          where: { id: lot.id },
          data: {
            currentQuantity: lot.currentQuantity - qtyToDeduct,
            updatedAt: new Date()
          }
        });

        movements.push({
          movementId: movement.id,
          productSku: lot.product.sku,
          quantity: qtyToDeduct,
          lotNumber: lot.lotNumber
        });

        remainingQuantity -= qtyToDeduct;
      }

      // Update stock level
      await stockLevelService.updateStockLevel(
        productId,
        warehouseId,
        'OUT',
        quantity
      );

      // Update shipped/sold counter
      await stockLevelService.updateShippedSold(
        productId,
        warehouseId,
        type,
        quantity
      );

      // Check for low stock
      const stockLevel = await stockLevelService.getStockLevel(productId, warehouseId);
      if (stockLevel) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (product && stockLevel.availableQuantity < product.minThreshold) {
          await alertService.createLowStockAlert(
            productId,
            warehouseId,
            stockLevel.availableQuantity,
            product.minThreshold
          );
        }
      }

      return { success: true, movements };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        movements: []
      };
    }
  }

  /**
   * Add stock back (for cancellations/returns)
   */
  private async addStockBack(
    productId: string,
    warehouseId: string,
    quantity: number,
    orderId: string,
    userId: string,
    reason: 'RETURN' | 'CANCELLED'
  ): Promise<{ success: boolean; error?: string; movements: any[] }> {
    const movements: any[] = [];

    try {
      // Get the most recent lot for this product
      const lot = await prisma.lot.findFirst({
        where: {
          productId,
          warehouseId,
          isActive: true
        },
        include: {
          product: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!lot) {
        return {
          success: false,
          error: 'No active lot found to add stock back',
          movements: []
        };
      }

      // Create stock movement
      const movement = await movementService.createMovement({
        movementType: reason === 'RETURN' ? 'RETURN' : 'ADJUSTMENT',
        productId,
        lotId: lot.id,
        warehouseId,
        orderId,
        userId,
        quantity,
        unitCost: lot.unitCost || undefined,
        reference: `Order ${orderId}`,
        reason: reason === 'RETURN' ? 'Customer return' : 'Order cancelled'
      });

      // Update lot quantity
      await prisma.lot.update({
        where: { id: lot.id },
        data: {
          currentQuantity: lot.currentQuantity + quantity,
          updatedAt: new Date()
        }
      });

      movements.push({
        movementId: movement.id,
        productSku: lot.product.sku,
        quantity,
        lotNumber: lot.lotNumber
      });

      // Update stock level
      await stockLevelService.updateStockLevel(
        productId,
        warehouseId,
        reason === 'RETURN' ? 'RETURN' : 'ADJUSTMENT',
        quantity
      );

      return { success: true, movements };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        movements: []
      };
    }
  }
}

export const deductionService = new DeductionService();