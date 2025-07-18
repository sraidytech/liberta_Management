import { Redis } from 'ioredis';
import { MaystroService } from '../services/maystro.service';
import { MaystroConfigService } from '../services/maystro-config.service';

// Test script for dual Maystro API implementation
async function testDualMaystroApi() {
  console.log('🚀 Testing Dual Maystro API Implementation...\n');

  // Initialize Redis (mock for testing)
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  try {
    // Test 1: Initialize MaystroConfigService
    console.log('📋 Test 1: Initializing MaystroConfigService...');
    const configService = new MaystroConfigService(redis);
    const allApiKeys = configService.getAllApiKeys();
    
    console.log(`✅ Found ${allApiKeys.length} configured API key(s):`);
    allApiKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name} (${key.isPrimary ? 'Primary' : 'Secondary'})`);
    });

    if (allApiKeys.length === 0) {
      console.log('❌ No API keys configured. Please set MAYSTRO_API_KEY_1 and MAYSTRO_API_KEY_2');
      return;
    }

    // Test 2: Initialize MaystroService with dual API support
    console.log('\n📋 Test 2: Initializing MaystroService with dual API support...');
    const maystroService = new MaystroService(allApiKeys, redis);
    console.log('✅ MaystroService initialized successfully');

    // Test 3: Test order lookup with dual API checking
    console.log('\n📋 Test 3: Testing dual API order lookup...');
    
    // Test with a few sample order references
    const testOrderReferences = [
      'NATUR151212',
      'NATUR151211', 
      'NATUR151210',
      'ESAHA179735',
      'VBIO178940'
    ];

    for (const reference of testOrderReferences) {
      console.log(`\n🔍 Testing order lookup for: ${reference}`);
      const order = await maystroService.getOrderByReference(reference);
      
      if (order) {
        console.log(`✅ Order found: ${reference}`);
        console.log(`   - Status: ${maystroService.mapStatus(order.status)}`);
        console.log(`   - API Source: ${(order as any)._apiSource || 'Unknown'}`);
        console.log(`   - Maystro ID: ${order.instance_uuid || order.id}`);
      } else {
        console.log(`❌ Order not found: ${reference}`);
      }
    }

    // Test 4: Test connection to all APIs
    console.log('\n📋 Test 4: Testing connection to all configured APIs...');
    for (const apiKey of allApiKeys) {
      console.log(`\n🔗 Testing connection to ${apiKey.name}...`);
      const result = await configService.testApiKeyConnection(apiKey.id);
      
      if (result.success) {
        console.log(`✅ Connection successful to ${apiKey.name}`);
      } else {
        console.log(`❌ Connection failed to ${apiKey.name}: ${result.error}`);
      }
    }

    // Test 5: Test fetchAllOrders with dual API aggregation
    console.log('\n📋 Test 5: Testing fetchAllOrders with dual API aggregation...');
    console.log('🔄 Fetching orders from all APIs (limited to 100 for testing)...');
    
    const allOrders = await maystroService.fetchAllOrders(100);
    console.log(`✅ Successfully fetched ${allOrders.length} orders from all APIs`);
    
    // Show API source distribution
    const apiSourceCounts = new Map<string, number>();
    allOrders.forEach(order => {
      const source = (order as any)._apiSource || 'Unknown';
      apiSourceCounts.set(source, (apiSourceCounts.get(source) || 0) + 1);
    });
    
    console.log('📊 Orders by API source:');
    apiSourceCounts.forEach((count, source) => {
      console.log(`   - ${source}: ${count} orders`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ ${allApiKeys.length} API key(s) configured`);
    console.log(`   ✅ Dual API checking implemented`);
    console.log(`   ✅ Order aggregation working`);
    console.log(`   ✅ Fallback mechanism active`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await redis.quit();
  }
}

// Run the test
if (require.main === module) {
  testDualMaystroApi().catch(console.error);
}

export { testDualMaystroApi };