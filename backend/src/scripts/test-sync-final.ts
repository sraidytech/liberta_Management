import { prisma } from '../config/database';
import redis from '../config/redis';
import { SyncService } from '../services/sync.service';

async function testSyncFinal() {
  console.log('🔧 FINAL SYNC TEST - All fixes applied...');
  
  try {
    // Initialize sync service with redis
    const syncService = new SyncService(redis);
    
    // Test sync for NATU store specifically
    console.log('🧪 Testing NATU store with all fixes...');
    
    // Get NATU store config
    const natuStore = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier: 'NATU' }
    });
    
    if (!natuStore) {
      console.error('❌ NATU store not found in database');
      return;
    }
    
    console.log(`📊 NATU Store found: ${natuStore.storeName}`);
    console.log(`   - API Token: ...${natuStore.apiToken.slice(-4)}`);
    console.log(`   - Base URL: ${natuStore.baseUrl}`);
    
    // Check current Redis sync position
    console.log('\n🔍 Checking current Redis sync positions...');
    const redisKeys = [
      `sync_position:NATU`,
      `sync:NATU:position`,
      `ecomanager:NATU:last_page`,
      `store:NATU:sync_position`
    ];
    
    for (const key of redisKeys) {
      const value = await redis.get(key);
      if (value) {
        const parsed = JSON.parse(value);
        console.log(`📊 ${key}: Page ${parsed.lastPage}, Order ID ${parsed.lastOrderId}`);
      } else {
        console.log(`📊 ${key}: NOT SET`);
      }
    }
    
    // Check database for actual last order
    console.log('\n🔍 Checking database for actual last NATU order...');
    const lastOrder = await prisma.order.findFirst({
      where: { 
        OR: [
          { storeIdentifier: 'NATU' },
          { reference: { startsWith: 'NATUR' } }
        ]
      },
      orderBy: { orderDate: 'desc' }
    });
    
    if (lastOrder) {
      console.log(`📊 Database last order: ${lastOrder.reference}`);
      console.log(`📅 Order date: ${lastOrder.orderDate}`);
      
      // Extract numeric ID
      let numericId = 0;
      if (lastOrder.reference.startsWith('NATUR')) {
        numericId = parseInt(lastOrder.reference.replace('NATUR', ''));
      } else {
        numericId = parseInt(lastOrder.reference.replace('NATU', ''));
      }
      console.log(`🔢 Extracted numeric ID: ${numericId}`);
      console.log(`📄 Expected page: ${Math.ceil(numericId / 20)}`);
    }
    
    // Test sync for NATU using the correct method
    console.log('\n🚀 Starting NATU sync test...');
    const result = await syncService.syncStore('NATU');
    
    console.log('\n✅ FINAL TEST COMPLETED!');
    console.log(`📊 Sync Results:`, result);
    
    if (result.success && result.syncedCount > 0) {
      console.log(`🎉 SUCCESS! Found and synced ${result.syncedCount} new orders!`);
    } else if (result.success && result.syncedCount === 0) {
      console.log(`ℹ️ No new orders found - this could mean:`);
      console.log(`   1. Store is up to date (good)`);
      console.log(`   2. Sync position is still wrong (bad)`);
      console.log(`   3. EcoManager API pagination issue (bad)`);
    } else {
      console.log(`❌ Sync failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Final test failed:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

// Run the final test
testSyncFinal().catch(console.error);
