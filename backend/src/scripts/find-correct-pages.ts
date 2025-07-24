import { prisma } from '../config/database';
import redis from '../config/redis';
import { EcoManagerService } from '../services/ecomanager.service';

async function findCorrectPages() {
  console.log('🔍 MANUAL PAGE FINDER - Finding correct pages for all stores...');
  
  try {
    // Get all active stores
    const stores = await prisma.apiConfiguration.findMany({
      where: { isActive: true },
      select: { storeIdentifier: true, storeName: true, apiToken: true, baseUrl: true }
    });

    for (const store of stores) {
      console.log(`\n🏪 Finding correct page for ${store.storeIdentifier} (${store.storeName})`);
      
      if (!store.apiToken || !store.baseUrl) {
        console.log(`❌ Missing API token or base URL for ${store.storeIdentifier}`);
        continue;
      }

      // Get the actual last order for this store from database
      const lastOrder = await prisma.order.findFirst({
        where: { 
          OR: [
            { storeIdentifier: store.storeIdentifier },
            // Handle NATUR vs NATU case
            ...(store.storeIdentifier === 'NATU' ? [{ reference: { startsWith: 'NATUR' } }] : [])
          ]
        },
        orderBy: { orderDate: 'desc' },
        select: { 
          reference: true, 
          orderDate: true
        }
      });

      if (!lastOrder) {
        console.log(`❌ No orders found for store ${store.storeIdentifier}`);
        continue;
      }

      // Extract numeric ID from reference
      let targetOrderId = 0;
      if (store.storeIdentifier === 'NATU' && lastOrder.reference.startsWith('NATUR')) {
        targetOrderId = parseInt(lastOrder.reference.replace('NATUR', ''));
      } else {
        targetOrderId = parseInt(lastOrder.reference.replace(store.storeIdentifier, ''));
      }

      console.log(`📋 Target: Find page containing order ID ${targetOrderId} (${lastOrder.reference})`);
      console.log(`📅 Order date: ${lastOrder.orderDate}`);

      // Initialize EcoManager service
      const ecoService = new EcoManagerService({
        storeName: store.storeName,
        storeIdentifier: store.storeIdentifier,
        apiToken: store.apiToken,
        baseUrl: store.baseUrl
      }, redis);

      // Test connection first
      console.log(`🔌 Testing API connection...`);
      const connectionTest = await ecoService.testConnection();
      if (!connectionTest) {
        console.log(`❌ API connection failed for ${store.storeIdentifier}`);
        continue;
      }

      // Manual page scanning - start from page 1 and scan forward
      console.log(`🔍 Starting manual page scan from page 1...`);
      let foundPage = null;
      let currentPage = 1;
      let maxPagesToScan = 100; // Limit to prevent infinite loop
      
      while (currentPage <= maxPagesToScan && !foundPage) {
        try {
          console.log(`   Scanning page ${currentPage}...`);
          
          const orders = await ecoService.fetchOrdersPage(currentPage, 20);
          
          if (!orders || orders.length === 0) {
            console.log(`   Page ${currentPage}: No orders found`);
            break;
          }

          const firstId = orders[0].id;
          const lastId = orders[orders.length - 1].id;
          
          console.log(`   Page ${currentPage}: ${orders.length} orders, ID range: ${firstId} - ${lastId}`);

          // Check if our target order ID is in this range
          if (targetOrderId >= lastId && targetOrderId <= firstId) {
            foundPage = currentPage;
            console.log(`🎯 FOUND! Target order ID ${targetOrderId} is on page ${currentPage}`);
            
            // Look for the exact order
            const targetOrder = orders.find(order => order.id === targetOrderId);
            if (targetOrder) {
              console.log(`✅ Exact match found: Order ${targetOrder.id} (${targetOrder.reference})`);
            } else {
              console.log(`📍 Order ${targetOrderId} should be in this range but not found in current batch`);
            }
            break;
          }

          // If target ID is higher than the highest on this page, continue scanning
          if (targetOrderId > firstId) {
            console.log(`   Target ID ${targetOrderId} > page max ${firstId}, continuing...`);
            currentPage++;
            
            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
            continue;
          }

          // If target ID is lower than the lowest on this page, we've gone too far
          if (targetOrderId < lastId) {
            console.log(`   Target ID ${targetOrderId} < page min ${lastId}, stopping scan`);
            break;
          }

        } catch (error) {
          console.error(`   Error scanning page ${currentPage}:`, error);
          currentPage++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay on error
          continue;
        }
      }

      if (foundPage) {
        console.log(`✅ RESULT for ${store.storeIdentifier}: Correct page is ${foundPage}`);
        
        // Set the correct sync position in Redis
        const syncPosition = {
          lastPage: foundPage,
          lastOrderId: targetOrderId,
          timestamp: new Date().toISOString(),
          source: 'MANUAL_SCAN',
          storeIdentifier: store.storeIdentifier,
          storeName: store.storeName
        };

        // Set multiple Redis keys for redundancy
        const redisKeys = [
          `sync_position:${store.storeIdentifier}`,
          `sync:${store.storeIdentifier}:position`,
          `ecomanager:${store.storeIdentifier}:last_page`,
          `store:${store.storeIdentifier}:sync_position`
        ];

        for (const key of redisKeys) {
          await redis.set(key, JSON.stringify(syncPosition), 'EX', 86400);
          console.log(`   ✅ Set Redis key: ${key}`);
        }

        console.log(`🎯 CORRECT SYNC POSITION SET for ${store.storeIdentifier}:`);
        console.log(`   - Correct Page: ${foundPage}`);
        console.log(`   - Target Order ID: ${targetOrderId}`);
        console.log(`   - Source: MANUAL_SCAN`);
      } else {
        console.log(`❌ Could not find correct page for ${store.storeIdentifier} after scanning ${maxPagesToScan} pages`);
        console.log(`   This could mean:`);
        console.log(`   1. Order ${targetOrderId} doesn't exist in EcoManager API`);
        console.log(`   2. API pagination is broken`);
        console.log(`   3. Need to scan more pages (increase maxPagesToScan)`);
      }

      // Add delay between stores
      console.log(`⏳ Waiting 5 seconds before next store...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n✅ Manual page finding completed for all stores!');
    
  } catch (error) {
    console.error('❌ Error in manual page finder:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

// Run the manual page finder
findCorrectPages().catch(console.error);
