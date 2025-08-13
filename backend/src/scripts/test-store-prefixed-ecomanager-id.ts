import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * 🔍 TEST STORE-PREFIXED ECOMANAGER ID SOLUTION
 * 
 * Instead of changing the Prisma schema, we test storing ecoManagerId as:
 * - ALPH20525 (storeIdentifier + original ecoManagerId)
 * - NATU20525 (storeIdentifier + original ecoManagerId)
 * - DILST20525 (storeIdentifier + original ecoManagerId)
 * 
 * This way each store's orders have unique ecoManagerIds without schema changes!
 */
async function testStorePrefixedEcoManagerId() {
  console.log('🔍 TEST STORE-PREFIXED ECOMANAGER ID SOLUTION');
  console.log('=' .repeat(80));
  console.log('Testing storing ecoManagerId as storeIdentifier + original ID');
  console.log('Example: ALPH20525, NATU20525, DILST20525');
  console.log('');

  try {
    // STEP 1: Test creating orders with prefixed ecoManagerIds
    console.log('🔍 STEP 1: Testing creation with prefixed ecoManagerIds...');
    await testPrefixedIdCreation();

    // STEP 2: Test the duplicate check logic with prefixed IDs
    console.log('\n🔍 STEP 2: Testing duplicate check with prefixed IDs...');
    await testPrefixedDuplicateCheck();

    // STEP 3: Test how to modify the sync logic
    console.log('\n🔍 STEP 3: Testing modified sync logic...');
    await testModifiedSyncLogic();

    // STEP 4: Test backward compatibility
    console.log('\n🔍 STEP 4: Testing backward compatibility...');
    await testBackwardCompatibility();

    // STEP 5: Show implementation strategy
    console.log('\n🔍 STEP 5: Implementation strategy...');
    showImplementationStrategy();

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

/**
 * Test creating orders with prefixed ecoManagerIds
 */
async function testPrefixedIdCreation() {
  try {
    console.log('🧪 Testing creation of orders with prefixed ecoManagerIds...');
    
    // Clean up any existing test orders
    await prisma.order.deleteMany({
      where: { 
        ecoManagerId: { 
          in: ['ALPH99998', 'NATU99998', 'DILST99998'] 
        }
      }
    });

    // Create a test customer
    let testCustomer = await prisma.customer.findFirst({
      where: { telephone: 'TEST_PREFIXED_ID' }
    });

    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          fullName: 'Test Customer for Prefixed ID',
          telephone: 'TEST_PREFIXED_ID',
          wilaya: 'Test Wilaya',
          commune: 'Test Commune',
          totalOrders: 0
        }
      });
    }

    // Create orders with prefixed ecoManagerIds
    const testOrders = [
      { store: 'ALPH', originalId: '99998', prefixedId: 'ALPH99998', reference: 'ALPH99998' },
      { store: 'NATU', originalId: '99998', prefixedId: 'NATU99998', reference: 'NATU99998' },
      { store: 'DILST', originalId: '99998', prefixedId: 'DILST99998', reference: 'DILST99998' }
    ];

    for (const testOrder of testOrders) {
      console.log(`   📝 Creating ${testOrder.store} order with ecoManagerId: ${testOrder.prefixedId}...`);
      
      const order = await prisma.order.create({
        data: {
          reference: testOrder.reference,
          ecoManagerId: testOrder.prefixedId, // Store prefixed ID
          storeIdentifier: testOrder.store,
          source: 'ECOMANAGER',
          status: 'PENDING',
          total: 1000 + Math.random() * 1000,
          orderDate: new Date(),
          customerId: testCustomer.id,
          items: {
            create: [{
              productId: `TEST_PRODUCT_${testOrder.store}`,
              sku: `TEST_SKU_${testOrder.store}`,
              title: `Test Product ${testOrder.store}`,
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000
            }]
          }
        }
      });

      console.log(`   ✅ ${testOrder.store} order created successfully (ID: ${order.id})`);
    }

    console.log('   ✅ ALL ORDERS CREATED SUCCESSFULLY!');
    console.log('   ✅ No unique constraint violations with prefixed ecoManagerIds');

  } catch (error: any) {
    console.error('❌ Error testing prefixed ID creation:', error.message);
  }
}

/**
 * Test duplicate check logic with prefixed IDs
 */
async function testPrefixedDuplicateCheck() {
  try {
    console.log('🧪 Testing duplicate check with prefixed IDs...');

    // Test the current sync logic (should work now)
    const testId = 'ALPH99998';
    
    console.log(`   🔍 Testing findUnique with prefixed ID: ${testId}`);
    const uniqueResult = await prisma.order.findUnique({
      where: { ecoManagerId: testId },
      select: { reference: true, storeIdentifier: true, ecoManagerId: true }
    });

    if (uniqueResult) {
      console.log(`   ✅ findUnique found: ${uniqueResult.reference} (${uniqueResult.storeIdentifier})`);
      console.log(`   ✅ ecoManagerId: ${uniqueResult.ecoManagerId}`);
    } else {
      console.log(`   ❌ findUnique found nothing for ${testId}`);
    }

    // Test finding all orders with same original ID but different stores
    console.log('\n   🔍 Testing orders with same original ID (99998) across stores...');
    const allSimilarOrders = await prisma.order.findMany({
      where: {
        ecoManagerId: {
          endsWith: '99998'
        }
      },
      select: { reference: true, storeIdentifier: true, ecoManagerId: true }
    });

    console.log(`   📊 Found ${allSimilarOrders.length} orders ending with '99998':`);
    allSimilarOrders.forEach(order => {
      console.log(`      - ${order.reference} (${order.storeIdentifier}): ecoManagerId = ${order.ecoManagerId}`);
    });

  } catch (error: any) {
    console.error('❌ Error testing prefixed duplicate check:', error.message);
  }
}

/**
 * Test modified sync logic
 */
async function testModifiedSyncLogic() {
  try {
    console.log('🧪 Testing modified sync logic...');

    // Simulate the sync process
    const stores = ['ALPH', 'NATU', 'DILST'];
    const originalOrderId = '99998';

    for (const store of stores) {
      console.log(`\n   🔍 Testing sync for store: ${store}`);
      
      // Original ID from EcoManager API
      console.log(`   📥 EcoManager API returns order ID: ${originalOrderId}`);
      
      // Create prefixed ID for storage
      const prefixedId = `${store}${originalOrderId}`;
      console.log(`   🔄 Convert to prefixed ID: ${prefixedId}`);
      
      // Check if order already exists (this should work now)
      const existingOrder = await prisma.order.findUnique({
        where: { ecoManagerId: prefixedId }
      });

      if (existingOrder) {
        console.log(`   ✅ Order ${prefixedId} already exists - would skip`);
      } else {
        console.log(`   ❌ Order ${prefixedId} not found - would create new order`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error testing modified sync logic:', error.message);
  }
}

/**
 * Test backward compatibility
 */
async function testBackwardCompatibility() {
  try {
    console.log('🧪 Testing backward compatibility...');

    // Check existing orders that don't have prefixed IDs
    const existingOrders = await prisma.order.findMany({
      where: {
        ecoManagerId: { not: null },
        NOT: {
          OR: [
            { ecoManagerId: { startsWith: 'ALPH' } },
            { ecoManagerId: { startsWith: 'NATU' } },
            { ecoManagerId: { startsWith: 'DILST' } },
            { ecoManagerId: { startsWith: 'MGSTR' } },
            { ecoManagerId: { startsWith: 'PURNA' } },
            { ecoManagerId: { startsWith: 'JWLR' } }
          ]
        }
      },
      select: { ecoManagerId: true, storeIdentifier: true, reference: true },
      take: 5
    });

    console.log(`   📊 Found ${existingOrders.length} existing orders with non-prefixed ecoManagerIds:`);
    existingOrders.forEach(order => {
      console.log(`      - ${order.reference} (${order.storeIdentifier}): ecoManagerId = ${order.ecoManagerId}`);
    });

    if (existingOrders.length > 0) {
      console.log('   ⚠️  These orders would need migration or special handling');
    } else {
      console.log('   ✅ No backward compatibility issues found');
    }

  } catch (error: any) {
    console.error('❌ Error testing backward compatibility:', error.message);
  }
}

/**
 * Show implementation strategy
 */
function showImplementationStrategy() {
  console.log('📋 IMPLEMENTATION STRATEGY:');
  console.log('');
  
  console.log('🔧 STEP 1: Modify the sync logic in OrdersController.syncAllStores()');
  console.log('   📍 Line 1355-1357: Change duplicate check');
  console.log('   🔴 CURRENT:');
  console.log('      const existingOrder = await prisma.order.findUnique({');
  console.log('        where: { ecoManagerId: ecoOrder.id.toString() }');
  console.log('      });');
  console.log('');
  console.log('   🟢 NEW:');
  console.log('      const prefixedEcoManagerId = `${apiConfig.storeIdentifier}${ecoOrder.id}`;');
  console.log('      const existingOrder = await prisma.order.findUnique({');
  console.log('        where: { ecoManagerId: prefixedEcoManagerId }');
  console.log('      });');
  console.log('');
  
  console.log('🔧 STEP 2: Modify the order creation logic');
  console.log('   📍 Around line 1390: When creating new order');
  console.log('   🟢 ADD:');
  console.log('      finalOrderData.ecoManagerId = `${apiConfig.storeIdentifier}${ecoOrder.id}`;');
  console.log('');
  
  console.log('🔧 STEP 3: Update getLastSyncedOrderId function');
  console.log('   📍 Need to extract original ID from prefixed ID');
  console.log('   🟢 MODIFY:');
  console.log('      // Extract numeric part from prefixed ecoManagerId');
  console.log('      const numericPart = result[0].ecoManagerId.replace(storeIdentifier, "");');
  console.log('      return parseInt(numericPart);');
  console.log('');
  
  console.log('✅ BENEFITS:');
  console.log('   - No database schema changes required');
  console.log('   - No migrations needed');
  console.log('   - Maintains unique constraint');
  console.log('   - Each store has independent ecoManagerIds');
  console.log('   - ALPH20525, NATU20525, DILST20525 can all coexist');
  console.log('');
  
  console.log('⚠️  CONSIDERATIONS:');
  console.log('   - Need to handle existing orders (migration strategy)');
  console.log('   - Update any code that searches by ecoManagerId');
  console.log('   - Update reports/analytics that use ecoManagerId');
  
  // Clean up test orders
  console.log('\n🧹 Cleaning up test orders...');
  prisma.order.deleteMany({
    where: { 
      ecoManagerId: { 
        in: ['ALPH99998', 'NATU99998', 'DILST99998'] 
      }
    }
  }).then(() => {
    console.log('✅ Test orders cleaned up');
  }).catch(() => {
    // Ignore cleanup errors
  });
}

// Run the test
testStorePrefixedEcoManagerId().catch(console.error);