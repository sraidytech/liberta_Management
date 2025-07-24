import redis from '../config/redis';

async function forceClearAllCache() {
  console.log('🧹 Force clearing ALL Redis cache...');
  
  try {
    // Get all keys
    const allKeys = await redis.keys('*');
    console.log(`📊 Found ${allKeys.length} Redis keys to clear`);

    if (allKeys.length > 0) {
      // Clear all keys
      await redis.del(...allKeys);
      console.log(`✅ Cleared ${allKeys.length} Redis keys`);
    }

    // Verify cache is empty
    const remainingKeys = await redis.keys('*');
    console.log(`📊 Remaining keys after clear: ${remainingKeys.length}`);

    if (remainingKeys.length > 0) {
      console.log('⚠️ Some keys remain:', remainingKeys);
    } else {
      console.log('✅ Redis cache completely cleared!');
    }

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    redis.disconnect();
  }
}

// Run the clear
forceClearAllCache().catch(console.error);
