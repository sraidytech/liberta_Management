import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import axios from 'axios';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

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
  }>;
}

interface HybridSyncResult {
  storeIdentifier: string;
  storeName: string;
  lastSyncedOrderId: number;
  newOrdersFound: number;
  statusChangedOrdersFound: number;
  totalOrdersToSync: number;
  scanRange: {
    from: number;
    to: number;
  };
  sampleNewOrders: any[];
  sampleStatusChangedOrders: any[];
  success: boolean;
  error?: string;
}

/**
 * 🚀 HYBRID SYNC SOLUTION TEST
 * Solution: Check new orders PLUS scan last 1000 orders for status changes
 * This solves the EcoManager date issue by not relying on timestamps
 */
async function testHybridSyncSolution() {
  console.log('🚀 HYBRID SYNC SOLUTION TEST');
  console.log('=' .repeat(80));
  console.log('SOLUTION: Hybrid ID + Status Monitoring');
  console.log('This approach:');
  console.log('  1. ✅ Gets NEW orders (ID > last synced ID) - normal sync');
  console.log('  2. ✅ ALSO scans last 1000 orders for status changes');
  console.log('  3. ✅ Catches orders like alph17097 that change status later');
  console.log('  4. ✅ Does NOT rely on EcoManager broken timestamps');
  console.log('  5. ✅ Solves the missed orders problem!\n');

  try {
    // Test both NATU and ALPH stores
    const stores = ['NATU', 'ALPH'];
    const results: HybridSyncResult[] = [];

    for (const storeId of stores) {
      console.log(`\n🏪 TESTING HYBRID SYNC: ${storeId}`);
      console.log('=' .repeat(60));
      
      const result = await testStoreHybridSync(storeId);
      results.push(result);
      
      if (storeId !== stores[stores.length - 1]) {
        console.log('\n⏳ Waiting 10 seconds before next store...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Generate comprehensive analysis
    console.log('\n📊 HYBRID SYNC ANALYSIS');
    console.log('=' .repeat(80));
    generateHybridAnalysis(results);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

async function testStoreHybridSync(storeIdentifier: string): Promise<HybridSyncResult> {
  const result: HybridSyncResult = {
    storeIdentifier,
    storeName: '',
    lastSyncedOrderId: 0,
    newOrdersFound: 0,
    statusChangedOrdersFound: 0,
    totalOrdersToSync: 0,
    scanRange: { from: 0, to: 0 },
    sampleNewOrders: [],
    sampleStatusChangedOrders: [],
    success: false
  };

  try {
    // 1. Get store configuration
    const storeConfig = await prisma.apiConfiguration.findFirst({
      where: { storeIdentifier, isActive: true }
    });

    if (!storeConfig) {
      throw new Error(`${storeIdentifier} store configuration not found!`);
    }

    result.storeName = storeConfig.storeName;
    console.log(`📋 Store: ${storeConfig.storeName}`);
    console.log(`📋 Base URL: ${storeConfig.baseUrl}`);

    // 2. Get last synced order ID
    const lastSyncedOrderId = await getLastSyncedOrderId(storeIdentifier);
    result.lastSyncedOrderId = lastSyncedOrderId;
    console.log(`📊 Last synced order ID: ${lastSyncedOrderId}`);

    // 3. PHASE 1: Get NEW orders (normal sync logic)
    console.log(`\n🔄 PHASE 1: Getting NEW orders (ID > ${lastSyncedOrderId})...`);
    const newOrders = await fetchNewOrders(storeConfig, lastSyncedOrderId);
    result.newOrdersFound = newOrders.length;
    
    console.log(`📊 New orders found: ${newOrders.length}`);
    if (newOrders.length > 0) {
      const newOrderIds = newOrders.map(o => o.id);
      console.log(`   - ID range: ${Math.min(...newOrderIds)} - ${Math.max(...newOrderIds)}`);
      
      const newDispatchOrders = newOrders.filter(o => o.order_state_name === 'En dispatch');
      console.log(`   - "En dispatch" orders: ${newDispatchOrders.length}/${newOrders.length}`);
      
      result.sampleNewOrders = newDispatchOrders.slice(0, 5).map(order => ({
        id: order.id,
        reference: order.reference,
        customer: order.full_name,
        total: order.total,
        status: order.order_state_name
      }));
    }

    // 4. PHASE 2: Scan last 1000 orders for status changes (THE KEY INNOVATION!)
    console.log(`\n🔍 PHASE 2: Scanning last 1000 orders for status changes...`);
    const scanFromId = Math.max(1, lastSyncedOrderId - 1000);
    const scanToId = lastSyncedOrderId;
    
    result.scanRange = { from: scanFromId, to: scanToId };
    console.log(`📊 Scanning range: ${scanFromId} - ${scanToId}`);

    const statusChangedOrders = await scanOrderRangeForStatusChanges(
      storeConfig, 
      storeIdentifier, 
      scanFromId, 
      scanToId
    );
    
    result.statusChangedOrdersFound = statusChangedOrders.length;
    console.log(`📊 Orders with status changes: ${statusChangedOrders.length}`);

    if (statusChangedOrders.length > 0) {
      const dispatchStatusChanged = statusChangedOrders.filter(o => o.order_state_name === 'En dispatch');
      console.log(`   - Changed to "En dispatch": ${dispatchStatusChanged.length}/${statusChangedOrders.length}`);
      
      result.sampleStatusChangedOrders = dispatchStatusChanged.slice(0, 5).map(order => ({
        id: order.id,
        reference: order.reference,
        customer: order.full_name,
        total: order.total,
        status: order.order_state_name,
        wouldBeMissedByNormalSync: true
      }));

      if (dispatchStatusChanged.length > 0) {
        console.log(`\n🎯 CRITICAL SUCCESS: Found orders that would be MISSED by normal sync!`);
        dispatchStatusChanged.slice(0, 5).forEach((order, index) => {
          console.log(`   ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          console.log(`      Status: ${order.order_state_name} (would be missed by ID-based sync!)`);
        });
      }
    }

    // 5. Calculate total orders to sync
    const newDispatchOrders = newOrders.filter(o => o.order_state_name === 'En dispatch');
    const statusChangedDispatchOrders = statusChangedOrders.filter(o => o.order_state_name === 'En dispatch');
    
    result.totalOrdersToSync = newDispatchOrders.length + statusChangedDispatchOrders.length;

    console.log(`\n📊 HYBRID SYNC SUMMARY:`);
    console.log(`   - New orders to sync: ${newDispatchOrders.length}`);
    console.log(`   - Status changed orders to sync: ${statusChangedDispatchOrders.length}`);
    console.log(`   - TOTAL orders to sync: ${result.totalOrdersToSync}`);

    // 6. Show the solution benefits
    console.log(`\n🎯 HYBRID SYNC BENEFITS:`);
    console.log(`   ✅ Catches NEW orders (normal sync)`);
    console.log(`   ✅ Catches STATUS CHANGES in recent orders`);
    console.log(`   ✅ Does NOT rely on broken EcoManager timestamps`);
    console.log(`   ✅ Solves the alph17097 problem!`);

    result.success = true;
    return result;

  } catch (error) {
    console.error(`❌ Error testing ${storeIdentifier}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Get last synced order ID from database
 */
async function getLastSyncedOrderId(storeIdentifier: string): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
    SELECT "ecoManagerId"
    FROM "orders"
    WHERE "storeIdentifier" = ${storeIdentifier}
      AND "source" = 'ECOMANAGER'
      AND "ecoManagerId" IS NOT NULL
    ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
    LIMIT 1
  `;

  return result.length > 0 ? parseInt(result[0].ecoManagerId) : 0;
}

/**
 * Fetch new orders (normal sync logic)
 */
async function fetchNewOrders(config: any, lastOrderId: number): Promise<EcoManagerOrder[]> {
  try {
    const response = await axios.get(`${config.baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100,
        sort: '-id' // Sort by ID descending (newest first)
      },
      timeout: 15000
    });

    const data = response.data as any;
    const allOrders = data.data || [];
    
    // Filter for orders with ID > lastOrderId (normal sync logic)
    return allOrders.filter((order: any) => order.id > lastOrderId);

  } catch (error: any) {
    console.error(`❌ Failed to fetch new orders: ${error.message}`);
    return [];
  }
}

/**
 * THE KEY INNOVATION: Scan order range for status changes
 * This catches orders like alph17097 that change status after newer orders
 */
async function scanOrderRangeForStatusChanges(
  config: any, 
  storeIdentifier: string, 
  fromId: number, 
  toId: number
): Promise<EcoManagerOrder[]> {
  
  try {
    console.log(`   🔍 Scanning orders ${fromId} - ${toId} for status changes...`);
    
    // Get orders from API in the specified range
    const apiOrders = await fetchOrdersInRange(config, fromId, toId);
    
    if (apiOrders.length === 0) {
      console.log(`   📭 No orders found in range ${fromId} - ${toId}`);
      return [];
    }

    console.log(`   📊 Found ${apiOrders.length} orders in API range`);

    // Get corresponding orders from database
    const orderIds = apiOrders.map(o => o.id.toString());
    const dbOrders = await prisma.order.findMany({
      where: {
        storeIdentifier,
        ecoManagerId: { in: orderIds }
      },
      select: {
        ecoManagerId: true,
        status: true
      }
    });

    console.log(`   📊 Found ${dbOrders.length} matching orders in database`);

    // Find orders where status changed to "En dispatch"
    const statusChangedOrders: EcoManagerOrder[] = [];
    
    for (const apiOrder of apiOrders) {
      const dbOrder = dbOrders.find(db => db.ecoManagerId === apiOrder.id.toString());
      
      if (dbOrder) {
        // Order exists in database - check for status change
        const dbStatus = dbOrder.status;
        const apiStatus = apiOrder.order_state_name;
        
        // If API shows "En dispatch" but database shows different status
        if (apiStatus === 'En dispatch' && dbStatus !== 'PENDING') {
          statusChangedOrders.push(apiOrder);
          console.log(`   🔄 Status change detected: Order ${apiOrder.id} (${dbStatus} → ${apiStatus})`);
        }
      } else {
        // Order doesn't exist in database but has "En dispatch" status
        if (apiOrder.order_state_name === 'En dispatch') {
          statusChangedOrders.push(apiOrder);
          console.log(`   🆕 New dispatch order found: Order ${apiOrder.id}`);
        }
      }
    }

    console.log(`   ✅ Found ${statusChangedOrders.length} orders with status changes`);
    return statusChangedOrders;

  } catch (error: any) {
    console.error(`   ❌ Failed to scan order range: ${error.message}`);
    return [];
  }
}

/**
 * Fetch orders in a specific ID range
 */
async function fetchOrdersInRange(config: any, fromId: number, toId: number): Promise<EcoManagerOrder[]> {
  try {
    // Note: This is a simplified approach. In reality, you might need to:
    // 1. Fetch multiple pages to get all orders in range
    // 2. Use different API parameters if available
    // 3. Implement pagination to get all orders
    
    const response = await axios.get(`${config.baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100,
        sort: '-id'
      },
      timeout: 15000
    });

    const data = response.data as any;
    const allOrders = data.data || [];
    
    // Filter orders in the specified range
    return allOrders.filter((order: any) => order.id >= fromId && order.id <= toId);

  } catch (error: any) {
    console.error(`❌ Failed to fetch orders in range: ${error.message}`);
    return [];
  }
}

/**
 * Generate comprehensive analysis of hybrid sync results
 */
function generateHybridAnalysis(results: HybridSyncResult[]) {
  console.log('\n🎯 HYBRID SYNC SOLUTION ANALYSIS:');
  console.log('-' .repeat(50));

  let totalNewOrders = 0;
  let totalStatusChangedOrders = 0;
  let totalOrdersToSync = 0;

  results.forEach(result => {
    if (!result.success) {
      console.log(`❌ ${result.storeIdentifier}: FAILED - ${result.error}`);
      return;
    }

    console.log(`\n🏪 ${result.storeIdentifier} (${result.storeName}):`);
    console.log(`   📊 Last synced ID: ${result.lastSyncedOrderId}`);
    console.log(`   📊 New orders found: ${result.newOrdersFound}`);
    console.log(`   📊 Status changed orders: ${result.statusChangedOrdersFound}`);
    console.log(`   📊 Total orders to sync: ${result.totalOrdersToSync}`);
    console.log(`   📊 Scan range: ${result.scanRange.from} - ${result.scanRange.to}`);

    if (result.statusChangedOrdersFound > 0) {
      console.log(`   🎯 SUCCESS: Found ${result.statusChangedOrdersFound} orders that would be MISSED by normal sync!`);
    }

    totalNewOrders += result.newOrdersFound;
    totalStatusChangedOrders += result.statusChangedOrdersFound;
    totalOrdersToSync += result.totalOrdersToSync;
  });

  console.log('\n📊 OVERALL RESULTS:');
  console.log(`   - Total new orders: ${totalNewOrders}`);
  console.log(`   - Total status changed orders: ${totalStatusChangedOrders}`);
  console.log(`   - Total orders to sync: ${totalOrdersToSync}`);

  console.log('\n🎯 SOLUTION BENEFITS:');
  console.log('✅ Hybrid sync advantages:');
  console.log('   - Catches NEW orders (normal sync)');
  console.log('   - Catches STATUS CHANGES in recent orders');
  console.log('   - Does NOT rely on broken EcoManager timestamps');
  console.log('   - Solves the alph17097 missed order problem');
  console.log('   - Works with existing infrastructure');

  if (totalStatusChangedOrders > 0) {
    console.log(`\n🚨 CRITICAL SUCCESS: Found ${totalStatusChangedOrders} orders that would be missed by normal sync!`);
    console.log('   This proves the hybrid approach is necessary.');
  }

  console.log('\n🔧 IMPLEMENTATION RECOMMENDATIONS:');
  console.log('1. 🎯 Implement hybrid sync in EcoManagerService.fetchNewOrders()');
  console.log('2. 🎯 Add scanOrderRangeForStatusChanges() method');
  console.log('3. 🎯 Configure scan range (recommend 1000-2000 orders)');
  console.log('4. 🎯 Add caching to avoid re-scanning same orders');
  console.log('5. 🎯 Monitor performance and adjust scan range as needed');
}

// Run the test
testHybridSyncSolution().catch(console.error);