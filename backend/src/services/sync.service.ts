import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from './ecomanager.service';

const prisma = new PrismaClient();

export class SyncService {
  private redis: Redis;
  private isRunning: boolean = false;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Start automatic synchronization for all active stores
   */
  async startAutoSync(intervalMinutes: number = 15): Promise<void> {
    if (this.isRunning) {
      console.log('Auto sync is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting auto sync with ${intervalMinutes} minute intervals`);

    const syncInterval = setInterval(async () => {
      try {
        await this.syncAllStores();
      } catch (error) {
        console.error('Auto sync error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Store interval ID in Redis for cleanup
    await this.redis.set('sync:interval', syncInterval.toString());
  }

  /**
   * Stop automatic synchronization
   */
  async stopAutoSync(): Promise<void> {
    const intervalId = await this.redis.get('sync:interval');
    if (intervalId) {
      clearInterval(parseInt(intervalId));
      await this.redis.del('sync:interval');
    }
    this.isRunning = false;
    console.log('Auto sync stopped');
  }

  /**
   * Sync orders from all active stores
   */
  async syncAllStores(): Promise<{ [storeIdentifier: string]: any }> {
    console.log('Starting sync for all stores...');
    
    // Get all active API configurations
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (apiConfigs.length === 0) {
      console.log('No active store configurations found');
      return {};
    }

    const results: { [storeIdentifier: string]: any } = {};

    // Process each store
    for (const config of apiConfigs) {
      try {
        console.log(`Syncing store: ${config.storeName} (${config.storeIdentifier})`);
        
        const result = await this.syncStore(config.storeIdentifier);
        results[config.storeIdentifier] = result;
        
        // Add delay between stores to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error syncing store ${config.storeIdentifier}:`, error);
        results[config.storeIdentifier] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    console.log('Completed sync for all stores');
    return results;
  }

  /**
   * Sync orders from a specific store
   */
  async syncStore(storeIdentifier: string): Promise<any> {
    // Get API configuration
    const apiConfig = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier }
    });

    if (!apiConfig || !apiConfig.isActive) {
      throw new Error(`Store configuration not found or inactive: ${storeIdentifier}`);
    }

    // Initialize EcoManager service
    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: (apiConfig as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2'
    }, this.redis);

    // Test connection
    const connectionTest = await ecoService.testConnection();
    if (!connectionTest) {
      throw new Error(`Failed to connect to EcoManager API for ${apiConfig.storeName}`);
    }

    // Get last synced order ID
    const lastOrder = await prisma.order.findFirst({
      where: { storeIdentifier },
      orderBy: { ecoManagerId: 'desc' }
    });

    const lastOrderId = lastOrder?.ecoManagerId ? parseInt(lastOrder.ecoManagerId) : 0;
    console.log(`Last order ID for ${apiConfig.storeName}: ${lastOrderId}`);

    // Fetch new orders
    const newOrders = await ecoService.fetchNewOrders(lastOrderId);
    console.log(`Found ${newOrders.length} new orders for ${apiConfig.storeName}`);

    let syncedCount = 0;
    let errorCount = 0;

    // Process orders in batches
    const batchSize = 25;
    for (let i = 0; i < newOrders.length; i += batchSize) {
      const batch = newOrders.slice(i, i + batchSize);
      
      for (const ecoOrder of batch) {
        try {
          // Check if order already exists
          const existingOrder = await prisma.order.findUnique({
            where: { ecoManagerId: ecoOrder.id.toString() }
          });

          if (!existingOrder) {
            // Create new order
            const orderData = ecoService.mapOrderToDatabase(ecoOrder);
            await prisma.order.create({
              data: orderData
            });
            syncedCount++;
          }
        } catch (orderError) {
          console.error(`Error processing order ${ecoOrder.id}:`, orderError);
          errorCount++;
        }
      }
    }

    // Update API configuration usage
    await prisma.apiConfiguration.update({
      where: { id: apiConfig.id },
      data: {
        requestCount: {
          increment: Math.ceil(newOrders.length / 100)
        },
        lastUsed: new Date()
      }
    });

    // Save sync status
    if (newOrders.length > 0) {
      const lastOrderId = Math.max(...newOrders.map(o => o.id));
      await ecoService.saveSyncStatus(lastOrderId, syncedCount);
    }

    const result = {
      success: true,
      storeName: apiConfig.storeName,
      storeIdentifier,
      syncedCount,
      errorCount,
      totalFetched: newOrders.length,
      lastSync: new Date().toISOString()
    };

    console.log(`Sync completed for ${apiConfig.storeName}:`, result);
    return result;
  }

  /**
   * Get sync status for all stores
   */
  async getSyncStatus(): Promise<any[]> {
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        storeName: true,
        storeIdentifier: true,
        lastUsed: true,
        requestCount: true
      }
    });

    const statusPromises = apiConfigs.map(async (config) => {
      const ecoService = new EcoManagerService({
        storeName: config.storeName,
        storeIdentifier: config.storeIdentifier,
        apiToken: '', // Not needed for status check
        baseUrl: (config as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, this.redis);

      const lastSyncStatus = await ecoService.getLastSyncStatus();
      
      const lastOrder = await prisma.order.findFirst({
        where: { storeIdentifier: config.storeIdentifier },
        orderBy: { createdAt: 'desc' }
      });

      return {
        ...config,
        lastSyncStatus,
        lastOrderCreated: lastOrder?.createdAt || null,
        totalOrders: await prisma.order.count({
          where: { storeIdentifier: config.storeIdentifier }
        })
      };
    });

    return Promise.all(statusPromises);
  }

  /**
   * Manual sync trigger for a specific store
   */
  async manualSync(storeIdentifier: string, fullSync: boolean = false): Promise<any> {
    console.log(`Manual sync triggered for ${storeIdentifier}, fullSync: ${fullSync}`);

    if (fullSync) {
      // For full sync, we'll delete existing orders and re-import
      console.log(`Performing full sync for ${storeIdentifier}...`);
      
      // Get API configuration
      const apiConfig = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier }
      });

      if (!apiConfig || !apiConfig.isActive) {
        throw new Error(`Store configuration not found or inactive: ${storeIdentifier}`);
      }

      // Initialize EcoManager service
      const ecoService = new EcoManagerService({
        storeName: apiConfig.storeName,
        storeIdentifier: apiConfig.storeIdentifier,
        apiToken: apiConfig.apiToken,
        baseUrl: (apiConfig as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, this.redis);

      // Delete existing orders for this store
      await prisma.order.deleteMany({
        where: { storeIdentifier }
      });

      // Fetch all orders
      const allOrders = await ecoService.fetchAllOrders();
      console.log(`Fetched ${allOrders.length} orders for full sync`);

      let syncedCount = 0;
      let errorCount = 0;

      // Process orders in batches
      const batchSize = 25;
      for (let i = 0; i < allOrders.length; i += batchSize) {
        const batch = allOrders.slice(i, i + batchSize);
        
        for (const ecoOrder of batch) {
          try {
            const orderData = ecoService.mapOrderToDatabase(ecoOrder);
            await prisma.order.create({
              data: orderData
            });
            syncedCount++;
          } catch (orderError) {
            console.error(`Error processing order ${ecoOrder.id}:`, orderError);
            errorCount++;
          }
        }
      }

      return {
        success: true,
        syncType: 'full',
        storeName: apiConfig.storeName,
        storeIdentifier,
        syncedCount,
        errorCount,
        totalFetched: allOrders.length
      };
    } else {
      // Regular incremental sync
      return this.syncStore(storeIdentifier);
    }
  }

  /**
   * Health check for sync service
   */
  async healthCheck(): Promise<any> {
    const activeConfigs = await prisma.apiConfiguration.count({
      where: { isActive: true }
    });

    const totalOrders = await prisma.order.count();
    
    const recentOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    return {
      isRunning: this.isRunning,
      activeStores: activeConfigs,
      totalOrders,
      recentOrders,
      lastHealthCheck: new Date().toISOString()
    };
  }
}