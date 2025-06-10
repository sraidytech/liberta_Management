import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testEcoManagerIntegration() {
  console.log('🧪 Testing EcoManager Integration...\n');

  try {
    // Get API configurations from database
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (apiConfigs.length === 0) {
      console.log('❌ No active API configurations found');
      console.log('💡 Run the seed script first: npm run db:seed');
      return;
    }

    console.log(`📋 Found ${apiConfigs.length} active store configurations:`);
    apiConfigs.forEach(config => {
      console.log(`   - ${config.storeName} (${config.storeIdentifier})`);
    });
    console.log('');

    // Test each store
    for (const config of apiConfigs) {
      console.log(`🏪 Testing store: ${config.storeName} (${config.storeIdentifier})`);
      console.log(`🔑 API Token: ${config.apiToken.substring(0, 20)}...`);

      // Initialize EcoManager service
      const ecoService = new EcoManagerService({
        storeName: config.storeName,
        storeIdentifier: config.storeIdentifier,
        apiToken: config.apiToken,
        baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, redis);

      // Test connection
      console.log('🔌 Testing API connection...');
      const connectionTest = await ecoService.testConnection();
      
      if (!connectionTest) {
        console.log(`❌ Connection failed for ${config.storeName}`);
        console.log('');
        continue;
      }

      console.log(`✅ Connection successful for ${config.storeName}`);

      // Fetch first page to see what's available
      console.log('📦 Fetching first page of orders...');
      const firstPageOrders = await ecoService.fetchOrdersPage(1, 10);
      
      console.log(`📊 Found ${firstPageOrders.length} orders on first page`);
      
      if (firstPageOrders.length > 0) {
        console.log('📋 Sample order statuses:');
        const statusCounts: { [key: string]: number } = {};
        firstPageOrders.forEach(order => {
          statusCounts[order.order_state_name] = (statusCounts[order.order_state_name] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   - ${status}: ${count} orders`);
        });

        // Check all possible "En dispatch" variations
        const dispatchVariations = [
          'En dispatch',
          'en dispatch',
          'En Dispatch',
          'EN DISPATCH',
          'En-dispatch',
          'Dispatch'
        ];

        const enDispatchOrders = firstPageOrders.filter(order =>
          dispatchVariations.some(variation =>
            order.order_state_name.toLowerCase().includes(variation.toLowerCase())
          )
        );

        console.log(`🚚 "En dispatch" orders found: ${enDispatchOrders.length}`);
        console.log(`📋 All unique statuses found: ${[...new Set(firstPageOrders.map(o => o.order_state_name))].join(', ')}`);
        
        if (enDispatchOrders.length > 0) {
          console.log('📦 Sample "En dispatch" orders:');
          enDispatchOrders.slice(0, 3).forEach(order => {
            console.log(`   - Order #${order.id}: ${order.full_name} - ${order.total} DZD`);
            console.log(`     📍 ${order.wilaya}, ${order.commune}`);
            console.log(`     📅 Created: ${order.created_at}`);
          });
        }

        // Test fetching more "En dispatch" orders
        console.log('\n🔍 Fetching all "En dispatch" orders (up to 5000)...');
        let allEnDispatchOrders: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && allEnDispatchOrders.length < 5000) {
          const orders = await ecoService.fetchOrdersPage(page, 100);
          
          if (orders.length === 0) {
            hasMore = false;
            break;
          }

          const enDispatchInPage = orders.filter(order =>
            dispatchVariations.some(variation =>
              order.order_state_name.toLowerCase().includes(variation.toLowerCase())
            )
          );
          
          allEnDispatchOrders.push(...enDispatchInPage);
          
          console.log(`   Page ${page}: ${enDispatchInPage.length} "En dispatch" orders found`);
          
          if (orders.length < 100) {
            hasMore = false;
          }
          
          page++;
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n📊 Total "En dispatch" orders found: ${allEnDispatchOrders.length}`);

        if (allEnDispatchOrders.length > 0) {
          // Show summary statistics
          const totalValue = allEnDispatchOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
          const avgValue = totalValue / allEnDispatchOrders.length;

          console.log(`💰 Total value: ${totalValue.toFixed(2)} DZD`);
          console.log(`📈 Average order value: ${avgValue.toFixed(2)} DZD`);

          // Group by wilaya
          const wilayaCounts: { [key: string]: number } = {};
          allEnDispatchOrders.forEach(order => {
            wilayaCounts[order.wilaya] = (wilayaCounts[order.wilaya] || 0) + 1;
          });

          console.log('\n📍 Orders by Wilaya:');
          Object.entries(wilayaCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([wilaya, count]) => {
              console.log(`   - ${wilaya}: ${count} orders`);
            });

          // Test data mapping
          console.log('\n🔄 Testing data mapping...');
          const sampleOrder = allEnDispatchOrders[0];
          const mappedOrder = ecoService.mapOrderToDatabase(sampleOrder);
          
          console.log('✅ Sample order mapped successfully:');
          console.log(`   - Reference: ${mappedOrder.reference}`);
          console.log(`   - Status: ${mappedOrder.status}`);
          console.log(`   - Total: ${mappedOrder.total} DZD`);
          console.log(`   - Items: ${mappedOrder.items.create.length}`);
        }
      }

      console.log(`\n✅ Test completed for ${config.storeName}\n`);
    }

    console.log('🎉 EcoManager integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the test
testEcoManagerIntegration().catch(console.error);