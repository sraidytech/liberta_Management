import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import axios from 'axios';

/**
 * 🚀 HYBRID SYNC IMPLEMENTATION
 * 
 * This is the actual implementation code for the Hybrid Sync Solution
 * that solves the EcoManager date issue and prevents missed orders.
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Add this code to your EcoManagerService class
 * 2. Replace the existing fetchNewOrders() method
 * 3. Update the sync controller to use the new method
 */

interface EcoManagerOrder {
  id: number;
  reference: string;
  order_state_name: string;
  full_name: string;
  telephone: string;
  wilaya: string;
  commune: string;
  total: number;
  created_at: string;
  items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    unit_price?: number;
    total_price?: number;
    sku?: string;
  }>;
}

interface HybridSyncConfig {
  scanRangeSize: number; // How many orders to scan backwards (default: 1000)
  enableStatusChangeDetection: boolean; // Enable/disable status change scanning
  maxApiCalls: number; // Maximum API calls per sync (default: 50)
  cacheResults: boolean; // Cache results to avoid re-scanning
}

/**
 * 🔧 IMPLEMENTATION: Add this to your EcoManagerService class
 */
export class HybridSyncImplementation {
  private prisma: PrismaClient;
  private redis: Redis;
  private config: any; // Your store config
  private axiosInstance: any; // Your axios instance

  constructor(prisma: PrismaClient, redis: Redis, config: any, axiosInstance: any) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    this.axiosInstance = axiosInstance;
  }

  /**
   * 🚀 MAIN METHOD: Replace your existing fetchNewOrders() with this
   */
  async fetchNewOrdersHybrid(
    lastOrderId: number, 
    hybridConfig: HybridSyncConfig = {
      scanRangeSize: 1000,
      enableStatusChangeDetection: true,
      maxApiCalls: 50,
      cacheResults: true
    }
  ): Promise<EcoManagerOrder[]> {
    
    console.log(`🚀 HYBRID SYNC: Starting for ${this.config.storeName}...`);
    console.log(`   Last synced ID: ${lastOrderId}`);
    console.log(`   Scan range: ${hybridConfig.scanRangeSize} orders`);

    const allOrdersToSync: EcoManagerOrder[] = [];
    let apiCallsUsed = 0;

    try {
      // PHASE 1: Get NEW orders (normal sync logic)
      console.log(`\n🔄 PHASE 1: Fetching NEW orders (ID > ${lastOrderId})...`);
      const newOrders = await this.fetchNewOrdersNormal(lastOrderId);
      apiCallsUsed += Math.ceil(newOrders.length / 100); // Estimate API calls

      const newDispatchOrders = newOrders.filter(order => order.order_state_name === 'En dispatch');
      console.log(`   ✅ Found ${newOrders.length} new orders, ${newDispatchOrders.length} with "En dispatch" status`);
      
      allOrdersToSync.push(...newDispatchOrders);

      // PHASE 2: Scan for status changes (THE KEY INNOVATION!)
      if (hybridConfig.enableStatusChangeDetection && apiCallsUsed < hybridConfig.maxApiCalls) {
        console.log(`\n🔍 PHASE 2: Scanning for status changes...`);
        
        const scanFromId = Math.max(1, lastOrderId - hybridConfig.scanRangeSize);
        const scanToId = lastOrderId;
        
        console.log(`   Scanning range: ${scanFromId} - ${scanToId}`);
        
        const statusChangedOrders = await this.scanForStatusChanges(
          scanFromId, 
          scanToId, 
          hybridConfig.maxApiCalls - apiCallsUsed
        );
        
        const statusChangedDispatchOrders = statusChangedOrders.filter(order => 
          order.order_state_name === 'En dispatch'
        );
        
        console.log(`   ✅ Found ${statusChangedOrders.length} status changes, ${statusChangedDispatchOrders.length} now "En dispatch"`);
        
        // Add status changed orders (avoiding duplicates)
        const existingIds = new Set(allOrdersToSync.map(o => o.id));
        const uniqueStatusChangedOrders = statusChangedDispatchOrders.filter(order => 
          !existingIds.has(order.id)
        );
        
        allOrdersToSync.push(...uniqueStatusChangedOrders);
        
        if (uniqueStatusChangedOrders.length > 0) {
          console.log(`   🎯 CRITICAL SUCCESS: Found ${uniqueStatusChangedOrders.length} orders that would be MISSED by normal sync!`);
          uniqueStatusChangedOrders.forEach(order => {
            console.log(`      - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          });
        }
      }

      // PHASE 3: Cache results (optional)
      if (hybridConfig.cacheResults && allOrdersToSync.length > 0) {
        await this.cacheHybridSyncResults(lastOrderId, allOrdersToSync);
      }

      console.log(`\n📊 HYBRID SYNC COMPLETE:`);
      console.log(`   - New orders: ${newDispatchOrders.length}`);
      console.log(`   - Status changed orders: ${allOrdersToSync.length - newDispatchOrders.length}`);
      console.log(`   - TOTAL orders to sync: ${allOrdersToSync.length}`);
      console.log(`   - API calls used: ~${apiCallsUsed}`);

      return allOrdersToSync;

    } catch (error) {
      console.error(`❌ Hybrid sync failed for ${this.config.storeName}:`, error);
      // Fallback to normal sync
      console.log(`🔄 Falling back to normal sync...`);
      const fallbackOrders = await this.fetchNewOrdersNormal(lastOrderId);
      return fallbackOrders.filter(order => order.order_state_name === 'En dispatch');
    }
  }

  /**
   * 🔄 PHASE 1: Normal sync logic (existing functionality)
   */
  private async fetchNewOrdersNormal(lastOrderId: number): Promise<EcoManagerOrder[]> {
    try {
      const response = await this.axiosInstance.get('/orders', {
        params: {
          per_page: 100,
          sort: '-id' // Sort by ID descending (newest first)
        }
      });

      const data = response.data;
      const allOrders = data.data || [];
      
      // Filter for orders with ID > lastOrderId
      return allOrders.filter((order: any) => order.id > lastOrderId);

    } catch (error) {
      console.error(`❌ Failed to fetch new orders:`, error);
      return [];
    }
  }

  /**
   * 🔍 PHASE 2: Scan for status changes (THE KEY INNOVATION!)
   * This catches orders like alph17097 that change status after newer orders
   */
  private async scanForStatusChanges(
    fromId: number, 
    toId: number, 
    maxApiCalls: number
  ): Promise<EcoManagerOrder[]> {
    
    try {
      // Get orders from database in the range
      const dbOrders = await this.prisma.order.findMany({
        where: {
          storeIdentifier: this.config.storeIdentifier,
          ecoManagerId: {
            gte: fromId.toString(),
            lte: toId.toString()
          }
        },
        select: {
          ecoManagerId: true,
          status: true
        }
      });

      if (dbOrders.length === 0) {
        console.log(`   📭 No orders found in database range ${fromId} - ${toId}`);
        return [];
      }

      console.log(`   📊 Found ${dbOrders.length} orders in database range`);

      // Get the same orders from API to check for status changes
      const apiOrders = await this.fetchOrdersInRange(fromId, toId, maxApiCalls);
      
      if (apiOrders.length === 0) {
        console.log(`   📭 No orders found in API range ${fromId} - ${toId}`);
        return [];
      }

      console.log(`   📊 Found ${apiOrders.length} orders in API range`);

      // Find orders where status changed
      const statusChangedOrders: EcoManagerOrder[] = [];
      
      for (const apiOrder of apiOrders) {
        const dbOrder = dbOrders.find(db => db.ecoManagerId === apiOrder.id.toString());
        
        if (dbOrder) {
          const dbStatus = dbOrder.status;
          const apiStatus = apiOrder.order_state_name;
          
          // Check if status changed to "En dispatch"
          if (apiStatus === 'En dispatch' && this.mapOrderStatus(apiStatus) !== dbStatus) {
            statusChangedOrders.push(apiOrder);
            console.log(`   🔄 Status change: Order ${apiOrder.id} (${dbStatus} → ${apiStatus})`);
          }
        }
      }

      return statusChangedOrders;

    } catch (error) {
      console.error(`   ❌ Failed to scan for status changes:`, error);
      return [];
    }
  }

  /**
   * 📡 Fetch orders in a specific ID range from API
   */
  private async fetchOrdersInRange(fromId: number, toId: number, maxApiCalls: number): Promise<EcoManagerOrder[]> {
    try {
      const allOrders: EcoManagerOrder[] = [];
      let page = 1;
      let apiCallsUsed = 0;

      while (apiCallsUsed < maxApiCalls) {
        const response = await this.axiosInstance.get('/orders', {
          params: {
            per_page: 100,
            page: page,
            sort: '-id'
          }
        });

        apiCallsUsed++;
        const data = response.data;
        const orders = data.data || [];

        if (orders.length === 0) break;

        // Filter orders in the specified range
        const ordersInRange = orders.filter((order: any) => 
          order.id >= fromId && order.id <= toId
        );

        allOrders.push(...ordersInRange);

        // If we found orders below our range, we can stop
        const minOrderId = Math.min(...orders.map((o: any) => o.id));
        if (minOrderId < fromId) break;

        page++;
      }

      return allOrders;

    } catch (error) {
      console.error(`❌ Failed to fetch orders in range:`, error);
      return [];
    }
  }

  /**
   * 🗺️ Map EcoManager status to internal status (existing method)
   */
  private mapOrderStatus(ecoStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'En dispatch': 'PENDING',
      'Confirmé': 'CONFIRMED',
      'Livré': 'DELIVERED',
      'Annulé': 'CANCELLED',
      'En cours de traitement': 'PROCESSING'
    };

    return statusMap[ecoStatus] || 'PENDING';
  }

  /**
   * 💾 Cache hybrid sync results (optional optimization)
   */
  private async cacheHybridSyncResults(lastOrderId: number, orders: EcoManagerOrder[]): Promise<void> {
    try {
      const cacheKey = `hybrid_sync:${this.config.storeIdentifier}:${lastOrderId}`;
      const cacheData = {
        timestamp: new Date().toISOString(),
        lastOrderId,
        orderCount: orders.length,
        orderIds: orders.map(o => o.id)
      };

      await this.redis.setex(cacheKey, 3600, JSON.stringify(cacheData)); // Cache for 1 hour
      console.log(`   💾 Cached hybrid sync results: ${orders.length} orders`);

    } catch (error) {
      console.error(`   ❌ Failed to cache results:`, error);
    }
  }
}

/**
 * 🔧 INTEGRATION EXAMPLE: How to use in your existing sync controller
 */
export function integrationExample() {
  console.log(`
🔧 INTEGRATION INSTRUCTIONS:

1️⃣ ADD TO EcoManagerService class:

// Add this method to your EcoManagerService class
async fetchNewOrders(lastOrderId: number): Promise<EcoManagerOrder[]> {
  const hybridSync = new HybridSyncImplementation(
    prisma, 
    this.redis, 
    this.config, 
    this.axiosInstance
  );
  
  return await hybridSync.fetchNewOrdersHybrid(lastOrderId, {
    scanRangeSize: 1000,           // Scan last 1000 orders
    enableStatusChangeDetection: true,
    maxApiCalls: 50,
    cacheResults: true
  });
}

2️⃣ UPDATE SYNC CONTROLLER:

// Your existing sync controller will automatically use the new method
// No changes needed in OrdersController.syncAllStores()

3️⃣ CONFIGURATION OPTIONS:

const hybridConfig = {
  scanRangeSize: 1000,           // How many orders to scan backwards
  enableStatusChangeDetection: true,  // Enable status change detection
  maxApiCalls: 50,               // Limit API calls per sync
  cacheResults: true             // Cache results for performance
};

4️⃣ MONITORING:

// Add logging to monitor the hybrid sync performance
// Check how many "missed" orders are being caught
// Adjust scanRangeSize based on your needs

🎯 BENEFITS:
✅ Catches orders like alph17097 that change status later
✅ Does NOT rely on broken EcoManager timestamps  
✅ Works with existing infrastructure
✅ Configurable and optimizable
✅ Solves the missed orders problem!
  `);
}

// Show integration example
integrationExample();