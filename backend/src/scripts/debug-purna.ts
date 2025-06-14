import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function debugPurnaStore() {
  console.log('🔍 Debugging PURNA Store Issue...\n');

  try {
    // 1. Check API Configuration
    console.log('1. Checking API Configuration...');
    const purnaConfig = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier: 'PURNA' }
    });

    if (!purnaConfig) {
      console.log('❌ PURNA configuration not found!');
      return;
    }

    console.log('✅ PURNA Configuration found:');
    console.log(`   - Store Name: ${purnaConfig.storeName}`);
    console.log(`   - Is Active: ${purnaConfig.isActive}`);
    console.log(`   - Base URL: ${(purnaConfig as any).baseUrl || 'Default'}`);
    console.log(`   - Last Used: ${purnaConfig.lastUsed}`);
    console.log(`   - Request Count: ${purnaConfig.requestCount}\n`);

    // 2. Check Database Orders
    console.log('2. Checking Database Orders...');
    const orderCount = await prisma.order.count({
      where: { storeIdentifier: 'PURNA' }
    });
    console.log(`📊 Total PURNA orders in database: ${orderCount}`);

    if (orderCount > 0) {
      const latestOrder = await prisma.order.findFirst({
        where: { storeIdentifier: 'PURNA' },
        orderBy: { ecoManagerId: 'desc' },
        select: {
          id: true,
          ecoManagerId: true,
          reference: true,
          status: true,
          createdAt: true
        }
      });
      console.log('📋 Latest PURNA order:', latestOrder);
    }

    // 3. Check Redis Cache
    console.log('\n3. Checking Redis Cache...');
    const pageInfoKey = `ecomanager:pageinfo:PURNA`;
    const syncKey = `ecomanager:sync:PURNA`;
    
    const pageInfo = await redis.get(pageInfoKey);
    const syncInfo = await redis.get(syncKey);
    
    console.log('📦 Page Info Cache:', pageInfo ? JSON.parse(pageInfo) : 'Not found');
    console.log('🔄 Sync Info Cache:', syncInfo ? JSON.parse(syncInfo) : 'Not found');

    // 4. Test API Connection
    console.log('\n4. Testing API Connection...');
    const ecoService = new EcoManagerService({
      storeName: purnaConfig.storeName,
      storeIdentifier: purnaConfig.storeIdentifier,
      apiToken: purnaConfig.apiToken,
      baseUrl: (purnaConfig as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2'
    }, redis);

    const connectionTest = await ecoService.testConnection();
    console.log(`🔗 API Connection: ${connectionTest ? '✅ Success' : '❌ Failed'}`);

    if (connectionTest) {
      // 5. Test Fetching Orders
      console.log('\n5. Testing Order Fetching...');
      try {
        const testOrders = await ecoService.fetchOrdersPage(1, 10);
        console.log(`📥 Test fetch result: ${testOrders.length} orders`);
        
        if (testOrders.length > 0) {
          console.log('📋 Sample order statuses:');
          const statusCounts: { [key: string]: number } = {};
          testOrders.forEach(order => {
            statusCounts[order.order_state_name] = (statusCounts[order.order_state_name] || 0) + 1;
          });
          console.log(statusCounts);

          console.log('\n📋 First order details:');
          const firstOrder = testOrders[0];
          console.log(`   - ID: ${firstOrder.id}`);
          console.log(`   - Reference: ${firstOrder.reference}`);
          console.log(`   - Status: ${firstOrder.order_state_name}`);
          console.log(`   - Customer: ${firstOrder.full_name}`);
          console.log(`   - Total: ${firstOrder.total} DZD`);
        }
      } catch (fetchError) {
        console.log('❌ Error fetching orders:', fetchError);
      }
    }

    // 6. Check for Data Inconsistencies
    console.log('\n6. Checking for Data Inconsistencies...');
    
    // Check if there are orders with wrong store identifier
    const wrongStoreOrders = await prisma.order.count({
      where: {
        OR: [
          { storeIdentifier: 'PURNA - Purna Store' },
          { storeIdentifier: 'Purna Store' },
          { storeIdentifier: 'purna' }
        ]
      }
    });
    
    if (wrongStoreOrders > 0) {
      console.log(`⚠️  Found ${wrongStoreOrders} orders with incorrect store identifier`);
    }

    // 7. Recommendations
    console.log('\n7. 🎯 Recommendations:');
    
    if (orderCount === 0 && connectionTest) {
      console.log('   - PURNA API is working but no orders in database');
      console.log('   - Try running a full sync for PURNA store');
      console.log('   - Check if orders exist in EcoManager with "En dispatch" status');
    }
    
    if (!connectionTest) {
      console.log('   - Check API token validity');
      console.log('   - Verify base URL configuration');
      console.log('   - Check network connectivity');
    }

    if (wrongStoreOrders > 0) {
      console.log('   - Fix store identifier inconsistencies in database');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the debug script
debugPurnaStore().catch(console.error);