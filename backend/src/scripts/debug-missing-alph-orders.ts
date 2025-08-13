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

/**
 * 🔍 DEBUG MISSING ALPH ORDERS 20524 & 20525
 * Focus on why these specific orders are not in the database
 */
async function debugMissingAlphOrders() {
  console.log('🔍 DEBUG MISSING ALPH ORDERS 20524 & 20525');
  console.log('=' .repeat(80));
  console.log('Investigating why orders 20524 & 20525 are missing from ALPH store');
  console.log('');

  try {
    // Get ALPH store configuration
    const apiConfig = await prisma.apiConfiguration.findFirst({
      where: { storeIdentifier: 'ALPH', isActive: true }
    });

    if (!apiConfig) {
      console.log('❌ ALPH store configuration not found!');
      return;
    }

    console.log(`📋 Store: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);

    // Initialize EcoManager service
    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    // STEP 1: Check if orders 20524 & 20525 exist in database with ANY store identifier
    console.log('\n🔍 STEP 1: Checking if orders 20524 & 20525 exist in database...');
    const missingOrderIds = ['20524', '20525'];
    
    for (const orderId of missingOrderIds) {
      const allStoreOrders = await prisma.order.findMany({
        where: { ecoManagerId: orderId },
        select: {
          id: true,
          ecoManagerId: true,
          reference: true,
          storeIdentifier: true,
          status: true,
          orderDate: true
        }
      });

      if (allStoreOrders.length > 0) {
        console.log(`   🔍 Order ${orderId} found in database:`);
        allStoreOrders.forEach(order => {
          console.log(`      - Store: ${order.storeIdentifier}, Reference: ${order.reference}, Status: ${order.status}`);
        });
      } else {
        console.log(`   ❌ Order ${orderId} NOT found in database at all`);
      }
    }

    // STEP 2: Check EcoManager API for these specific orders
    console.log('\n🔍 STEP 2: Checking EcoManager API for orders 20524 & 20525...');
    await checkSpecificOrdersInAPI(ecoService, [20524, 20525]);

    // STEP 3: Check the sync range - what orders should have been synced?
    console.log('\n🔍 STEP 3: Checking sync range...');
    const lastSyncedId = await getLastSyncedOrderId('ALPH');
    console.log(`📊 Last synced ALPH order ID: ${lastSyncedId}`);
    
    if (lastSyncedId >= 20525) {
      console.log(`🚨 CRITICAL: Last synced ID (${lastSyncedId}) is HIGHER than 20525!`);
      console.log(`   This means orders 20524 & 20525 should have been synced already!`);
      console.log(`   But they're missing from the database - this is the bug!`);
    }

    // STEP 4: Check for store identifier issues
    console.log('\n🔍 STEP 4: Checking for store identifier mix-ups...');
    const recentOrders = await prisma.order.findMany({
      where: {
        ecoManagerId: { in: ['20520', '20521', '20522', '20523', '20524', '20525', '20526', '20527'] }
      },
      select: {
        ecoManagerId: true,
        reference: true,
        storeIdentifier: true,
        status: true
      },
      orderBy: { ecoManagerId: 'asc' }
    });

    console.log(`📊 Orders 20520-20527 in database:`);
    recentOrders.forEach(order => {
      const expectedStore = order.reference.startsWith('ALPH') ? 'ALPH' : 
                           order.reference.startsWith('NATU') ? 'NATU' : 
                           order.reference.startsWith('MGSTR') ? 'MGSTR' : 'UNKNOWN';
      const storeMatch = order.storeIdentifier === expectedStore ? '✅' : '❌';
      console.log(`   ${storeMatch} Order ${order.ecoManagerId}: ${order.reference} (Store: ${order.storeIdentifier})`);
    });

    // STEP 5: Test the mapping function
    console.log('\n🔍 STEP 5: Testing order mapping...');
    await testOrderMapping(ecoService, apiConfig.storeIdentifier);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

/**
 * Get last synced order ID for a specific store
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
 * Check specific orders in EcoManager API
 */
async function checkSpecificOrdersInAPI(ecoService: EcoManagerService, orderIds: number[]) {
  console.log(`🔍 Searching for orders ${orderIds.join(', ')} in EcoManager API...`);
  
  try {
    let cursor: string | null = null;
    let found = 0;
    let page = 1;
    
    while (found < orderIds.length && page <= 5) {
      const result: any = await (ecoService as any).fetchOrdersPageCursor(cursor);
      
      if (result.success) {
        const orders = result.data.data;
        const minId = Math.min(...orders.map((o: any) => o.id));
        const maxId = Math.max(...orders.map((o: any) => o.id));
        
        console.log(`   📄 Page ${page}: ${orders.length} orders, IDs ${minId}-${maxId}`);
        
        orderIds.forEach(orderId => {
          const foundOrder = orders.find((o: any) => o.id === orderId);
          if (foundOrder) {
            console.log(`   ✅ Order ${orderId}: ${foundOrder.full_name} - ${foundOrder.total} DZD (${foundOrder.order_state_name})`);
            found++;
          }
        });
        
        cursor = result.data.meta?.next_cursor;
        if (!cursor) break;
        
        page++;
        await new Promise(resolve => setTimeout(resolve, 250));
      } else {
        console.log(`   ❌ Failed to fetch page ${page}: ${result.error}`);
        break;
      }
    }
    
    if (found === 0) {
      console.log(`   ❌ None of the orders ${orderIds.join(', ')} found in first ${page-1} pages`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check orders in API:', error);
  }
}

/**
 * Test the order mapping function
 */
async function testOrderMapping(ecoService: EcoManagerService, storeIdentifier: string) {
  console.log(`🔍 Testing order mapping for store ${storeIdentifier}...`);
  
  try {
    // Get a sample order from API
    const result: any = await (ecoService as any).fetchOrdersPageCursor(null);
    
    if (result.success && result.data.data.length > 0) {
      const sampleOrder = result.data.data[0];
      console.log(`📋 Sample order from API: ${sampleOrder.id} - ${sampleOrder.full_name}`);
      
      // Test the mapping
      const mappedOrder = ecoService.mapOrderToDatabase(sampleOrder);
      console.log(`📋 Mapped order:`);
      console.log(`   - Store Identifier: ${mappedOrder.storeIdentifier}`);
      console.log(`   - Reference: ${mappedOrder.reference}`);
      console.log(`   - Source: ${mappedOrder.source}`);
      console.log(`   - EcoManager ID: ${mappedOrder.ecoManagerId}`);
      
      // Check if reference matches store
      const expectedPrefix = storeIdentifier.toUpperCase();
      const actualPrefix = mappedOrder.reference.split(/\d/)[0];
      
      if (actualPrefix === expectedPrefix) {
        console.log(`   ✅ Reference prefix matches store: ${actualPrefix} === ${expectedPrefix}`);
      } else {
        console.log(`   ❌ Reference prefix MISMATCH: ${actualPrefix} !== ${expectedPrefix}`);
        console.log(`   🚨 This could be the source of the problem!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to test order mapping:', error);
  }
}

// Run the debug
debugMissingAlphOrders().catch(console.error);