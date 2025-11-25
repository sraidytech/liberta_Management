import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingProviderFactory } from './shipping/shipping-provider-factory';
import { IShippingProvider } from './shipping/shipping-provider.interface';

const prisma = new PrismaClient();

export interface ShippingSyncResult {
  orderId: string;
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
}

export class ShippingSyncService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Sync shipping status for a single order
   */
  async syncOrderShippingStatus(orderId: string): Promise<ShippingSyncResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          shippingAccount: {
            include: { company: true }
          }
        }
      });

      if (!order) {
        return {
          orderId,
          success: false,
          error: 'Order not found'
        };
      }

      // If order has no shipping account, check for legacy Maystro orders
      if (!order.shippingAccount) {
        // For backward compatibility: orders without shipping account are assumed to be Maystro
        if (order.maystroOrderId || order.trackingNumber) {
          console.log(`Order ${orderId} has no shipping account but has Maystro data - skipping sync`);
          return {
            orderId,
            success: true,
            previousStatus: order.shippingStatus || undefined,
            newStatus: order.shippingStatus || undefined,
            error: 'Legacy order without shipping account'
          };
        }

        return {
          orderId,
          success: false,
          error: 'Order has no shipping account assigned'
        };
      }

      if (!order.trackingNumber) {
        return {
          orderId,
          success: false,
          error: 'Order has no tracking number'
        };
      }

      // Create appropriate provider
      const provider = ShippingProviderFactory.createProvider(
        order.shippingAccount.company.slug,
        order.shippingAccount.credentials as any,
        this.redis,
        order.shippingAccount.baseUrl || undefined
      );

      // Get order status from shipping provider
      const shippingData = await provider.getOrderStatus(order.trackingNumber);
      
      if (!shippingData) {
        return {
          orderId,
          success: false,
          error: 'Failed to fetch shipping status'
        };
      }

      // Map provider-specific status to our system status
      const newStatus = provider.mapStatus(shippingData.status);
      const previousStatus = order.shippingStatus;

      // Update order with new shipping status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          shippingStatus: newStatus,
          // Update other relevant fields if available
          ...(shippingData.deliveredAt && { deliveredAt: new Date(shippingData.deliveredAt) }),
          ...(shippingData.postponedTo && { postponedTo: new Date(shippingData.postponedTo) })
        }
      });

      // Update shipping account statistics
      await prisma.shippingAccount.update({
        where: { id: order.shippingAccount.id },
        data: {
          requestCount: { increment: 1 },
          successCount: { increment: 1 },
          lastUsed: new Date()
        }
      });

      return {
        orderId,
        success: true,
        previousStatus: previousStatus || undefined,
        newStatus
      };

    } catch (error: any) {
      console.error(`Error syncing order ${orderId}:`, error);

      // Update error count for shipping account if available
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { shippingAccountId: true }
        });

        if (order?.shippingAccountId) {
          await prisma.shippingAccount.update({
            where: { id: order.shippingAccountId },
            data: {
              requestCount: { increment: 1 },
              errorCount: { increment: 1 }
            }
          });
        }
      } catch (updateError) {
        console.error('Failed to update shipping account error count:', updateError);
      }

      return {
        orderId,
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Sync shipping statuses for multiple orders
   */
  async syncMultipleOrders(orderIds: string[]): Promise<ShippingSyncResult[]> {
    const results: ShippingSyncResult[] = [];

    for (const orderId of orderIds) {
      const result = await this.syncOrderShippingStatus(orderId);
      results.push(result);

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Sync all orders with a specific shipping account
   */
  async syncOrdersByShippingAccount(shippingAccountId: string, limit: number = 100): Promise<{
    total: number;
    synced: number;
    failed: number;
    results: ShippingSyncResult[];
  }> {
    try {
      // Get orders with this shipping account that have tracking numbers
      const orders = await prisma.order.findMany({
        where: {
          shippingAccountId,
          trackingNumber: { not: null },
          shippingStatus: { not: 'LIVRÉ' } // Don't sync already delivered orders
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const results = await this.syncMultipleOrders(orders.map(o => o.id));

      const synced = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        total: orders.length,
        synced,
        failed,
        results
      };

    } catch (error: any) {
      console.error(`Error syncing orders for shipping account ${shippingAccountId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all pending orders across all shipping accounts
   */
  async syncAllPendingOrders(limit: number = 500): Promise<{
    total: number;
    synced: number;
    failed: number;
    byAccount: { [accountId: string]: { synced: number; failed: number } };
  }> {
    try {
      // Get all orders with shipping accounts that need syncing
      const orders = await prisma.order.findMany({
        where: {
          shippingAccountId: { not: null },
          trackingNumber: { not: null },
          shippingStatus: { not: 'LIVRÉ' }
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shippingAccount: true
        }
      });

      const results = await this.syncMultipleOrders(orders.map(o => o.id));

      const synced = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      // Group results by shipping account
      const byAccount: { [accountId: string]: { synced: number; failed: number } } = {};
      
      orders.forEach((order, index) => {
        if (order.shippingAccountId) {
          if (!byAccount[order.shippingAccountId]) {
            byAccount[order.shippingAccountId] = { synced: 0, failed: 0 };
          }
          
          if (results[index].success) {
            byAccount[order.shippingAccountId].synced++;
          } else {
            byAccount[order.shippingAccountId].failed++;
          }
        }
      });

      return {
        total: orders.length,
        synced,
        failed,
        byAccount
      };

    } catch (error: any) {
      console.error('Error syncing all pending orders:', error);
      throw error;
    }
  }

  /**
   * Sync tracking numbers from Maystro for orders that don't have them yet
   * This is critical for new orders to get their tracking numbers from Maystro API
   */
  async syncMaystroTrackingNumbers(limit: number = 10000): Promise<{
    total: number;
    updated: number;
    failed: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    try {
      console.log(`🔄 Starting Maystro tracking number sync...`);

      // Get all Maystro shipping accounts
      const maystroAccounts = await prisma.shippingAccount.findMany({
        where: {
          company: {
            slug: 'maystro'
          },
          isActive: true
        },
        include: {
          company: true
        }
      });

      if (maystroAccounts.length === 0) {
        console.log(`⚠️ No active Maystro shipping accounts found`);
        return {
          total: 0,
          updated: 0,
          failed: 0,
          details: []
        };
      }

      console.log(`📡 Found ${maystroAccounts.length} active Maystro account(s)`);

      let totalUpdated = 0;
      let totalFailed = 0;
      const allDetails: Array<{ reference: string; status: string; error?: string }> = [];

      // Process each Maystro account
      for (const account of maystroAccounts) {
        try {
          console.log(`🔄 Syncing tracking numbers for account: ${account.name}`);

          // Create Maystro provider for this account
          const provider = ShippingProviderFactory.createProvider(
            account.company.slug,
            account.credentials as any,
            this.redis,
            account.baseUrl || undefined
          );

          // Check if provider has syncTrackingNumbers method (Maystro-specific)
          if ('syncTrackingNumbers' in provider && typeof (provider as any).syncTrackingNumbers === 'function') {
            const result = await (provider as any).syncTrackingNumbers(undefined, limit);
            
            totalUpdated += result.updated;
            totalFailed += result.errors;
            allDetails.push(...result.details);

            console.log(`✅ Account ${account.name}: ${result.updated} updated, ${result.errors} errors`);

            // Update account statistics
            await prisma.shippingAccount.update({
              where: { id: account.id },
              data: {
                requestCount: { increment: 1 },
                successCount: { increment: result.updated > 0 ? 1 : 0 },
                errorCount: { increment: result.errors > 0 ? 1 : 0 },
                lastUsed: new Date()
              }
            });
          } else {
            console.warn(`⚠️ Provider for ${account.name} doesn't support tracking number sync`);
          }

        } catch (error: any) {
          console.error(`❌ Error syncing tracking numbers for account ${account.name}:`, error);
          totalFailed++;
          
          // Update error count
          await prisma.shippingAccount.update({
            where: { id: account.id },
            data: {
              requestCount: { increment: 1 },
              errorCount: { increment: 1 }
            }
          });
        }
      }

      console.log(`🎉 Maystro tracking number sync complete: ${totalUpdated} updated, ${totalFailed} failed`);

      return {
        total: totalUpdated + totalFailed,
        updated: totalUpdated,
        failed: totalFailed,
        details: allDetails
      };

    } catch (error: any) {
      console.error('Error syncing Maystro tracking numbers:', error);
      throw error;
    }
  }

  /**
   * Get shipping provider for an order
   */
  async getProviderForOrder(orderId: string): Promise<IShippingProvider | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          shippingAccount: {
            include: { company: true }
          }
        }
      });

      if (!order?.shippingAccount) {
        return null;
      }

      return ShippingProviderFactory.createProvider(
        order.shippingAccount.company.slug,
        order.shippingAccount.credentials as any,
        this.redis,
        order.shippingAccount.baseUrl || undefined
      );

    } catch (error: any) {
      console.error(`Error getting provider for order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Test shipping account connection
   */
  async testShippingAccountConnection(shippingAccountId: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      const account = await prisma.shippingAccount.findUnique({
        where: { id: shippingAccountId },
        include: { company: true }
      });

      if (!account) {
        return {
          success: false,
          message: 'Shipping account not found'
        };
      }

      const provider = ShippingProviderFactory.createProvider(
        account.company.slug,
        account.credentials as any,
        this.redis,
        account.baseUrl || undefined
      );

      const isConnected = await provider.testConnection();
      const responseTime = Date.now() - startTime;

      // Update test results in database
      await prisma.shippingAccount.update({
        where: { id: shippingAccountId },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: isConnected ? 'success' : 'error',
          lastTestError: isConnected ? null : 'Connection test failed'
        }
      });

      return {
        success: isConnected,
        message: isConnected ? 'Connection successful' : 'Connection failed',
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Update test results with error
      try {
        await prisma.shippingAccount.update({
          where: { id: shippingAccountId },
          data: {
            lastTestAt: new Date(),
            lastTestStatus: 'error',
            lastTestError: error.message || 'Unknown error'
          }
        });
      } catch (updateError) {
        console.error('Failed to update test results:', updateError);
      }

      return {
        success: false,
        message: error.message || 'Connection test failed',
        responseTime
      };
    }
  }
}