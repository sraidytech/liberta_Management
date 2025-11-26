import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Product Sync Service
 * Automatically creates Product records from OrderItems
 */
export class ProductSyncService {
  /**
   * Sync a single OrderItem to Product
   * Creates product if it doesn't exist based on SKU
   */
  async syncOrderItemToProduct(orderItem: {
    sku?: string | null;
    title: string;
    quantity: number;
    unitPrice: number;
  }): Promise<void> {
    try {
      // Skip if no SKU provided
      if (!orderItem.sku) {
        console.log(`Skipping product sync for order item without SKU: ${orderItem.title}`);
        return;
      }

      // Check if product already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: orderItem.sku }
      });

      if (existingProduct) {
        console.log(`Product already exists for SKU: ${orderItem.sku}`);
        return;
      }

      // Extract category from title if possible (basic logic)
      const category = this.extractCategory(orderItem.title);

      // Create new product
      await prisma.product.create({
        data: {
          sku: orderItem.sku,
          name: orderItem.title,
          description: `Auto-created from order item`,
          category: category,
          unit: 'piece', // Default unit
          minThreshold: 100, // Default minimum stock
          reorderPoint: 200, // Default reorder point
          isActive: true
        }
      });

      console.log(`✅ Auto-created product: ${orderItem.sku} - ${orderItem.title}`);
    } catch (error) {
      console.error(`Failed to sync order item to product:`, error);
      // Don't throw - we don't want to break order creation if product sync fails
    }
  }

  /**
   * Sync all items from an order
   */
  async syncOrderItems(orderId: string): Promise<void> {
    try {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId }
      });

      for (const item of orderItems) {
        await this.syncOrderItemToProduct(item);
      }

      console.log(`✅ Synced ${orderItems.length} order items to products`);
    } catch (error) {
      console.error(`Failed to sync order items:`, error);
    }
  }

  /**
   * Batch sync all existing OrderItems that don't have corresponding Products
   * Useful for initial migration or periodic sync
   */
  async syncAllOrderItems(): Promise<{ synced: number; skipped: number; errors: number }> {
    try {
      console.log('🔄 Starting batch product sync from order items...');

      // Get all unique SKUs from order items
      const orderItems = await prisma.orderItem.findMany({
        where: {
          sku: { not: null }
        },
        distinct: ['sku'],
        select: {
          sku: true,
          title: true,
          unitPrice: true,
          quantity: true
        }
      });

      let synced = 0;
      let skipped = 0;
      let errors = 0;

      for (const item of orderItems) {
        try {
          if (!item.sku) {
            skipped++;
            continue;
          }

          // Check if product exists
          const existingProduct = await prisma.product.findUnique({
            where: { sku: item.sku }
          });

          if (existingProduct) {
            skipped++;
            continue;
          }

          // Create product
          const category = this.extractCategory(item.title);
          await prisma.product.create({
            data: {
              sku: item.sku,
              name: item.title,
              description: `Auto-created from order items`,
              category: category,
              unit: 'piece',
              minThreshold: 10,
              reorderPoint: 20,
              isActive: true
            }
          });

          synced++;
          console.log(`✅ Created product: ${item.sku} - ${item.title}`);
        } catch (error) {
          errors++;
          console.error(`❌ Failed to create product for SKU ${item.sku}:`, error);
        }
      }

      console.log(`✅ Batch sync complete: ${synced} created, ${skipped} skipped, ${errors} errors`);
      return { synced, skipped, errors };
    } catch (error) {
      console.error('Failed to batch sync order items:', error);
      throw error;
    }
  }

  /**
   * Extract category from product title
   * Basic logic - can be enhanced based on business rules
   */
  private extractCategory(title: string): string | undefined {
    const lowerTitle = title.toLowerCase();

    // Common categories
    if (lowerTitle.includes('phone') || lowerTitle.includes('smartphone') || lowerTitle.includes('mobile')) {
      return 'Smartphones';
    }
    if (lowerTitle.includes('tablet') || lowerTitle.includes('ipad')) {
      return 'Tablets';
    }
    if (lowerTitle.includes('laptop') || lowerTitle.includes('computer') || lowerTitle.includes('pc')) {
      return 'Computers';
    }
    if (lowerTitle.includes('watch') || lowerTitle.includes('smartwatch')) {
      return 'Wearables';
    }
    if (lowerTitle.includes('headphone') || lowerTitle.includes('earphone') || lowerTitle.includes('airpod')) {
      return 'Audio';
    }
    if (lowerTitle.includes('charger') || lowerTitle.includes('cable') || lowerTitle.includes('adapter')) {
      return 'Accessories';
    }
    if (lowerTitle.includes('case') || lowerTitle.includes('cover') || lowerTitle.includes('protector')) {
      return 'Protection';
    }

    return 'General'; // Default category
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalOrderItems: number;
    uniqueSKUs: number;
    productsInStock: number;
    unmatchedSKUs: number;
  }> {
    try {
      const [totalOrderItems, uniqueSKUsResult, productsInStock] = await Promise.all([
        prisma.orderItem.count(),
        prisma.orderItem.findMany({
          where: { sku: { not: null } },
          distinct: ['sku'],
          select: { sku: true }
        }),
        prisma.product.count()
      ]);

      const uniqueSKUs = uniqueSKUsResult.length;

      // Count SKUs in order items that don't have products
      const unmatchedSKUs = await prisma.orderItem.findMany({
        where: {
          sku: { not: null }
        },
        distinct: ['sku'],
        select: { sku: true }
      });

      const unmatchedCount = await Promise.all(
        unmatchedSKUs.map(async (item) => {
          if (!item.sku) return false;
          const product = await prisma.product.findUnique({
            where: { sku: item.sku }
          });
          return !product;
        })
      );

      return {
        totalOrderItems,
        uniqueSKUs,
        productsInStock,
        unmatchedSKUs: unmatchedCount.filter(Boolean).length
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      throw error;
    }
  }
}

export const productSyncService = new ProductSyncService();