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

/**
 * 🔍 DEBUG ALPH SYNC ISSUE
 * Focus on ALPH store to understand why orders are found but not synced
 */
async function debugAlphSyncIssue() {
  console.log('🔍 DEBUG ALPH SYNC ISSUE');
  console.log('=' .repeat(80));
  console.log('Investigating why orders are found but not synced for ALPH store');
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

    console.log(`📋 Store: ${apiConfig.storeName}`);
    console.log(`📋 Base URL: ${apiConfig.baseUrl}`);

    // Get last synced order ID
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
    console.log(`📊 Last synced order ID: ${lastOrderId}`);

    // Initialize EcoManager service
    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    // Test connection
    const connectionTest = await ecoService.testConnection();
    if (!connectionTest) {
      console.log('❌ Failed to connect to ALPH API');
      return;
    }

    console.log('✅ Connected to ALPH API');

    // STEP 1: Get the specific orders mentioned (alph20519 to alph20525)
    console.log('\n🔍 STEP 1: Checking specific orders (20519-20525)...');
    await checkSpecificOrders(ecoService, [20519, 20520, 20521, 20522, 20523, 20524, 20525]);

    // STEP 2: Run normal sync and analyze results
    console.log('\n🔍 STEP 2: Running normal sync...');
    const normalSyncOrders = await ecoService.fetchNewOrders(lastOrderId);
    console.log(`📊 Normal sync found: ${normalSyncOrders.length} orders`);
    
    if (normalSyncOrders.length > 0) {
      console.log('📋 Normal sync orders:');
      normalSyncOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.order_state_name})`);
      });

      // Check if these orders exist in database
      console.log('\n🔍 Checking if normal sync orders exist in database...');
      for (const order of normalSyncOrders) {
        const existingOrder = await prisma.order.findUnique({
          where: { ecoManagerId: order.id.toString() },
          select: { id: true, status: true, ecoManagerId: true, reference: true }
        });

        if (existingOrder) {
          console.log(`   ❌ Order ${order.id} EXISTS in DB: ${existingOrder.reference} (Status: ${existingOrder.status})`);
        } else {
          console.log(`   ✅ Order ${order.id} NOT in DB - should be synced`);
        }
      }
    }

    // STEP 3: Check first few pages manually
    console.log('\n🔍 STEP 3: Manual page check...');
    await checkFirstPages(ecoService, 3);

    // STEP 4: Check database for recent ALPH orders
    console.log('\n🔍 STEP 4: Recent ALPH orders in database...');
    const recentDbOrders = await prisma.order.findMany({
      where: { 
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER'
      },
      select: {
        id: true,
        ecoManagerId: true,
        reference: true,
        status: true,
        orderDate: true
      },
      orderBy: { 
        ecoManagerId: 'desc' 
      },
      take: 10
    });

    console.log(`📊 Last 10 ALPH orders in database:`);
    recentDbOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. DB Order ${order.ecoManagerId}: ${order.reference} (Status: ${order.status}) - ${order.orderDate}`);
    });

    // STEP 5: Test the sync process step by step
    console.log('\n🔍 STEP 5: Testing sync process for one specific order...');
    if (normalSyncOrders.length > 0) {
      const testOrder = normalSyncOrders[0];
      await testSyncProcess(testOrder, apiConfig.storeIdentifier);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

/**
 * Check specific orders by ID
 */
async function checkSpecificOrders(ecoService: EcoManagerService, orderIds: number[]) {
  console.log(`🔍 Checking specific orders: ${orderIds.join(', ')}`);
  
  try {
    // Get first page to see if these orders are there
    const result: any = await (ecoService as any).fetchOrdersPageCursor(null);
    
    if (result.success) {
      const orders = result.data.data;
      console.log(`📊 First page has ${orders.length} orders, ID range: ${Math.min(...orders.map((o: any) => o.id))} - ${Math.max(...orders.map((o: any) => o.id))}`);
      
      orderIds.forEach(orderId => {
        const foundOrder = orders.find((o: any) => o.id === orderId);
        if (foundOrder) {
          console.log(`   ✅ Order ${orderId}: ${foundOrder.full_name} - ${foundOrder.total} DZD (${foundOrder.order_state_name})`);
        } else {
          console.log(`   ❌ Order ${orderId}: NOT FOUND on first page`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Failed to check specific orders:', error);
  }
}

/**
 * Check first few pages manually
 */
async function checkFirstPages(ecoService: EcoManagerService, maxPages: number) {
  console.log(`🔍 Checking first ${maxPages} pages manually...`);
  
  let cursor: string | null = null;
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const result: any = await (ecoService as any).fetchOrdersPageCursor(cursor);
      
      if (result.success) {
        const orders = result.data.data;
        const minId = Math.min(...orders.map((o: any) => o.id));
        const maxId = Math.max(...orders.map((o: any) => o.id));
        const dispatchOrders = orders.filter((o: any) => o.order_state_name === 'En dispatch');
        
        console.log(`   📄 Page ${page}: ${orders.length} orders, IDs ${minId}-${maxId}, ${dispatchOrders.length} "En dispatch"`);
        
        // Show first few dispatch orders
        if (dispatchOrders.length > 0) {
          console.log(`      📋 First 3 "En dispatch" orders:`);
          dispatchOrders.slice(0, 3).forEach((order: any, index: number) => {
            console.log(`         ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          });
        }
        
        cursor = result.data.meta?.next_cursor;
        if (!cursor) {
          console.log(`   ⏹️  No more pages available`);
          break;
        }
      } else {
        console.log(`   ❌ Failed to fetch page ${page}: ${result.error}`);
        break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`   ❌ Error on page ${page}:`, error);
      break;
    }
  }
}

/**
 * Test the sync process for a specific order
 */
async function testSyncProcess(ecoOrder: any, storeIdentifier: string) {
  console.log(`🔍 Testing sync process for order ${ecoOrder.id}...`);
  
  try {
    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { ecoManagerId: ecoOrder.id.toString() }
    });

    if (existingOrder) {
      console.log(`   ❌ Order ${ecoOrder.id} already exists in database:`);
      console.log(`      - DB ID: ${existingOrder.id}`);
      console.log(`      - Reference: ${existingOrder.reference}`);
      console.log(`      - Status: ${existingOrder.status}`);
      console.log(`      - This is why it's not being synced!`);
      
      // Check if status needs updating
      if (existingOrder.status !== 'PENDING' && ecoOrder.order_state_name === 'En dispatch') {
        console.log(`   🔄 STATUS MISMATCH: DB has "${existingOrder.status}" but API has "En dispatch"`);
        console.log(`   💡 This order should be UPDATED, not skipped!`);
      }
    } else {
      console.log(`   ✅ Order ${ecoOrder.id} does NOT exist in database - should be created`);
      
      // Test customer creation
      const customer = await prisma.customer.findFirst({
        where: { telephone: ecoOrder.telephone }
      });
      
      if (customer) {
        console.log(`   📞 Customer exists: ${customer.fullName} (${customer.telephone})`);
      } else {
        console.log(`   👤 Customer does NOT exist - would be created: ${ecoOrder.full_name} (${ecoOrder.telephone})`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error testing sync process:`, error);
  }
}

// Run the debug
debugAlphSyncIssue().catch(console.error);