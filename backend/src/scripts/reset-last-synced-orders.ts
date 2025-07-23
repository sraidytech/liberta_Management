import { PrismaClient } from '@prisma/client';
import { EcoManagerService } from '../services/ecomanager.service';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function resetLastSyncedOrders() {
  console.log('🔄 Starting reset of last synced order IDs...\n');

  try {
    // Get all active API configurations
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: {
        isActive: true
      }
    });

    console.log(`Found ${apiConfigs.length} active API configurations to check\n`);

    for (const config of apiConfigs) {
      console.log(`🏪 Processing store: ${config.storeName} (${config.storeIdentifier})`);
      
      try {
        // Create EcoManager service instance
        const ecoService = new EcoManagerService({
          storeIdentifier: config.storeIdentifier,
          storeName: config.storeName,
          apiToken: config.apiToken,
          baseUrl: config.baseUrl
        }, redis);

        // Test connection first
        console.log(`🔌 Testing API connection...`);
        const testOrders = await ecoService.fetchOrdersPage(1, 1);
        if (!testOrders || testOrders.length === 0) {
          console.log(`❌ No orders found for ${config.storeName}, skipping...`);
          continue;
        }

        // Get the actual highest order ID from EcoManager API (page 1 has newest orders)
        console.log(`📡 Fetching latest orders from EcoManager API...`);
        const latestOrders = await ecoService.fetchOrdersPage(1, 20);
        
        if (!latestOrders || latestOrders.length === 0) {
          console.log(`❌ No orders found on page 1 for ${config.storeName}`);
          continue;
        }

        const highestOrderId = Math.max(...latestOrders.map(order => order.id));
        console.log(`📊 Highest order ID in EcoManager: ${highestOrderId}`);

        // Get current database state
        const currentLastOrder = await prisma.order.findFirst({
          where: { storeIdentifier: config.storeIdentifier },
          orderBy: { ecoManagerId: 'desc' }
        });

        const currentLastId = currentLastOrder?.ecoManagerId ? parseInt(currentLastOrder.ecoManagerId) : 0;
        console.log(`📊 Current database last order ID: ${currentLastId}`);

        if (currentLastId > highestOrderId) {
          console.log(`⚠️  Database has higher ID (${currentLastId}) than EcoManager (${highestOrderId})`);
          console.log(`🔧 This explains why sync is not finding new orders!`);
          
          // Find the actual highest order ID that exists in both database and EcoManager
          console.log(`🔍 Finding correct last synced order ID...`);
          
          // Get all order IDs from database for this store
          const dbOrders = await prisma.order.findMany({
            where: { 
              storeIdentifier: config.storeIdentifier,
              source: 'ECOMANAGER',
              ecoManagerId: { not: null }
            },
            select: { ecoManagerId: true },
            orderBy: { ecoManagerId: 'desc' }
          });

          // Find the highest ID that's actually <= the EcoManager highest ID
          let correctLastId = 0;
          for (const order of dbOrders) {
            const orderId = parseInt(order.ecoManagerId!);
            if (orderId <= highestOrderId) {
              correctLastId = orderId;
              break;
            }
          }

          console.log(`✅ Correct last synced order ID should be: ${correctLastId}`);
          
          // Option 1: Delete orders with IDs higher than what exists in EcoManager
          const ordersToDelete = await prisma.order.findMany({
            where: {
              storeIdentifier: config.storeIdentifier,
              source: 'ECOMANAGER',
              ecoManagerId: { gt: highestOrderId.toString() }
            }
          });

          if (ordersToDelete.length > 0) {
            console.log(`🗑️  Found ${ordersToDelete.length} orders with invalid IDs (higher than ${highestOrderId})`);
            console.log(`🗑️  Deleting these invalid orders...`);
            
            await prisma.order.deleteMany({
              where: {
                storeIdentifier: config.storeIdentifier,
                source: 'ECOMANAGER',
                ecoManagerId: { gt: highestOrderId.toString() }
              }
            });
            
            console.log(`✅ Deleted ${ordersToDelete.length} invalid orders`);
          }
        } else {
          console.log(`✅ Database last order ID (${currentLastId}) is correct`);
        }

        // Clear page info cache to force fresh scan (if pageInfo table exists)
        console.log(`🧹 Clearing page info cache...`);
        try {
          // Check if we have a pageInfo table or similar cache mechanism
          // This might be stored in Redis or another cache system
          await redis.del(`pageInfo:${config.storeName}`);
          console.log(`✅ Cleared Redis cache for ${config.storeName}`);
        } catch (cacheError) {
          console.log(`ℹ️  No cache to clear for ${config.storeName}`);
        }

        console.log(`✅ Reset completed for ${config.storeName}\n`);
        
        // Add delay between stores to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Error processing ${config.storeName}:`, error);
        console.log(''); // Empty line for readability
      }
    }

    console.log('🎉 Reset process completed for all stores!');
    
  } catch (error) {
    console.error('❌ Fatal error during reset process:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the script
resetLastSyncedOrders().catch(console.error);