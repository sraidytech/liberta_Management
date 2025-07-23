import { EcoManagerService } from '../services/ecomanager.service';
import { Redis } from 'ioredis';
import { prisma } from '../config/database';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testPageInfoRecovery() {
  console.log('🧪 Testing Page Info Recovery System...\n');

  try {
    // Get first active API configuration
    const apiConfig = await prisma.apiConfiguration.findFirst({
      where: { isActive: true }
    });

    if (!apiConfig) {
      console.log('❌ No active API configurations found');
      return;
    }

    console.log(`🏪 Testing with store: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);

    // Create EcoManager service instance
    const ecoService = new EcoManagerService({
      storeIdentifier: apiConfig.storeIdentifier,
      storeName: apiConfig.storeName,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    // Test 1: Clear Redis cache to simulate docker prune
    console.log('\n📋 Test 1: Clearing Redis cache to simulate docker system prune...');
    const redisKey = `ecomanager:pageinfo:${apiConfig.storeIdentifier}`;
    await redis.del(redisKey);
    console.log('✅ Redis cache cleared');

    // Test 2: Try to get page info (should trigger auto-recovery)
    console.log('\n📋 Test 2: Getting page info (should trigger auto-recovery)...');
    const pageInfo = await ecoService.getPageInfo();
    
    if (pageInfo) {
      console.log('✅ Page info recovered successfully:');
      console.log(`   - Last Page: ${pageInfo.lastPage}`);
      console.log(`   - First ID: ${pageInfo.firstId}`);
      console.log(`   - Last ID: ${pageInfo.lastId}`);
      console.log(`   - Recovered: ${pageInfo.recovered ? 'YES' : 'NO'}`);
      console.log(`   - Timestamp: ${pageInfo.timestamp}`);
    } else {
      console.log('⚠️  No page info could be recovered (store might have no orders)');
    }

    // Test 3: Verify JSON file was created
    console.log('\n📋 Test 3: Checking if JSON file was created...');
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'page-info', `${apiConfig.storeIdentifier}.json`);
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileData = JSON.parse(fileContent);
      console.log('✅ JSON file created successfully:');
      console.log(`   - File path: ${filePath}`);
      console.log(`   - Content: ${JSON.stringify(fileData, null, 2)}`);
    } else {
      console.log('❌ JSON file was not created');
    }

    // Test 4: Clear Redis again and test JSON file recovery
    console.log('\n📋 Test 4: Testing JSON file recovery...');
    await redis.del(redisKey);
    console.log('✅ Redis cache cleared again');
    
    const recoveredFromFile = await ecoService.getPageInfo();
    if (recoveredFromFile) {
      console.log('✅ Page info recovered from JSON file:');
      console.log(`   - Source: JSON file`);
      console.log(`   - Last Page: ${recoveredFromFile.lastPage}`);
    } else {
      console.log('❌ Could not recover from JSON file');
    }

    console.log('\n🎉 Page Info Recovery System test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await redis.disconnect();
    await prisma.$disconnect();
  }
}

// Run the test
testPageInfoRecovery().catch(console.error);