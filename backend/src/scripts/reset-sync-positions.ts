import { prisma } from '../config/database';
import redis from '../config/redis';

async function resetSyncPositions() {
  console.log('🔧 Resetting sync positions based on actual database data...');
  
  try {
    // Get all stores
    const stores = await prisma.apiConfiguration.findMany({
      select: { storeIdentifier: true, storeName: true }
    });

    for (const store of stores) {
      console.log(`\n📊 Processing store: ${store.storeIdentifier} (${store.storeName})`);
      
      // Get the actual last order for this store from database
      const lastOrder = await prisma.order.findFirst({
        where: { 
          reference: { startsWith: store.storeIdentifier }
        },
        orderBy: { orderDate: 'desc' },
        select: { 
          reference: true, 
          orderDate: true, 
          ecoManagerId: true 
        }
      });

      if (!lastOrder) {
        console.log(`❌ No orders found for store ${store.storeIdentifier}`);
        continue;
      }

      console.log(`📋 Last order in database: ${lastOrder.reference}`);
      console.log(`📅 Order date: ${lastOrder.orderDate}`);
      console.log(`🔢 EcoManager ID: ${lastOrder.ecoManagerId}`);

      // Extract the numeric ID from the reference
      const numericId = parseInt(lastOrder.reference.replace(store.storeIdentifier, ''));
      console.log(`🔢 Extracted numeric ID: ${numericId}`);

      // Calculate the correct page (assuming 20 orders per page)
      const calculatedPage = Math.ceil(numericId / 20);
      console.log(`📄 Calculated page: ${calculatedPage}`);

      // Clear Redis cache for this store
      const redisKeys = [
        `sync_position:${store.storeIdentifier}`,
        `sync_position:${store.storeIdentifier}:*`,
        `last_sync:${store.storeIdentifier}`,
        `ecomanager:${store.storeIdentifier}:*`
      ];

      for (const key of redisKeys) {
        if (key.includes('*')) {
          const keys = await redis.keys(key);
          if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`🗑️ Cleared ${keys.length} Redis keys matching: ${key}`);
          }
        } else {
          await redis.del(key);
          console.log(`🗑️ Cleared Redis key: ${key}`);
        }
      }

      // Set the correct sync position in Redis
      const syncPosition = {
        lastPage: calculatedPage,
        lastOrderId: numericId,
        timestamp: new Date().toISOString(),
        source: 'RESET_SCRIPT'
      };

      await redis.set(
        `sync_position:${store.storeIdentifier}`, 
        JSON.stringify(syncPosition),
        'EX', 
        86400 // 24 hours
      );

      console.log(`✅ Set new sync position for ${store.storeIdentifier}:`);
      console.log(`   - Last Page: ${calculatedPage}`);
      console.log(`   - Last Order ID: ${numericId}`);
      console.log(`   - Source: RESET_SCRIPT`);

      // Also create JSON backup file
      const fs = require('fs');
      const path = require('path');
      
      const backupDir = '/app/sync-positions-backup';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFile = path.join(backupDir, `${store.storeIdentifier}-sync-position.json`);
      fs.writeFileSync(backupFile, JSON.stringify(syncPosition, null, 2));
      console.log(`💾 Created backup file: ${backupFile}`);
    }

    console.log('\n✅ Sync position reset completed for all stores!');
    console.log('\n🔄 Next sync will start from the correct positions.');
    
  } catch (error) {
    console.error('❌ Error resetting sync positions:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

// Run the reset
resetSyncPositions().catch(console.error);
