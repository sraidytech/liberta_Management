import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * 🎯 TEST LAST 20 ORDER IDs FROM EACH STORE
 * Using EXACT same logic as OrdersController.syncAllStores (admin button)
 */
async function testLast20OrdersEachStore() {
  console.log('🎯 TESTING LAST 20 ORDER IDs FROM EACH STORE');
  console.log('Using EXACT same logic as OrdersController.syncAllStores (admin button)');
  console.log('=' .repeat(80));

  try {
    // Step 1: Get all active API configurations (SAME as syncAllStores)
    const activeConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (activeConfigs.length === 0) {
      console.log('❌ No active store configurations found');
      return;
    }

    console.log(`📊 Found ${activeConfigs.length} active stores:`);
    activeConfigs.forEach(config => {
      console.log(`   - ${config.storeName} (${config.storeIdentifier})`);
    });

    // Step 2: Process each store sequentially (SAME as syncAllStores)
    for (const apiConfig of activeConfigs) {
      console.log(`\n🏪 PROCESSING STORE: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
      console.log('=' .repeat(60));

      try {
        // Step 3: Initialize EcoManager service for this store (SAME as syncAllStores)
        if (!apiConfig.baseUrl) {
          throw new Error(`Base URL is missing for store ${apiConfig.storeName}`);
        }

        console.log(`📋 Store Configuration:`);
        console.log(`   - Name: ${apiConfig.storeName}`);
        console.log(`   - Identifier: ${apiConfig.storeIdentifier}`);
        console.log(`   - Base URL: ${apiConfig.baseUrl}`);
        console.log(`   - Token: ...${apiConfig.apiToken.slice(-4)}`);

        const ecoService = new EcoManagerService({
          storeName: apiConfig.storeName,
          storeIdentifier: apiConfig.storeIdentifier,
          apiToken: apiConfig.apiToken,
          baseUrl: apiConfig.baseUrl
        }, redis);

        // Step 4: Test connection first (SAME as syncAllStores)
        console.log(`\n🔌 Testing connection...`);
        const connectionTest = await ecoService.testConnection();
        if (!connectionTest) {
          console.log(`❌ Failed to connect to ${apiConfig.storeName} API`);
          continue;
        }
        console.log(`✅ Connection successful`);

        // Step 5: Get the highest EcoManager ID by converting to integer (SAME as syncAllStores)
        console.log(`\n📊 Getting last synced order from database...`);
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
        console.log(`📊 Last synced EcoManager order ID: ${lastOrderId}`);

        // Step 6: Fetch new orders (SAME as syncAllStores logic)
        console.log(`\n🔄 Fetching new orders using EcoManagerService.fetchNewOrders()...`);
        const ecoOrders = await ecoService.fetchNewOrders(lastOrderId);
        
        console.log(`📊 EcoManagerService returned ${ecoOrders.length} new orders`);

        if (ecoOrders.length === 0) {
          console.log(`✅ No new orders found for ${apiConfig.storeName}`);
        } else {
          // Get the last 20 orders (or all if less than 20)
          const last20Orders = ecoOrders.slice(0, Math.min(20, ecoOrders.length));
          
          console.log(`\n📋 LAST ${last20Orders.length} ORDER IDs FROM ${apiConfig.storeName}:`);
          console.log('   Order ID | Reference | Status | Customer | Total');
          console.log('   ' + '-'.repeat(70));
          
          last20Orders.forEach((order, index) => {
            const customerName = order.full_name.length > 15 ? order.full_name.substring(0, 15) + '...' : order.full_name;
            const status = order.order_state_name.length > 12 ? order.order_state_name.substring(0, 12) + '...' : order.order_state_name;
            console.log(`   ${String(order.id).padEnd(8)} | ${order.reference.padEnd(9)} | ${status.padEnd(15)} | ${customerName.padEnd(18)} | ${order.total} DZD`);
          });

          // Show order ID range
          const minId = Math.min(...last20Orders.map(o => o.id));
          const maxId = Math.max(...last20Orders.map(o => o.id));
          console.log(`\n📊 Order ID Range: ${minId} - ${maxId}`);

          // Show status distribution
          const statusCounts = last20Orders.reduce((acc: any, order) => {
            acc[order.order_state_name] = (acc[order.order_state_name] || 0) + 1;
            return acc;
          }, {});

          console.log(`📊 Status Distribution:`);
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count} orders`);
          });

          // Check if any would be synced (En dispatch status)
          const dispatchOrders = last20Orders.filter(order => order.order_state_name === 'En dispatch');
          console.log(`\n🎯 Orders that would be synced ("En dispatch"): ${dispatchOrders.length}/${last20Orders.length}`);
          
          if (dispatchOrders.length > 0) {
            console.log(`✅ These orders would be processed by sync:`);
            dispatchOrders.forEach(order => {
              console.log(`   - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
            });
          } else {
            console.log(`❌ NO ORDERS would be synced! All orders have non-dispatch status.`);
            console.log(`   This explains why sync button finds no new orders!`);
          }
        }

        // Step 7: Also test fetchAllOrders to see what's available
        console.log(`\n🔍 Testing fetchAllOrders (first 20) for comparison...`);
        try {
          const allOrders = await ecoService.fetchAllOrders(20);
          console.log(`📊 fetchAllOrders returned ${allOrders.length} orders`);
          
          if (allOrders.length > 0) {
            const allOrdersMinId = Math.min(...allOrders.map(o => o.id));
            const allOrdersMaxId = Math.max(...allOrders.map(o => o.id));
            console.log(`📊 fetchAllOrders ID Range: ${allOrdersMinId} - ${allOrdersMaxId}`);
            
            // Compare with fetchNewOrders results
            if (ecoOrders.length > 0) {
              const newOrdersMaxId = Math.max(...ecoOrders.map(o => o.id));
              console.log(`\n🔍 COMPARISON:`);
              console.log(`   - fetchNewOrders highest ID: ${newOrdersMaxId}`);
              console.log(`   - fetchAllOrders highest ID: ${allOrdersMaxId}`);
              
              if (allOrdersMaxId > newOrdersMaxId) {
                console.log(`   ⚠️  fetchAllOrders found higher IDs! Possible sync issue.`);
              } else {
                console.log(`   ✅ fetchNewOrders is getting the latest orders`);
              }
            }
          }
        } catch (error) {
          console.log(`❌ fetchAllOrders failed: ${error}`);
        }

      } catch (storeError) {
        console.error(`❌ Error processing store ${apiConfig.storeName}:`, storeError);
      }

      // Add delay between stores (SAME as syncAllStores)
      if (apiConfig !== activeConfigs[activeConfigs.length - 1]) {
        console.log(`\n⏳ Waiting 10 seconds before next store...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log(`\n🎉 COMPLETED TESTING ALL ${activeConfigs.length} STORES`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run the test
testLast20OrdersEachStore().catch(console.error);