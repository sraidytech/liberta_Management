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
   * Validate store configuration before sync
   */
  private async validateStoreConfiguration(config: any): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.apiToken || config.apiToken.trim() === '') {
      issues.push('API token is missing or empty');
    } else if (config.apiToken.length < 10) {
      warnings.push('API token appears to be too short');
    }

    if (!config.storeName || config.storeName.trim() === '') {
      issues.push('Store name is missing');
    }

    if (!config.storeIdentifier || config.storeIdentifier.trim() === '') {
      issues.push('Store identifier is missing');
    }

    // Check base URL
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      issues.push('Base URL is missing or empty');
    } else {
      try {
        new URL(config.baseUrl);
        // Validate that it's an EcoManager API URL
        if (!config.baseUrl.includes('ecomanager.dz') || !config.baseUrl.includes('/api/shop/v2')) {
          warnings.push('Base URL should be an EcoManager API endpoint ending with /api/shop/v2');
        }
      } catch {
        issues.push('Invalid base URL format');
      }
    }

    // Check last usage
    if (config.lastUsed) {
      const daysSinceLastUse = (Date.now() - new Date(config.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUse > 7) {
        warnings.push(`Store hasn't been used for ${Math.floor(daysSinceLastUse)} days`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Log detailed store processing start
   */
  private async logStoreProcessingStart(config: any, storeIndex: number, totalStores: number): Promise<void> {
    const validation = await this.validateStoreConfiguration(config);
    const baseUrl = config.baseUrl;
    const tokenPreview = config.apiToken ? `...${config.apiToken.slice(-4)}` : 'MISSING';

    console.log(`\n🔄 [Store ${storeIndex}/${totalStores}] Processing ${config.storeName}`);
    console.log(`   - Store ID: ${config.storeIdentifier}`);
    console.log(`   - API Endpoint: ${baseUrl || 'MISSING'}`);
    console.log(`   - Token Status: ${config.apiToken ? '✅' : '❌'} ${config.apiToken ? `Present (${tokenPreview})` : 'Missing'}`);
    console.log(`   - Base URL: ${baseUrl || 'MISSING'}`);
    console.log(`   - Last Used: ${config.lastUsed ? new Date(config.lastUsed).toLocaleString() : 'Never'}`);
    console.log(`   - Request Count: ${config.requestCount || 0}`);

    if (validation.issues.length > 0) {
      console.log(`   ❌ Configuration Issues:`);
      validation.issues.forEach(issue => console.log(`      - ${issue}`));
    }

    if (validation.warnings.length > 0) {
      console.log(`   ⚠️ Configuration Warnings:`);
      validation.warnings.forEach(warning => console.log(`      - ${warning}`));
    }
  }

  /**
   * Log detailed store processing completion
   */
  private logStoreProcessingEnd(
    config: any,
    result: any,
    processingTime: number
  ): void {
    const success = result.success;
    const icon = success ? '✅' : '❌';
    const status = success ? 'SUCCESS' : 'FAILED';
    
    console.log(`${icon} [Store Complete] ${config.storeIdentifier} - ${status}`);
    console.log(`   - Processing Time: ${(processingTime / 1000).toFixed(1)}s`);
    
    if (success) {
      console.log(`   - Orders Synced: ${result.syncedCount || 0}`);
      console.log(`   - Orders Fetched: ${result.totalFetched || 0}`);
      console.log(`   - Errors: ${result.errorCount || 0}`);
      
      if (result.maystroSync) {
        if (result.maystroSync.error) {
          console.log(`   - Maystro Sync: ❌ ${result.maystroSync.error}`);
        } else {
          console.log(`   - Maystro Sync: ✅ ${result.maystroSync.updated || 0} orders updated`);
        }
      }
    } else {
      console.log(`   - Error: ${result.error || 'Unknown error'}`);
      
      // Provide specific error guidance
      if (result.error?.includes('403') || result.error?.includes('Forbidden')) {
        console.log(`   - Issue Type: API Authentication`);
        console.log(`   - Solution: Update API token in admin panel`);
      } else if (result.error?.includes('timeout')) {
        console.log(`   - Issue Type: Network Timeout`);
        console.log(`   - Solution: Check network connectivity`);
      } else if (result.error?.includes('rate limit')) {
        console.log(`   - Issue Type: Rate Limiting`);
        console.log(`   - Solution: Reduce request frequency`);
      }
    }
  }

  /**
   * Get store health status for monitoring
   */
  private async getStoreHealthStatus(config: any): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    lastSync: string | null;
    orderCount: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // Check last sync time
    const lastOrder = await prisma.order.findFirst({
      where: { storeIdentifier: config.storeIdentifier },
      orderBy: { createdAt: 'desc' }
    });

    const orderCount = await prisma.order.count({
      where: { storeIdentifier: config.storeIdentifier }
    });

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Check if store has been syncing recently
    if (lastOrder) {
      const hoursSinceLastOrder = (Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastOrder > 24) {
        issues.push(`No new orders in ${Math.floor(hoursSinceLastOrder)} hours`);
        status = 'WARNING';
      }
      if (hoursSinceLastOrder > 72) {
        status = 'CRITICAL';
      }
    } else {
      issues.push('No orders found for this store');
      status = 'CRITICAL';
    }

    // Check configuration issues
    const validation = await this.validateStoreConfiguration(config);
    if (!validation.isValid) {
      issues.push(...validation.issues);
      status = 'CRITICAL';
    }

    return {
      status,
      lastSync: lastOrder?.createdAt.toISOString() || null,
      orderCount,
      issues
    };
  }

  /**
   * Sync orders from all active stores with comprehensive logging
   */
  async syncAllStores(): Promise<{ [storeIdentifier: string]: any }> {
    const syncStartTime = Date.now();
    console.log(`📦 [Sync Start] Beginning store synchronization process...`);
    
    // Get all active API configurations
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (apiConfigs.length === 0) {
      console.log('❌ No active store configurations found');
      return {};
    }

    console.log(`📊 Store Sync Overview:`);
    console.log(`   - Total Active Stores: ${apiConfigs.length}`);
    console.log(`   - Stores: ${apiConfigs.map(c => c.storeIdentifier).join(', ')}`);
    console.log(`   - Strategy: Sequential processing with 15s delays`);
    console.log(`   - Expected Total Duration: ${Math.ceil(apiConfigs.length * 45 / 60)} minutes`);

    const results: { [storeIdentifier: string]: any } = {};

    // Process each store with detailed logging
    for (let i = 0; i < apiConfigs.length; i++) {
      const config = apiConfigs[i];
      const storeStartTime = Date.now();
      
      try {
        // Log store processing start with validation
        await this.logStoreProcessingStart(config, i + 1, apiConfigs.length);
        
        // Get store health status
        const healthStatus = await this.getStoreHealthStatus(config);
        console.log(`   - Health Status: ${healthStatus.status}`);
        console.log(`   - Total Orders in DB: ${healthStatus.orderCount}`);
        console.log(`   - Last Sync: ${healthStatus.lastSync ? new Date(healthStatus.lastSync).toLocaleString() : 'Never'}`);
        
        if (healthStatus.issues.length > 0) {
          console.log(`   ⚠️ Health Issues:`);
          healthStatus.issues.forEach(issue => console.log(`      - ${issue}`));
        }

        // Perform the actual sync
        console.log(`   🔄 Starting sync process...`);
        const result = await this.syncStore(config.storeIdentifier);
        results[config.storeIdentifier] = result;
        
        // After successful EcoManager sync, sync Maystro shipping status for this store
        if (result.success) {
          try {
            console.log(`   🚚 Syncing Maystro shipping status...`);
            const { getMaystroService } = await import('./maystro.service');
            const maystroService = getMaystroService(this.redis);
            
            const maystroResult = await maystroService.syncShippingStatus(undefined, config.storeIdentifier);
            console.log(`   ✅ Maystro sync completed: ${maystroResult.updated} orders updated`);
            
            // Add Maystro results to the store result
            result.maystroSync = {
              updated: maystroResult.updated,
              errors: maystroResult.errors
            };
          } catch (maystroError) {
            console.error(`   ❌ Maystro sync failed:`, maystroError);
            result.maystroSync = {
              error: maystroError instanceof Error ? maystroError.message : 'Unknown error'
            };
          }
        }
        
        // Log store processing completion
        const processingTime = Date.now() - storeStartTime;
        this.logStoreProcessingEnd(config, result, processingTime);
        
        // Delay between stores to prevent connection exhaustion
        if (i < apiConfigs.length - 1) {
          console.log(`   ⏳ Waiting 15 seconds before next store...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      } catch (error) {
        const processingTime = Date.now() - storeStartTime;
        console.error(`❌ [Store Error] ${config.storeIdentifier} failed after ${(processingTime / 1000).toFixed(1)}s:`, error);
        
        results[config.storeIdentifier] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime
        };
      }
    }

    const totalSyncTime = Date.now() - syncStartTime;
    console.log(`\n📦 [Sync Complete] All stores processed in ${(totalSyncTime / 1000).toFixed(1)}s`);
    
    // Summary statistics
    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const failureCount = Object.values(results).filter((r: any) => !r.success).length;
    const totalOrders = Object.values(results).reduce((sum: number, r: any) => sum + (r.syncedCount || 0), 0);
    
    console.log(`📊 Sync Summary:`);
    console.log(`   - Successful Stores: ${successCount}/${apiConfigs.length}`);
    console.log(`   - Failed Stores: ${failureCount}/${apiConfigs.length}`);
    console.log(`   - Total Orders Synced: ${totalOrders}`);
    console.log(`   - Average Processing Time: ${(totalSyncTime / apiConfigs.length / 1000).toFixed(1)}s per store`);

    return results;
  }

  /**
   * Sync orders from a specific store with detailed logging
   */
  async syncStore(storeIdentifier: string): Promise<any> {
    const storeStartTime = Date.now();
    console.log(`🔍 [Store Sync] Starting detailed sync for ${storeIdentifier}...`);

    // Get API configuration
    const apiConfig = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier }
    });

    if (!apiConfig || !apiConfig.isActive) {
      throw new Error(`Store configuration not found or inactive: ${storeIdentifier}`);
    }

    console.log(`📋 [Store Config] ${apiConfig.storeName} configuration loaded:`);
    console.log(`   - Store Name: ${apiConfig.storeName}`);
    console.log(`   - Store ID: ${apiConfig.storeIdentifier}`);
    console.log(`   - API Token: ${apiConfig.apiToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`   - Last Used: ${apiConfig.lastUsed ? new Date(apiConfig.lastUsed).toLocaleString() : 'Never'}`);
    console.log(`   - Request Count: ${apiConfig.requestCount || 0}`);

    // Validate required configuration
    if (!apiConfig.baseUrl) {
      throw new Error(`Base URL is missing for store ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
    }

    // Initialize EcoManager service
    console.log(`🔧 [Service Init] Initializing EcoManager service:`);
    console.log(`   - Base URL: ${apiConfig.baseUrl}`);
    console.log(`   - Timeout: 30 seconds`);
    console.log(`   - Rate Limit: 4 req/sec`);

    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, this.redis);

    // Test connection with detailed logging
    console.log(`🔌 [Connection Test] Testing API connectivity...`);
    const connectionStartTime = Date.now();
    const connectionTest = await ecoService.testConnection();
    const connectionTime = Date.now() - connectionStartTime;
    
    if (!connectionTest) {
      console.log(`❌ [Connection Failed] API connection failed after ${connectionTime}ms`);
      throw new Error(`Failed to connect to EcoManager API for ${apiConfig.storeName}`);
    }
    
    console.log(`✅ [Connection Success] API connection established in ${connectionTime}ms`);

    // Get last synced order ID with database query details
    console.log(`🔍 [Database Query] Finding last synced order...`);
    const dbQueryStart = Date.now();
    // First try to get the highest prefixed ecoManagerId for this store
    const prefixedOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "storeIdentifier" = ${storeIdentifier}
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" IS NOT NULL
        AND "ecoManagerId" LIKE ${apiConfig.storeIdentifier + '%'}
      ORDER BY CAST(SUBSTRING("ecoManagerId", ${apiConfig.storeIdentifier.length + 1}) AS INTEGER) DESC
      LIMIT 1
    `;

    let lastOrderId = 0;
    let lastOrder = null;
    
    if (prefixedOrderResult.length > 0) {
      // Extract numeric part from prefixed ID (e.g., "ALPH20525" -> 20525)
      const prefixedId = prefixedOrderResult[0].ecoManagerId;
      lastOrderId = parseInt(prefixedId.substring(apiConfig.storeIdentifier.length));
      
      // Get the actual order for logging
      lastOrder = await prisma.order.findUnique({
        where: { ecoManagerId: prefixedId }
      });
    } else {
      // Fallback: check for non-prefixed ecoManagerIds (backward compatibility)
      const nonPrefixedOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
          AND "ecoManagerId" NOT LIKE ${apiConfig.storeIdentifier + '%'}
        ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
        LIMIT 1
      `;
      
      if (nonPrefixedOrderResult.length > 0) {
        lastOrderId = parseInt(nonPrefixedOrderResult[0].ecoManagerId);
        
        // Get the actual order for logging
        lastOrder = await prisma.order.findUnique({
          where: { ecoManagerId: nonPrefixedOrderResult[0].ecoManagerId }
        });
      }
    }
    
    const dbQueryTime = Date.now() - dbQueryStart;
    console.log(`📊 [Database Result] Query completed in ${dbQueryTime}ms:`);
    console.log(`   - Last Order ID: ${lastOrderId}`);
    console.log(`   - Last Order Date: ${lastOrder?.createdAt ? new Date(lastOrder.createdAt).toLocaleString() : 'None'}`);
    console.log(`   - Last Order Reference: ${lastOrder?.reference || 'None'}`);

    // Fetch new orders with API call details
    console.log(`📡 [API Fetch] Fetching new orders from EcoManager...`);
    const fetchStartTime = Date.now();
    const newOrders = await ecoService.fetchNewOrders(lastOrderId);
    const fetchTime = Date.now() - fetchStartTime;
    
    console.log(`📦 [Fetch Result] Order fetch completed in ${(fetchTime / 1000).toFixed(1)}s:`);
    console.log(`   - New Orders Found: ${newOrders.length}`);
    console.log(`   - Fetch Strategy: Optimized pagination`);
    console.log(`   - API Calls Made: ~${Math.ceil(newOrders.length / 20)} requests`);

    if (newOrders.length === 0) {
      console.log(`✅ [No New Orders] Store is up to date, no processing needed`);
      
      // Still update last used time
      await prisma.apiConfiguration.update({
        where: { id: apiConfig.id },
        data: { lastUsed: new Date() }
      });

      const totalTime = Date.now() - storeStartTime;
      return {
        success: true,
        storeName: apiConfig.storeName,
        storeIdentifier,
        syncedCount: 0,
        errorCount: 0,
        totalFetched: 0,
        processingTime: totalTime,
        lastSync: new Date().toISOString()
      };
    }

    let syncedCount = 0;
    let errorCount = 0;

    // Process orders in smaller batches to prevent connection exhaustion
    const batchSize = 10;
    const totalBatches = Math.ceil(newOrders.length / batchSize);
    
    console.log(`⚙️ [Batch Processing] Starting order processing:`);
    console.log(`   - Total Orders: ${newOrders.length}`);
    console.log(`   - Batch Size: ${batchSize}`);
    console.log(`   - Total Batches: ${totalBatches}`);
    console.log(`   - Estimated Time: ${Math.ceil(totalBatches * 5 / 60)} minutes`);

    for (let i = 0; i < newOrders.length; i += batchSize) {
      const batch = newOrders.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const batchStartTime = Date.now();
      
      console.log(`📦 [Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} orders...`);
      
      for (const ecoOrder of batch) {
        try {
          // Check if order already exists
          // Create store-prefixed ecoManagerId for uniqueness across stores
          const prefixedEcoManagerId = `${apiConfig.storeIdentifier}${ecoOrder.id}`;
          
          const existingOrder = await prisma.order.findUnique({
            where: { ecoManagerId: prefixedEcoManagerId }
          });

          if (!existingOrder) {
            // Create new order with store-prefixed ecoManagerId
            const orderData = ecoService.mapOrderToDatabase(ecoOrder);
            orderData.ecoManagerId = prefixedEcoManagerId;
            
            const newOrder = await prisma.order.create({
              data: orderData
            });
            syncedCount++;

            // Log order creation with details
            console.log(`   ✅ Created order ${newOrder.reference} (ID: ${ecoOrder.id})`);

            // 🚨 FIX: Attempt to assign the new order immediately (same as manual sync)
            try {
              await this.assignmentService.assignOrder(newOrder.id);
            } catch (assignmentError) {
              // Silent assignment - only log actual errors, not routine assignment info
            }
          } else {
            console.log(`   ⏭️ Skipped existing order ${ecoOrder.id}`);
          }
          
          // Small delay between orders to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (orderError) {
          console.error(`   ❌ Failed to process order ${ecoOrder.id}:`, orderError);
          errorCount++;
        }
      }
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`   ✅ Batch ${batchNumber} completed in ${(batchTime / 1000).toFixed(1)}s`);
      
      // Delay between batches to allow connection cleanup
      if (i + batchSize < newOrders.length) {
        console.log(`   ⏳ Waiting 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Update API configuration usage
    console.log(`📊 [Database Update] Updating store usage statistics...`);
    const updateStartTime = Date.now();
    await prisma.apiConfiguration.update({
      where: { id: apiConfig.id },
      data: {
        requestCount: {
          increment: Math.ceil(newOrders.length / 100)
        },
        lastUsed: new Date()
      }
    });
    const updateTime = Date.now() - updateStartTime;
    console.log(`   ✅ Usage stats updated in ${updateTime}ms`);

    // Save sync status
    if (newOrders.length > 0) {
      console.log(`💾 [Sync Status] Saving sync progress...`);
      const lastOrderId = Math.max(...newOrders.map(o => o.id));
      await ecoService.saveSyncStatus(lastOrderId, syncedCount);
      console.log(`   ✅ Sync status saved (last order ID: ${lastOrderId})`);
    }

    const totalTime = Date.now() - storeStartTime;
    const result = {
      success: true,
      storeName: apiConfig.storeName,
      storeIdentifier,
      syncedCount,
      errorCount,
      totalFetched: newOrders.length,
      processingTime: totalTime,
      lastSync: new Date().toISOString()
    };

    console.log(`✅ [Store Complete] ${apiConfig.storeName} sync finished in ${(totalTime / 1000).toFixed(1)}s:`);
    console.log(`   - Orders Synced: ${syncedCount}/${newOrders.length}`);
    console.log(`   - Success Rate: ${newOrders.length > 0 ? ((syncedCount / newOrders.length) * 100).toFixed(1) : 100}%`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Performance: ${newOrders.length > 0 ? (totalTime / newOrders.length).toFixed(0) : 0}ms per order`);

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
      if (!(config as any).baseUrl) {
        throw new Error(`Base URL is missing for store ${config.storeName} (${config.storeIdentifier})`);
      }

      const ecoService = new EcoManagerService({
        storeName: config.storeName,
        storeIdentifier: config.storeIdentifier,
        apiToken: '', // Not needed for status check
        baseUrl: (config as any).baseUrl
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
      if (!apiConfig.baseUrl) {
        throw new Error(`Base URL is missing for store ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
      }

      const ecoService = new EcoManagerService({
        storeName: apiConfig.storeName,
        storeIdentifier: apiConfig.storeIdentifier,
        apiToken: apiConfig.apiToken,
        baseUrl: apiConfig.baseUrl
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

            // Attempt to assign the new order immediately (silent assignment)
            try {
              await this.assignmentService.assignOrder(newOrder.id);
            } catch (assignmentError) {
              // Silent assignment - only log actual errors, not routine assignment info
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
