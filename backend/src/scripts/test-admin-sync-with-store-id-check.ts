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

interface TestResult {
  storeIdentifier: string;
  storeName: string;
  lastSyncedOrderId: number;
  normalSyncOrders: number;
  backwardScanOrders: number;
  totalOrdersToSync: number;
  ordersSkippedByOldLogic: number;
  ordersFoundByNewLogic: number;
  sampleSkippedOrders: any[];
  sampleFoundOrders: any[];
  success: boolean;
  error?: string;
}

/**
 * 🚀 ADMIN SYNC TEST WITH STORE+ID DUPLICATE CHECK
 * This replicates the exact logic of OrdersController.syncAllStores()
 * BUT fixes the duplicate check to use storeIdentifier + ecoManagerId
 * 
 * ISSUE: Current logic checks: WHERE ecoManagerId = '20525'
 * PROBLEM: This finds NATU20525 when looking for ALPH20525
 * 
 * SOLUTION: Check by storeIdentifier + ecoManagerId: WHERE storeIdentifier = 'ALPH' AND ecoManagerId = '20525'
 * This ensures each store's orders are checked independently
 */
async function testAdminSyncWithStoreIdCheck() {
  console.log('🚀 ADMIN SYNC TEST WITH STORE+ID DUPLICATE CHECK');
  console.log('=' .repeat(80));
  console.log('This test replicates the EXACT logic of the admin "Sync New Orders" button');
  console.log('BUT fixes the duplicate check to use storeIdentifier + ecoManagerId');
  console.log('');
  console.log('🐛 ISSUE: Current logic checks: WHERE ecoManagerId = "20525"');
  console.log('❌ PROBLEM: This finds NATU20525 when looking for ALPH20525');
  console.log('');
  console.log('✅ SOLUTION: Check by storeIdentifier + ecoManagerId:');
  console.log('   WHERE storeIdentifier = "ALPH" AND ecoManagerId = "20525"');
  console.log('✅ This ensures each store\'s orders are checked independently');
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

    // Process each store sequentially (same as admin button)
    for (const apiConfig of activeConfigs) {
      console.log(`\n🏪 TESTING STORE: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
      console.log('=' .repeat(60));
      
      const result = await testStoreWithStoreIdCheck(apiConfig);
      results.push(result);
      
      if (apiConfig !== activeConfigs[activeConfigs.length - 1]) {
        console.log('\n⏳ Waiting 15 seconds before next store...');
        await new Promise(resolve => setTimeout(resolve, 15000));
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

async function testStoreWithStoreIdCheck(apiConfig: any): Promise<TestResult> {
  const result: TestResult = {
    storeIdentifier: apiConfig.storeIdentifier,
    storeName: apiConfig.storeName,
    lastSyncedOrderId: 0,
    normalSyncOrders: 0,
    backwardScanOrders: 0,
    totalOrdersToSync: 0,
    ordersSkippedByOldLogic: 0,
    ordersFoundByNewLogic: 0,
    sampleSkippedOrders: [],
    sampleFoundOrders: [],
    success: false
  };

  try {
    console.log(`📋 Store: ${apiConfig.storeName}`);
    console.log(`📋 Base URL: ${apiConfig.baseUrl}`);

    // STEP 1: Get last synced order ID using the correct query for this store
    const lastOrderId = await getLastSyncedOrderId(apiConfig.storeIdentifier);
    result.lastSyncedOrderId = lastOrderId;
    console.log(`📊 Last synced EcoManager order ID for ${apiConfig.storeIdentifier}: ${lastOrderId}`);

    // STEP 2: Initialize EcoManager service (EXACT same as admin button)
    if (!apiConfig.baseUrl) {
      throw new Error(`Base URL is missing for store ${apiConfig.storeName}`);
    }

    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    // STEP 3: Test connection (EXACT same as admin button)
    const connectionTest = await ecoService.testConnection();
    if (!connectionTest) {
      throw new Error('Failed to connect to EcoManager API');
    }

    // STEP 4: NORMAL SYNC - fetchNewOrders (EXACT same as admin button)
    console.log(`\n🔄 PHASE 1: Normal sync - fetchNewOrders(${lastOrderId})...`);
    const normalSyncOrders = await ecoService.fetchNewOrders(lastOrderId);
    result.normalSyncOrders = normalSyncOrders.length;
    
    console.log(`📊 Normal sync found: ${normalSyncOrders.length} orders`);

    // STEP 5: BACKWARD SCANNING - 30 pages to catch missed orders
    console.log(`\n🔍 PHASE 2: Backward scanning - 30 pages from last synced ID...`);
    const backwardScanOrders = await performBackwardScanning(ecoService, lastOrderId, 30, apiConfig.storeIdentifier);
    result.backwardScanOrders = backwardScanOrders.orders.length;
    
    console.log(`📊 Backward scan found: ${backwardScanOrders.orders.length} additional orders`);

    // STEP 6: Combine all orders
    const allOrders = [...normalSyncOrders, ...backwardScanOrders.orders];
    console.log(`📊 TOTAL orders to process: ${allOrders.length}`);

    // STEP 7: TEST BOTH DUPLICATE CHECK METHODS
    console.log(`\n🔍 TESTING DUPLICATE CHECK METHODS:`);
    console.log('=' .repeat(50));

    let ordersSkippedByOldLogic = 0;
    let ordersFoundByNewLogic = 0;
    const sampleSkippedOrders: any[] = [];
    const sampleFoundOrders: any[] = [];

    for (const ecoOrder of allOrders) {
      try {
        // 🔴 OLD LOGIC: Check by ecoManagerId only (CURRENT BUGGY BEHAVIOR)
        const existingOrderOldLogic = await prisma.order.findUnique({
          where: { ecoManagerId: ecoOrder.id.toString() }
        });

        // 🟢 NEW LOGIC: Check by storeIdentifier + ecoManagerId (FIXED BEHAVIOR)
        const existingOrderNewLogic = await prisma.order.findFirst({
          where: { 
            storeIdentifier: apiConfig.storeIdentifier,
            ecoManagerId: ecoOrder.id.toString()
          }
        });

        // Compare the results
        const wouldBeSkippedByOldLogic = !!existingOrderOldLogic;
        const wouldBeSkippedByNewLogic = !!existingOrderNewLogic;

        if (wouldBeSkippedByOldLogic && !wouldBeSkippedByNewLogic) {
          // This order would be INCORRECTLY skipped by old logic but CORRECTLY processed by new logic
          ordersSkippedByOldLogic++;
          ordersFoundByNewLogic++;
          
          if (sampleSkippedOrders.length < 10) {
            sampleSkippedOrders.push({
              id: ecoOrder.id,
              reference: ecoOrder.reference,
              customer: ecoOrder.full_name,
              total: ecoOrder.total,
              status: ecoOrder.order_state_name,
              conflictingOrderId: existingOrderOldLogic?.ecoManagerId,
              conflictingOrderRef: existingOrderOldLogic?.reference,
              conflictingOrderStore: existingOrderOldLogic?.storeIdentifier
            });
          }

          if (sampleFoundOrders.length < 10) {
            sampleFoundOrders.push({
              id: ecoOrder.id,
              reference: ecoOrder.reference,
              customer: ecoOrder.full_name,
              total: ecoOrder.total,
              status: ecoOrder.order_state_name,
              wouldBeProcessed: true
            });
          }

          console.log(`🚨 FOUND ISSUE: Order ${ecoOrder.reference} (ID: ${ecoOrder.id})`);
          console.log(`   ❌ OLD LOGIC: Would skip because ecoManagerId ${ecoOrder.id} exists`);
          console.log(`   ❌ Conflicting order: ${existingOrderOldLogic?.reference} from ${existingOrderOldLogic?.storeIdentifier}`);
          console.log(`   ✅ NEW LOGIC: Would process because ${apiConfig.storeIdentifier}+${ecoOrder.id} doesn't exist`);
        }

      } catch (orderError) {
        console.error(`Error checking order ${ecoOrder.id}:`, orderError);
      }
    }

    result.ordersSkippedByOldLogic = ordersSkippedByOldLogic;
    result.ordersFoundByNewLogic = ordersFoundByNewLogic;
    result.sampleSkippedOrders = sampleSkippedOrders;
    result.sampleFoundOrders = sampleFoundOrders;
    result.totalOrdersToSync = allOrders.length;

    console.log(`\n📊 DUPLICATE CHECK COMPARISON:`);
    console.log(`   🔴 Orders INCORRECTLY skipped by old logic: ${ordersSkippedByOldLogic}`);
    console.log(`   🟢 Orders CORRECTLY found by new logic: ${ordersFoundByNewLogic}`);
    console.log(`   📊 Total orders to process: ${allOrders.length}`);

    if (ordersSkippedByOldLogic > 0) {
      console.log(`\n🚨 CRITICAL ISSUE DETECTED:`);
      console.log(`   The current sync logic would INCORRECTLY skip ${ordersSkippedByOldLogic} orders!`);
      console.log(`   These orders exist in EcoManager but won't be synced due to ID conflicts.`);
      
      console.log(`\n🔍 SAMPLE CONFLICTING ORDERS:`);
      sampleSkippedOrders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.reference} (ID: ${order.id})`);
        console.log(`      Customer: ${order.customer}`);
        console.log(`      Total: ${order.total} DZD`);
        console.log(`      Status: ${order.status}`);
        console.log(`      ❌ Conflicts with: ${order.conflictingOrderRef} from ${order.conflictingOrderStore}`);
        console.log('');
      });
    }

    result.success = true;
    return result;

  } catch (error) {
    console.error(`❌ Error testing ${apiConfig.storeIdentifier}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Get last synced order ID for a specific store (same as debug script)
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
 * Perform backward scanning from the last synced order ID
 * This scans 30 pages backward to catch orders that changed status
 */
async function performBackwardScanning(
  ecoService: EcoManagerService, 
  lastOrderId: number, 
  maxPages: number,
  storeIdentifier: string
): Promise<{ orders: EcoManagerOrder[], pagesScanned: number }> {
  
  console.log(`   🔍 Starting backward scan from order ID ${lastOrderId}...`);
  console.log(`   🔍 Will scan up to ${maxPages} pages backward`);
  
  const foundOrders: EcoManagerOrder[] = [];
  let pagesScanned = 0;
  
  try {
    // Start from page 1 and scan until we find orders around lastOrderId area
    let cursor: string | null = null;
    let foundLastOrderArea = false;
    let scannedPastLastOrder = 0;
    
    while (pagesScanned < maxPages && scannedPastLastOrder < 30) {
      pagesScanned++;
      console.log(`     📄 Scanning backward page ${pagesScanned}...`);
      
      // Use the same fetchOrdersPageCursor method as the normal sync
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
      
      // Check if we've reached the area around our last synced order
      if (orders.some((order: any) => order.id <= lastOrderId)) {
        if (!foundLastOrderArea) {
          foundLastOrderArea = true;
          console.log(`     🎯 Reached last order area (found orders <= ${lastOrderId})`);
        }
        scannedPastLastOrder++;
      }
      
      // Look for orders that are "En dispatch" but have ID <= lastOrderId
      // These are the orders that changed status after being synced
      const missedOrders = orders.filter((order: any) =>
        order.id <= lastOrderId && order.order_state_name === 'En dispatch'
      );
      
      if (missedOrders.length > 0) {
        console.log(`     🎯 Found ${missedOrders.length} potentially missed orders on this page`);
        
        // Check if these orders exist in our database with different status
        for (const order of missedOrders) {
          // 🟢 Use storeIdentifier + ecoManagerId check instead of just ecoManagerId
          const dbOrder = await prisma.order.findFirst({
            where: { 
              storeIdentifier: storeIdentifier,
              ecoManagerId: order.id.toString()
            },
            select: { status: true, reference: true, ecoManagerId: true }
          });
          
          if (dbOrder && dbOrder.status !== 'PENDING') {
            console.log(`     🔄 Status change detected: Order ${order.reference} (DB: ${dbOrder.status} → API: ${order.order_state_name})`);
            foundOrders.push(order);
          } else if (!dbOrder) {
            console.log(`     🆕 Missing order found: Order ${order.reference} (${order.order_state_name})`);
            foundOrders.push(order);
          }
        }
      }
      
      cursor = result.data.meta?.next_cursor;
      if (!cursor) {
        console.log(`     ⏹️  No more pages available`);
        break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    console.log(`   ✅ Backward scan complete: ${pagesScanned} pages scanned, ${foundOrders.length} missed orders found`);
    
  } catch (error) {
    console.error(`   ❌ Backward scan failed:`, error);
  }
  
  return {
    orders: foundOrders,
    pagesScanned
  };
}

/**
 * Generate comprehensive analysis of the complete sync results
 */
function generateCompleteAnalysis(results: TestResult[]) {
  console.log('\n🎯 COMPLETE SYNC ANALYSIS:');
  console.log('-' .repeat(50));

  let totalNormalOrders = 0;
  let totalBackwardOrders = 0;
  let totalOrdersToSync = 0;
  let totalOrdersSkippedByOldLogic = 0;
  let totalOrdersFoundByNewLogic = 0;

  results.forEach(result => {
    if (!result.success) {
      console.log(`❌ ${result.storeIdentifier}: FAILED - ${result.error}`);
      return;
    }

    console.log(`\n🏪 ${result.storeIdentifier} (${result.storeName}):`);
    console.log(`   📊 Last synced ID: ${result.lastSyncedOrderId}`);
    console.log(`   📊 Normal sync orders: ${result.normalSyncOrders}`);
    console.log(`   📊 Backward scan orders: ${result.backwardScanOrders}`);
    console.log(`   📊 Total orders to sync: ${result.totalOrdersToSync}`);
    console.log(`   🔴 Orders skipped by OLD logic: ${result.ordersSkippedByOldLogic}`);
    console.log(`   🟢 Orders found by NEW logic: ${result.ordersFoundByNewLogic}`);

    if (result.ordersSkippedByOldLogic > 0) {
      console.log(`   🚨 CRITICAL: ${result.ordersSkippedByOldLogic} orders would be MISSED by current logic!`);
    }

    totalNormalOrders += result.normalSyncOrders;
    totalBackwardOrders += result.backwardScanOrders;
    totalOrdersToSync += result.totalOrdersToSync;
    totalOrdersSkippedByOldLogic += result.ordersSkippedByOldLogic;
    totalOrdersFoundByNewLogic += result.ordersFoundByNewLogic;
  });

  console.log('\n📊 OVERALL RESULTS:');
  console.log(`   - Total normal sync orders: ${totalNormalOrders}`);
  console.log(`   - Total backward scan orders: ${totalBackwardOrders}`);
  console.log(`   - Total orders to sync: ${totalOrdersToSync}`);
  console.log(`   🔴 Total orders MISSED by old logic: ${totalOrdersSkippedByOldLogic}`);
  console.log(`   🟢 Total orders FOUND by new logic: ${totalOrdersFoundByNewLogic}`);

  console.log('\n🐛 ISSUE SUMMARY:');
  console.log('❌ CURRENT PROBLEM:');
  console.log('   - Sync checks: WHERE ecoManagerId = "20525"');
  console.log('   - This finds NATU20525 when looking for ALPH20525');
  console.log('   - Result: ALPH20525 gets skipped incorrectly');

  console.log('\n✅ PROPOSED SOLUTION:');
  console.log('   - Change sync to check: WHERE storeIdentifier = "ALPH" AND ecoManagerId = "20525"');
  console.log('   - This ensures each store\'s orders are independent');
  console.log('   - Result: All orders get processed correctly');

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
testAdminSyncWithStoreIdCheck().catch(console.error);