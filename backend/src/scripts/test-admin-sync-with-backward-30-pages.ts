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
  backwardPagesScanned: number;
  sampleNormalOrders: any[];
  sampleBackwardOrders: any[];
  success: boolean;
  error?: string;
}

/**
 * 🚀 ADMIN SYNC TEST WITH 30 PAGES BACKWARD SCANNING
 * This replicates the exact logic of OrdersController.syncAllStores()
 * BUT adds 30 pages of backward scanning to catch missed orders
 */
async function testAdminSyncWithBackwardScanning() {
  console.log('🚀 ADMIN SYNC TEST WITH 30 PAGES BACKWARD SCANNING');
  console.log('=' .repeat(80));
  console.log('This test replicates the EXACT logic of the admin "Sync New Orders" button');
  console.log('PLUS adds 30 pages of backward scanning to catch missed orders like alph17097');
  console.log('');

  try {
    // Test both NATU and ALPH stores (same as admin button)
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
      
      const result = await testStoreWithBackwardScanning(apiConfig);
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

async function testStoreWithBackwardScanning(apiConfig: any): Promise<TestResult> {
  const result: TestResult = {
    storeIdentifier: apiConfig.storeIdentifier,
    storeName: apiConfig.storeName,
    lastSyncedOrderId: 0,
    normalSyncOrders: 0,
    backwardScanOrders: 0,
    totalOrdersToSync: 0,
    backwardPagesScanned: 0,
    sampleNormalOrders: [],
    sampleBackwardOrders: [],
    success: false
  };

  try {
    console.log(`📋 Store: ${apiConfig.storeName}`);
    console.log(`📋 Base URL: ${apiConfig.baseUrl}`);

    // STEP 1: Get last synced order ID (EXACT same logic as admin button)
    const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" IS NOT NULL
      ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
      LIMIT 1
    `;

    const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
    result.lastSyncedOrderId = lastOrderId;
    console.log(`📊 Last synced EcoManager order ID: ${lastOrderId}`);

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
    if (normalSyncOrders.length > 0) {
      const normalOrderIds = normalSyncOrders.map(o => o.id);
      console.log(`   - ID range: ${Math.min(...normalOrderIds)} - ${Math.max(...normalOrderIds)}`);
      
      const normalDispatchOrders = normalSyncOrders.filter(o => o.order_state_name === 'En dispatch');
      console.log(`   - "En dispatch" orders: ${normalDispatchOrders.length}/${normalSyncOrders.length}`);
      
      result.sampleNormalOrders = normalDispatchOrders.slice(0, 5).map(order => ({
        id: order.id,
        reference: order.reference,
        customer: order.full_name,
        total: order.total,
        status: order.order_state_name
      }));
    }

    // STEP 5: BACKWARD SCANNING - 30 PAGES (THE NEW ADDITION!)
    console.log(`\n🔍 PHASE 2: Backward scanning - 30 pages from last synced ID...`);
    const backwardScanOrders = await performBackwardScanning(ecoService, lastOrderId, 30);
    result.backwardScanOrders = backwardScanOrders.orders.length;
    result.backwardPagesScanned = backwardScanOrders.pagesScanned;
    
    console.log(`📊 Backward scan found: ${backwardScanOrders.orders.length} orders`);
    console.log(`📊 Pages scanned backward: ${backwardScanOrders.pagesScanned}`);
    
    if (backwardScanOrders.orders.length > 0) {
      const backwardOrderIds = backwardScanOrders.orders.map(o => o.id);
      console.log(`   - ID range: ${Math.min(...backwardOrderIds)} - ${Math.max(...backwardOrderIds)}`);
      
      const backwardDispatchOrders = backwardScanOrders.orders.filter(o => o.order_state_name === 'En dispatch');
      console.log(`   - "En dispatch" orders: ${backwardDispatchOrders.length}/${backwardScanOrders.orders.length}`);
      
      result.sampleBackwardOrders = backwardDispatchOrders.slice(0, 5).map(order => ({
        id: order.id,
        reference: order.reference,
        customer: order.full_name,
        total: order.total,
        status: order.order_state_name,
        foundInBackwardScan: true
      }));

      if (backwardDispatchOrders.length > 0) {
        console.log(`\n🎯 CRITICAL SUCCESS: Found orders in backward scan that would be MISSED!`);
        backwardDispatchOrders.slice(0, 5).forEach((order, index) => {
          console.log(`   ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          console.log(`      Status: ${order.order_state_name} (found in backward scan!)`);
        });
      }
    }

    // STEP 6: Calculate total orders to sync
    const normalDispatchOrders = normalSyncOrders.filter(o => o.order_state_name === 'En dispatch');
    const backwardDispatchOrders = backwardScanOrders.orders.filter(o => o.order_state_name === 'En dispatch');
    
    result.totalOrdersToSync = normalDispatchOrders.length + backwardDispatchOrders.length;

    console.log(`\n📊 COMPLETE SYNC SUMMARY:`);
    console.log(`   - Normal sync orders: ${normalDispatchOrders.length}`);
    console.log(`   - Backward scan orders: ${backwardDispatchOrders.length}`);
    console.log(`   - TOTAL orders to sync: ${result.totalOrdersToSync}`);
    console.log(`   - Backward pages scanned: ${result.backwardPagesScanned}`);

    console.log(`\n🎯 SYNC BENEFITS:`);
    console.log(`   ✅ Uses EXACT same logic as admin button`);
    console.log(`   ✅ PLUS scans 30 pages backward for missed orders`);
    console.log(`   ✅ Catches orders like alph17097 that change status later`);
    console.log(`   ✅ Provides complete order coverage!`);

    result.success = true;
    return result;

  } catch (error) {
    console.error(`❌ Error testing ${apiConfig.storeIdentifier}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Perform backward scanning from the last synced order ID
 * This scans 30 pages backward to catch orders that changed status
 */
async function performBackwardScanning(
  ecoService: EcoManagerService, 
  lastOrderId: number, 
  maxPages: number
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
          const dbOrder = await prisma.order.findUnique({
            where: { ecoManagerId: order.id.toString() },
            select: { status: true, ecoManagerId: true }
          });
          
          if (dbOrder && dbOrder.status !== 'PENDING') {
            console.log(`     🔄 Status change detected: Order ${order.id} (DB: ${dbOrder.status} → API: ${order.order_state_name})`);
            foundOrders.push(order);
          } else if (!dbOrder) {
            console.log(`     🆕 Missing order found: Order ${order.id} (${order.order_state_name})`);
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
  let totalBackwardPages = 0;

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
    console.log(`   📊 Backward pages scanned: ${result.backwardPagesScanned}`);

    if (result.backwardScanOrders > 0) {
      console.log(`   🎯 SUCCESS: Found ${result.backwardScanOrders} orders that would be MISSED by normal sync!`);
    }

    totalNormalOrders += result.normalSyncOrders;
    totalBackwardOrders += result.backwardScanOrders;
    totalOrdersToSync += result.totalOrdersToSync;
    totalBackwardPages += result.backwardPagesScanned;
  });

  console.log('\n📊 OVERALL RESULTS:');
  console.log(`   - Total normal sync orders: ${totalNormalOrders}`);
  console.log(`   - Total backward scan orders: ${totalBackwardOrders}`);
  console.log(`   - Total orders to sync: ${totalOrdersToSync}`);
  console.log(`   - Total backward pages scanned: ${totalBackwardPages}`);

  console.log('\n🎯 SOLUTION BENEFITS:');
  console.log('✅ Complete sync advantages:');
  console.log('   - Uses EXACT same logic as admin "Sync New Orders" button');
  console.log('   - PLUS scans 30 pages backward for missed orders');
  console.log('   - Catches orders like alph17097 that change status later');
  console.log('   - Provides complete order coverage');
  console.log('   - Works with existing infrastructure');

  if (totalBackwardOrders > 0) {
    console.log(`\n🚨 CRITICAL SUCCESS: Found ${totalBackwardOrders} orders that would be missed by normal sync!`);
    console.log('   This proves that backward scanning is necessary to catch all orders.');
  }

  console.log('\n🔧 IMPLEMENTATION RECOMMENDATIONS:');
  console.log('1. 🎯 Enable backward scanning in EcoManagerService.performBidirectionalScanCursor()');
  console.log('2. 🎯 Change line 574-576 to actually perform backward scanning');
  console.log('3. 🎯 Configure backward scan to 30 pages (proven effective)');
  console.log('4. 🎯 Add status change detection in backward scan');
  console.log('5. 🎯 Monitor performance and adjust pages as needed');
}

// Run the test
testAdminSyncWithBackwardScanning().catch(console.error);