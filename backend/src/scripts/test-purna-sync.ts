import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testPurnaSync() {
  console.log('🔍 Testing PURNA Sync with "En dispatch" Orders...\n');

  try {
    // PURNA API Token from your .env
    const PURNA_TOKEN = 'dqEjmOe1nNprl4xpqOKBP5ZiPJA0JvYHGGDgT86ksnUruXoaKNLECopMlLApKWgW2WI51TuoE1YdI9hQ';
    
    const ecoService = new EcoManagerService({
      storeName: 'PURNA - Purna Store',
      storeIdentifier: 'PURNA',
      apiToken: PURNA_TOKEN,
      baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
    }, redis);

    // Test connection
    console.log('1. Testing API Connection...');
    const connectionTest = await ecoService.testConnection();
    console.log(`   Connection: ${connectionTest ? '✅ Success' : '❌ Failed'}`);

    if (!connectionTest) {
      console.log('❌ Cannot proceed without API connection');
      return;
    }

    // Test fetching specific pages that should have "En dispatch" orders
    console.log('\n2. Testing Specific Pages for "En dispatch" Orders...');
    
    // Based on your Google Sheet, let's test pages around where PURNA orders exist
    const testPages = [515, 516, 517, 518, 519, 520];
    
    for (const page of testPages) {
      try {
        console.log(`\n📄 Testing PURNA page ${page}:`);
        const orders = await ecoService.fetchOrdersPage(page, 100);
        
        if (orders && orders.length > 0) {
          const firstId = orders[0].id;
          const lastId = orders[orders.length - 1].id;
          console.log(`   📊 Found ${orders.length} orders (ID range: ${firstId} - ${lastId})`);
          
          // Count orders by status
          const statusCounts: { [key: string]: number } = {};
          orders.forEach(order => {
            statusCounts[order.order_state_name] = (statusCounts[order.order_state_name] || 0) + 1;
          });
          
          console.log('   📋 Status breakdown:', statusCounts);
          
          // Look specifically for "En dispatch" orders
          const enDispatchOrders = orders.filter(order => order.order_state_name === 'En dispatch');
          
          if (enDispatchOrders.length > 0) {
            console.log(`   🎯 Found ${enDispatchOrders.length} "En dispatch" orders!`);
            
            // Show first few "En dispatch" orders
            enDispatchOrders.slice(0, 3).forEach((order, index) => {
              console.log(`      ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
            });
            
            // Check if these orders exist in database
            console.log('\n   🔍 Checking if these orders exist in database...');
            for (const order of enDispatchOrders.slice(0, 3)) {
              const existingOrder = await prisma.order.findUnique({
                where: { ecoManagerId: order.id.toString() }
              });
              
              console.log(`      Order ${order.id}: ${existingOrder ? '✅ EXISTS in DB' : '❌ NOT in DB'}`);
            }
          } else {
            console.log('   ⚠️  No "En dispatch" orders found on this page');
          }
        } else {
          console.log(`   📄 Page ${page}: Empty or no orders`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ Error fetching page ${page}:`, error);
      }
    }

    // Test the optimized sync method
    console.log('\n3. Testing Optimized Sync Method...');
    const lastOrderId = 0; // Start from beginning to catch all orders
    
    console.log('   🔄 Running fetchNewOrders...');
    const newOrders = await ecoService.fetchNewOrders(lastOrderId);
    
    console.log(`   📥 fetchNewOrders result: ${newOrders.length} orders`);
    
    if (newOrders.length > 0) {
      console.log('   🎯 Sample new orders found:');
      newOrders.slice(0, 5).forEach((order, index) => {
        console.log(`      ${index + 1}. Order ${order.id}: ${order.full_name} - Status: ${order.order_state_name}`);
      });
    }

    // Test the database query method
    console.log('\n4. Testing Database Query Method...');
    
    // Get some "En dispatch" orders to test the filtering
    const testOrders = await ecoService.fetchOrdersPage(519, 50); // Page that should have orders
    if (testOrders && testOrders.length > 0) {
      const enDispatchTestOrders = testOrders.filter(order => order.order_state_name === 'En dispatch');
      
      if (enDispatchTestOrders.length > 0) {
        console.log(`   📋 Testing with ${enDispatchTestOrders.length} "En dispatch" orders from page 519`);
        
        // Test the filterNewDispatchOrders method
        const filteredOrders = await (ecoService as any).filterNewDispatchOrders(testOrders, 0);
        console.log(`   🔍 Filtered result: ${filteredOrders.length} orders`);
        
        if (filteredOrders.length > 0) {
          console.log('   ✅ Filter method working correctly');
          filteredOrders.slice(0, 3).forEach((order: any, index: number) => {
            console.log(`      ${index + 1}. Order ${order.id}: ${order.full_name}`);
          });
        } else {
          console.log('   ⚠️  Filter method returned no orders - investigating...');
          
          // Check if orders already exist in database
          const orderIds = enDispatchTestOrders.map(o => o.id.toString());
          const existingOrders = await prisma.order.findMany({
            where: {
              ecoManagerId: { in: orderIds },
              storeIdentifier: 'PURNA'
            },
            select: { ecoManagerId: true }
          });
          
          console.log(`      📊 ${existingOrders.length} of ${enDispatchTestOrders.length} orders already exist in database`);
        }
      }
    }

    // Final recommendations
    console.log('\n5. 🎯 Analysis & Recommendations:');
    
    if (newOrders.length === 0) {
      console.log('   ⚠️  No new orders found by sync method');
      console.log('   💡 Possible causes:');
      console.log('      - Orders already exist in database');
      console.log('      - Page range optimization is too narrow');
      console.log('      - Cache is pointing to wrong page range');
      console.log('      - Filter logic is excluding valid orders');
    } else {
      console.log('   ✅ Sync method is working correctly');
      console.log(`   📈 Found ${newOrders.length} orders ready to sync`);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the test
testPurnaSync().catch(console.error);