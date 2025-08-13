import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '@/services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

interface TestResult {
  storeIdentifier: string;
  storeName: string;
  lastSyncedOrderId: number;
  orderIdsToFetch: number[];
  totalOrdersToFetch: number;
  ordersSkippedByOldLogic: number;
  ordersFoundByNewLogic: number;
  sampleConflictingIds: number[];
  success: boolean;
  error?: string;
}

/**
 * 🔍 ADMIN SYNC TEST - SHOW ORDER IDS ONLY
 * This shows exactly which order IDs would be fetched by the sync process
 * WITHOUT actually fetching the full order data (much faster)
 */
async function testAdminSyncShowIdsOnly() {
  console.log('🔍 ADMIN SYNC TEST - SHOW ORDER IDS ONLY');
  console.log('=' .repeat(80));
  console.log('This test shows which order IDs would be fetched by the sync process');
  console.log('WITHOUT actually fetching the full order data (much faster)');
  console.log('');

  try {
    // Get all active API configurations
    const activeConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (activeConfigs.length === 0) {
      console.log('❌ No active store configurations found');
      return;
    }

    console.log(`Found ${activeConfigs.length} active stores to test`);
    const results: TestResult[] = [];

    // Process each store sequentially
    for (const apiConfig of activeConfigs) {
      console.log(`\n🏪 TESTING STORE: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
      console.log('=' .repeat(60));
      
      const result = await testStoreShowIdsOnly(apiConfig);
      results.push(result);
      
      if (apiConfig !== activeConfigs[activeConfigs.length - 1]) {
        console.log('\n⏳ Waiting 5 seconds before next store...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Generate comprehensive analysis
    console.log('\n📊 COMPLETE SYNC ANALYSIS');
    console.log('=' .repeat(80));
    generateCompleteAnalysis(results);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

async function testStoreShowIdsOnly(apiConfig: any): Promise<TestResult> {
  const result: TestResult = {
    storeIdentifier: apiConfig.storeIdentifier,
    storeName: apiConfig.storeName,
    lastSyncedOrderId: 0,
    orderIdsToFetch: [],
    totalOrdersToFetch: 0,
    ordersSkippedByOldLogic: 0,
    ordersFoundByNewLogic: 0,
    sampleConflictingIds: [],
    success: false
  };

  try {
    console.log(`📋 Store: ${apiConfig.storeName}`);
    console.log(`📋 Base URL: ${apiConfig.baseUrl}`);

    // STEP 1: Get last synced order ID using the correct query for this store
    const lastOrderId = await getLastSyncedOrderId(apiConfig.storeIdentifier);
    result.lastSyncedOrderId = lastOrderId;
    console.log(`📊 Last synced EcoManager order ID for ${apiConfig.storeIdentifier}: ${lastOrderId}`);

    // STEP 2: Initialize EcoManager service
    if (!apiConfig.baseUrl) {
      throw new Error(`Base URL is missing for store ${apiConfig.storeName}`);
    }

    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    // STEP 3: Test connection
    const connectionTest = await ecoService.testConnection();
    if (!connectionTest) {
      throw new Error('Failed to connect to EcoManager API');
    }

    // STEP 4: Get order IDs that would be fetched (lightweight scan)
    console.log(`\n🔍 SCANNING FOR ORDER IDS TO FETCH...`);
    const orderIdsToFetch = await getOrderIdsToFetch(ecoService, lastOrderId, 10); // Scan 10 pages max
    result.orderIdsToFetch = orderIdsToFetch;
    result.totalOrdersToFetch = orderIdsToFetch.length;
    
    console.log(`📊 Found ${orderIdsToFetch.length} order IDs that would be fetched`);
    if (orderIdsToFetch.length > 0) {
      const minId = Math.min(...orderIdsToFetch);
      const maxId = Math.max(...orderIdsToFetch);
      console.log(`   - ID range: ${minId} - ${maxId}`);
      console.log(`   - Sample IDs: ${orderIdsToFetch.slice(0, 10).join(', ')}${orderIdsToFetch.length > 10 ? '...' : ''}`);
    }

    // STEP 5: Test duplicate check logic for these IDs
    console.log(`\n🔍 TESTING DUPLICATE CHECK FOR THESE IDS...`);
    let ordersSkippedByOldLogic = 0;
    let ordersFoundByNewLogic = 0;
    const sampleConflictingIds: number[] = [];

    for (const orderId of orderIdsToFetch.slice(0, 50)) { // Test first 50 IDs only
      try {
        // 🔴 OLD LOGIC: Check by ecoManagerId only (CURRENT BUGGY BEHAVIOR)
        const existingOrderOldLogic = await prisma.order.findUnique({
          where: { ecoManagerId: orderId.toString() }
        });

        // 🟢 NEW LOGIC: Check by storeIdentifier + ecoManagerId (FIXED BEHAVIOR)
        const existingOrderNewLogic = await prisma.order.findFirst({
          where: { 
            storeIdentifier: apiConfig.storeIdentifier,
            ecoManagerId: orderId.toString()
          }
        });

        // Compare the results
        const wouldBeSkippedByOldLogic = !!existingOrderOldLogic;
        const wouldBeSkippedByNewLogic = !!existingOrderNewLogic;

        if (wouldBeSkippedByOldLogic && !wouldBeSkippedByNewLogic) {
          // This order would be INCORRECTLY skipped by old logic but CORRECTLY processed by new logic
          ordersSkippedByOldLogic++;
          ordersFoundByNewLogic++;
          
          if (sampleConflictingIds.length < 10) {
            sampleConflictingIds.push(orderId);
          }

          if (ordersSkippedByOldLogic <= 5) {
            console.log(`🚨 CONFLICT: Order ID ${orderId} would be skipped (conflicts with ${existingOrderOldLogic?.reference} from ${existingOrderOldLogic?.storeIdentifier})`);
          }
        }

      } catch (orderError) {
        console.error(`Error checking order ${orderId}:`, orderError);
      }
    }

    result.ordersSkippedByOldLogic = ordersSkippedByOldLogic;
    result.ordersFoundByNewLogic = ordersFoundByNewLogic;
    result.sampleConflictingIds = sampleConflictingIds;

    console.log(`\n📊 DUPLICATE CHECK RESULTS (tested ${Math.min(50, orderIdsToFetch.length)} IDs):`);
    console.log(`   🔴 Orders that would be INCORRECTLY skipped: ${ordersSkippedByOldLogic}`);
    console.log(`   🟢 Orders that would be CORRECTLY processed: ${ordersFoundByNewLogic}`);
    
    if (ordersSkippedByOldLogic > 0) {
      console.log(`   🚨 Conflicting IDs: ${sampleConflictingIds.slice(0, 10).join(', ')}`);
      
      // Extrapolate to full dataset
      const totalConflicts = Math.round((ordersSkippedByOldLogic / Math.min(50, orderIdsToFetch.length)) * orderIdsToFetch.length);
      console.log(`   📊 Estimated total conflicts in all ${orderIdsToFetch.length} orders: ~${totalConflicts}`);
    }

    result.success = true;
    return result;

  } catch (error: any) {
    console.error(`❌ Error testing ${apiConfig.storeIdentifier}:`, error.message);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Get last synced order ID for a specific store
 */
async function getLastSyncedOrderId(storeIdentifier: string): Promise<number> {
  try {
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
  } catch (error) {
    // For ALPH, try alternative approach
    if (storeIdentifier === 'ALPH') {
      try {
        const result = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
          SELECT "ecoManagerId"
          FROM "orders"
          WHERE "storeIdentifier" = ${storeIdentifier}
            AND "source" = 'ECOMANAGER'
            AND "ecoManagerId" IS NOT NULL
          ORDER BY CAST(REGEXP_REPLACE("ecoManagerId", '[^0-9]', '', 'g') AS INTEGER) DESC
          LIMIT 1
        `;
        const numericPart = result.length > 0 ? result[0].ecoManagerId.replace(/[^0-9]/g, '') : '0';
        return parseInt(numericPart);
      } catch (alphError) {
        console.log(`⚠️  Could not get last synced ID for ${storeIdentifier}, using 0`);
        return 0;
      }
    }
    return 0;
  }
}

/**
 * Get order IDs that would be fetched (lightweight scan)
 */
async function getOrderIdsToFetch(
  ecoService: EcoManagerService, 
  lastOrderId: number, 
  maxPages: number
): Promise<number[]> {
  
  console.log(`   🔍 Scanning API for order IDs > ${lastOrderId}...`);
  
  const orderIds: number[] = [];
  let pagesScanned = 0;
  
  try {
    let cursor: string | null = null;
    
    while (pagesScanned < maxPages) {
      pagesScanned++;
      console.log(`     📄 Scanning page ${pagesScanned}...`);
      
      const result: any = await (ecoService as any).fetchOrdersPageCursor(cursor);
      
      if (!result.success) {
        console.log(`     ❌ Failed to fetch page ${pagesScanned}: ${result.error}`);
        break;
      }
      
      const orders = result.data.data;
      
      if (orders.length === 0) {
        console.log(`     📭 Page ${pagesScanned} is empty - reached end`);
        break;
      }
      
      const minId = Math.min(...orders.map((o: any) => o.id));
      const maxId = Math.max(...orders.map((o: any) => o.id));
      
      console.log(`     📋 Page ${pagesScanned}: ${orders.length} orders, IDs ${minId}-${maxId}`);
      
      // Collect order IDs that are newer than last synced
      const newOrderIds = orders
        .filter((order: any) => order.id > lastOrderId)
        .map((order: any) => order.id);
      
      orderIds.push(...newOrderIds);
      
      console.log(`     📊 Found ${newOrderIds.length} new order IDs on this page`);
      
      // If we found orders older than lastOrderId, we can stop
      if (orders.some((order: any) => order.id <= lastOrderId)) {
        console.log(`     ⏹️  Reached orders <= ${lastOrderId}, stopping scan`);
        break;
      }
      
      cursor = result.data.meta?.next_cursor;
      if (!cursor) {
        console.log(`     ⏹️  No more pages available`);
        break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    console.log(`   ✅ Scan complete: ${pagesScanned} pages scanned, ${orderIds.length} order IDs found`);
    
  } catch (error) {
    console.error(`   ❌ Scan failed:`, error);
  }
  
  return orderIds.sort((a, b) => b - a); // Sort descending
}

/**
 * Generate comprehensive analysis of the results
 */
function generateCompleteAnalysis(results: TestResult[]) {
  console.log('\n🎯 COMPLETE ANALYSIS:');
  console.log('-' .repeat(50));

  let totalOrdersToFetch = 0;
  let totalOrdersSkippedByOldLogic = 0;
  let totalOrdersFoundByNewLogic = 0;

  results.forEach(result => {
    if (!result.success) {
      console.log(`❌ ${result.storeIdentifier}: FAILED - ${result.error}`);
      return;
    }

    console.log(`\n🏪 ${result.storeIdentifier} (${result.storeName}):`);
    console.log(`   📊 Last synced ID: ${result.lastSyncedOrderId}`);
    console.log(`   📊 Order IDs to fetch: ${result.totalOrdersToFetch}`);
    console.log(`   🔴 Orders skipped by OLD logic: ${result.ordersSkippedByOldLogic}`);
    console.log(`   🟢 Orders found by NEW logic: ${result.ordersFoundByNewLogic}`);

    if (result.totalOrdersToFetch > 0) {
      const sampleIds = result.orderIdsToFetch.slice(0, 5);
      console.log(`   📋 Sample IDs to fetch: ${sampleIds.join(', ')}${result.orderIdsToFetch.length > 5 ? '...' : ''}`);
    }

    if (result.ordersSkippedByOldLogic > 0) {
      console.log(`   🚨 CRITICAL: ${result.ordersSkippedByOldLogic} orders would be MISSED by current logic!`);
      console.log(`   🔍 Conflicting IDs: ${result.sampleConflictingIds.join(', ')}`);
    }

    totalOrdersToFetch += result.totalOrdersToFetch;
    totalOrdersSkippedByOldLogic += result.ordersSkippedByOldLogic;
    totalOrdersFoundByNewLogic += result.ordersFoundByNewLogic;
  });

  console.log('\n📊 OVERALL RESULTS:');
  console.log(`   - Total order IDs to fetch: ${totalOrdersToFetch}`);
  console.log(`   🔴 Total orders MISSED by old logic: ${totalOrdersSkippedByOldLogic}`);
  console.log(`   🟢 Total orders FOUND by new logic: ${totalOrdersFoundByNewLogic}`);

  if (totalOrdersSkippedByOldLogic > 0) {
    console.log(`\n🚨 CRITICAL IMPACT: ${totalOrdersSkippedByOldLogic} orders are being MISSED!`);
    console.log('   This explains why orders like ALPH20525 are not being synced.');
    console.log('   The fix is simple: change the duplicate check from ecoManagerId to storeIdentifier + ecoManagerId.');
  }

  console.log('\n🔧 IMPLEMENTATION FIX:');
  console.log('📁 File: backend/src/modules/orders/orders.controller.ts');
  console.log('📍 Line: 1355-1357 (in syncAllStores method)');
  console.log('');
  console.log('🔴 CURRENT CODE:');
  console.log('   const existingOrder = await prisma.order.findUnique({');
  console.log('     where: { ecoManagerId: ecoOrder.id.toString() }');
  console.log('   });');
  console.log('');
  console.log('🟢 FIXED CODE:');
  console.log('   const existingOrder = await prisma.order.findFirst({');
  console.log('     where: { ');
  console.log('       storeIdentifier: apiConfig.storeIdentifier,');
  console.log('       ecoManagerId: ecoOrder.id.toString()');
  console.log('     }');
  console.log('   });');
  console.log('');
  console.log('✅ This change will fix the duplicate order issue!');
}

// Run the test
testAdminSyncShowIdsOnly().catch(console.error);