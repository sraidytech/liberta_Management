import { prisma } from '../config/database';
import redis from '../config/redis';
import { SyncService } from '../services/sync.service';

async function testSyncFix() {
  console.log('🔧 Testing sync fix for rate limit and sync position issues...');
  
  try {
    // Initialize sync service with redis
    const syncService = new SyncService(redis);
    
    // Test sync for one store first
    console.log('🧪 Testing sync for NATU store...');
    
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
    
    // Test sync for NATU using the correct method
    const result = await syncService.syncStore('NATU');
    
    console.log('✅ Test sync completed successfully!');
    console.log(`📊 Sync Results:`, result);
    
  } catch (error) {
    console.error('❌ Test sync failed:', error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

// Run the test
testSyncFix().catch(console.error);
