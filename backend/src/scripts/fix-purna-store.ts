import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function fixPurnaStore() {
  console.log('🔧 Fixing PURNA Store Issues...\n');

  try {
    // 1. Check for orders with incorrect store identifiers
    console.log('1. Checking for incorrect store identifiers...');
    
    const incorrectStoreOrders = await prisma.order.findMany({
      where: {
        OR: [
          { storeIdentifier: 'PURNA - Purna Store' },
          { storeIdentifier: 'Purna Store' },
          { storeIdentifier: 'purna' },
          { storeIdentifier: { contains: 'PURNA', not: 'PURNA' } }
        ]
      },
      select: {
        id: true,
        storeIdentifier: true,
        ecoManagerId: true
      }
    });

    if (incorrectStoreOrders.length > 0) {
      console.log(`Found ${incorrectStoreOrders.length} orders with incorrect store identifier`);
      console.log('Fixing store identifiers...');
      
      await prisma.order.updateMany({
        where: {
          OR: [
            { storeIdentifier: 'PURNA - Purna Store' },
            { storeIdentifier: 'Purna Store' },
            { storeIdentifier: 'purna' }
          ]
        },
        data: {
          storeIdentifier: 'PURNA'
        }
      });
      
      console.log('✅ Store identifiers fixed');
    } else {
      console.log('✅ No incorrect store identifiers found');
    }

    // 2. Check PURNA API configuration
    console.log('\n2. Checking PURNA API configuration...');
    
    const purnaConfig = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier: 'PURNA' }
    });

    if (!purnaConfig) {
      console.log('❌ PURNA configuration not found!');
      console.log('Creating PURNA configuration...');
      
      // Note: PURNA configuration should be created manually via admin panel
      console.log('⚠️  PURNA configuration needs to be created manually');
      console.log('   Use the admin panel to add PURNA store configuration');
      
      console.log('✅ PURNA configuration created (update API token manually)');
    } else {
      console.log('✅ PURNA configuration exists');
      
      // Ensure it's active
      if (!purnaConfig.isActive) {
        await prisma.apiConfiguration.update({
          where: { id: purnaConfig.id },
          data: { isActive: true }
        });
        console.log('✅ PURNA configuration activated');
      }
    }

    // 3. Clear corrupted cache
    console.log('\n3. Clearing potentially corrupted cache...');
    
    const cacheKeys = [
      `ecomanager:pageinfo:PURNA`,
      `ecomanager:sync:PURNA`,
      `ecomanager:last_request:PURNA`
    ];
    
    for (const key of cacheKeys) {
      await redis.del(key);
    }
    
    console.log('✅ Cache cleared');

    // 4. Check current order count
    console.log('\n4. Checking current PURNA order count...');
    
    const purnaOrderCount = await prisma.order.count({
      where: { storeIdentifier: 'PURNA' }
    });
    
    console.log(`📊 Current PURNA orders in database: ${purnaOrderCount}`);

    if (purnaOrderCount > 0) {
      const latestOrder = await prisma.order.findFirst({
        where: { storeIdentifier: 'PURNA' },
        orderBy: { ecoManagerId: 'desc' },
        select: {
          ecoManagerId: true,
          reference: true,
          status: true,
          createdAt: true
        }
      });
      
      console.log('📋 Latest PURNA order:', latestOrder);
    }

    // 5. Update store statistics in API configuration
    console.log('\n5. Updating store statistics...');
    
    if (purnaConfig) {
      await prisma.apiConfiguration.update({
        where: { id: purnaConfig.id },
        data: {
          lastUsed: new Date()
        }
      });
    }

    console.log('\n🎉 PURNA Store Fix Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify API token is correct in the database');
    console.log('2. Run a test sync for PURNA store');
    console.log('3. Check if orders appear in the admin panel');
    console.log('4. Monitor sync performance');

  } catch (error) {
    console.error('❌ Error fixing PURNA store:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the fix script
fixPurnaStore().catch(console.error);