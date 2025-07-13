import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from './ecomanager.service';
import { AgentAssignmentService } from './agent-assignment.service';

import { prisma } from '../config/database';

export class SyncService {
  private redis: Redis;
  private isRunning: boolean = false;
  private assignmentService: AgentAssignmentService;

  constructor(redis: Redis) {
    this.redis = redis;
    this.assignmentService = new AgentAssignmentService(redis);
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

    // Process each store with connection management
    for (const config of apiConfigs) {
      try {
        console.log(`Syncing store: ${config.storeName} (${config.storeIdentifier})`);
        
        const result = await this.syncStore(config.storeIdentifier);
        results[config.storeIdentifier] = result;
        
        // After successful EcoManager sync, sync Maystro shipping status for this store
        if (result.success) {
          try {
            console.log(`🚚 Syncing Maystro shipping status for ${config.storeIdentifier}...`);
            const { getMaystroService } = await import('./maystro.service');
            const maystroService = getMaystroService(this.redis);
            
            const maystroResult = await maystroService.syncShippingStatus(undefined, config.storeIdentifier);
            console.log(`✅ Maystro sync for ${config.storeIdentifier}: ${maystroResult.updated} orders updated`);
            
            // Add Maystro results to the store result
            result.maystroSync = {
              updated: maystroResult.updated,
              errors: maystroResult.errors
            };
          } catch (maystroError) {
            console.error(`❌ Maystro sync failed for ${config.storeIdentifier}:`, maystroError);
            result.maystroSync = {
              error: maystroError instanceof Error ? maystroError.message : 'Unknown error'
            };
          }
        }
        
        // Longer delay between stores to prevent connection exhaustion
        await new Promise(resolve => setTimeout(resolve, 15000)); // Increased to 15s for stability
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
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

    // Process orders in smaller batches to prevent connection exhaustion
    const batchSize = 10; // Reduced from 25 to 10
    for (let i = 0; i < newOrders.length; i += batchSize) {
      const batch = newOrders.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newOrders.length/batchSize)} for ${apiConfig.storeName}`);
      
      for (const ecoOrder of batch) {
        try {
          // Check if order already exists
          const existingOrder = await prisma.order.findUnique({
            where: { ecoManagerId: ecoOrder.id.toString() }
          });

          if (!existingOrder) {
            // Create new order
            const orderData = ecoService.mapOrderToDatabase(ecoOrder);
            const newOrder = await prisma.order.create({
              data: orderData
            });
            syncedCount++;

            // Skip immediate assignment to prevent connection exhaustion
            // Orders will be assigned by the periodic assignment process
            console.log(`📝 Order ${newOrder.reference} created, will be assigned by periodic process`);
          }
          
          // Small delay between orders to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (orderError) {
          console.error(`Error processing order ${ecoOrder.id}:`, orderError);
          errorCount++;
        }
      }
      
      // Delay between batches to allow connection cleanup
      if (i + batchSize < newOrders.length) {
        console.log(`Batch completed. Waiting 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
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
            const newOrder = await prisma.order.create({
              data: orderData
            });
            syncedCount++;

            // Attempt to assign the new order immediately
            try {
              const assignmentResult = await this.assignmentService.assignOrder(newOrder.id);
              if (assignmentResult.success) {
                console.log(`✅ Order ${newOrder.reference} assigned to ${assignmentResult.assignedAgentName}`);
              }
            } catch (assignmentError) {
              console.log(`⚠️ Could not assign order ${newOrder.reference} immediately`);
            }
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