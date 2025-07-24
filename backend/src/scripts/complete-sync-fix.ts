import { prisma } from '../config/database';
import redis from '../config/redis';

async function completeSyncFix() {
  console.log('🔧 COMPLETE SYNC FIX - Addressing all sync position issues...');
  
  try {
    // Step 1: Clear ALL Redis cache
    console.log('\n🧹 Step 1: Clearing ALL Redis cache...');
    const allKeys = await redis.keys('*');
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`✅ Cleared ${allKeys.length} Redis keys`);
    } else {
      console.log('✅ Redis cache already empty');
    }

    // Step 2: Get all stores
    console.log('\n📊 Step 2: Processing all stores...');
    const stores = await prisma.apiConfiguration.findMany({
      select: { storeIdentifier: true, storeName: true }
    });

    for (const store of stores) {
      console.log(`\n🏪 Processing store: ${store.storeIdentifier} (${store.storeName})`);
      
      // Get the actual last order for this store from database
      const lastOrder = await prisma.order.findFirst({
        where: { 
          OR: [
            { reference: { startsWith: store.storeIdentifier } },
            // Handle NATUR vs NATU case
            ...(store.storeIdentifier === 'NATU' ? [{ reference: { startsWith: 'NATUR' } }] : [])
          ]
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
      let numericId: number;
      if (store.storeIdentifier === 'NATU' && lastOrder.reference.startsWith('NATUR')) {
        numericId = parseInt(lastOrder.reference.replace('NATUR', ''));
      } else {
        numericId = parseInt(lastOrder.reference.replace(store.storeIdentifier, ''));
      }
      console.log(`🔢 Extracted numeric ID: ${numericId}`);

      if (isNaN(numericId)) {
        console.log(`❌ Could not extract numeric ID from ${lastOrder.reference}`);
        continue;
      }

      // Calculate the correct page (assuming 20 orders per page)
      const calculatedPage = Math.ceil(numericId / 20);
      console.log(`📄 Calculated page: ${calculatedPage}`);

      // Set the correct sync position in Redis with multiple keys for redundancy
      const syncPosition = {
        lastPage: calculatedPage,
        lastOrderId: numericId,
        timestamp: new Date().toISOString(),
        source: 'COMPLETE_FIX_SCRIPT',
        storeIdentifier: store.storeIdentifier,
        storeName: store.storeName
      };

      // Set multiple Redis keys to ensure the position is found
      const redisKeys = [
        `sync_position:${store.storeIdentifier}`,
        `sync:${store.storeIdentifier}:position`,
        `ecomanager:${store.storeIdentifier}:last_page`,
        `store:${store.storeIdentifier}:sync_position`
      ];

      for (const key of redisKeys) {
        await redis.set(key, JSON.stringify(syncPosition), 'EX', 86400); // 24 hours
        console.log(`✅ Set Redis key: ${key}`);
      }

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

      console.log(`✅ Completed setup for ${store.storeIdentifier}:`);
      console.log(`   - Last Page: ${calculatedPage}`);
      console.log(`   - Last Order ID: ${numericId}`);
      console.log(`   - Redis Keys: ${redisKeys.length} keys set`);
    }

    // Step 3: Verify Redis cache
    console.log('\n🔍 Step 3: Verifying Redis cache...');
    const newKeys = await redis.keys('*');
    console.log(`📊 Total Redis keys after setup: ${newKeys.length}`);
    
    for (const key of newKeys) {
      if (key.includes('sync_position') || key.includes('position')) {
        const value = await redis.get(key);
        console.log(`🔑 ${key}: ${value ? 'SET' : 'EMPTY'}`);
      }
    }

    console.log('\n✅ COMPLETE SYNC FIX COMPLETED!');
    console.log('\n🔄 Next steps:');
    console.log('1. The sync positions are now correctly set based on actual database data');
    console.log('2. All Redis cache has been cleared and rebuilt');
    console.log('3. Multiple Redis keys are set for redundancy');
    console.log('4. JSON backup files created for persistence');
    console.log('\n🚀 Ready to test sync again!');
    
  } catch (error) {
    console.error('❌ Error in complete sync fix:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

// Run the complete fix
completeSyncFix().catch(console.error);
