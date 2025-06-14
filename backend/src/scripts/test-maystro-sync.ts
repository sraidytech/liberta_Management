import { getMaystroService } from '../services/maystro.service';
import Redis from 'ioredis';

async function testMaystroSync() {
  console.log('🚀 Testing SUPER FAST Maystro Sync...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  try {
    const maystroService = getMaystroService(redis);
    
    console.log('⏱️  Starting sync test...');
    const startTime = Date.now();
    
    const result = await maystroService.syncOrders();
    
    const duration = Date.now() - startTime;
    
    console.log('\n🎉 SYNC TEST RESULTS:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    console.log(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`);
    
    if (result.stats) {
      console.log('\n📊 DETAILED STATS:');
      console.log(`   📦 Orders Processed: ${result.stats.processed}`);
      console.log(`   🔄 Orders Updated: ${result.stats.updated}`);
      console.log(`   ⚡ Speed: ${(result.stats.processed / (duration / 1000)).toFixed(1)} orders/second`);
    }
    
    console.log('\n🎯 KEY IMPROVEMENTS:');
    console.log('   ✅ Concurrent API fetching (10 pages at once)');
    console.log('   ✅ Reduced to 3000 orders for speed');
    console.log('   ✅ Only recent orders (30 days) from database');
    console.log('   ✅ Batch updates in groups of 50');
    console.log('   ✅ Focus on key fields: status, alerts, tracking');
    
  } catch (error: any) {
    console.error('❌ Sync test failed:', error.message);
    console.error(error.stack);
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

testMaystroSync();