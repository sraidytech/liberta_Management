import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '@/services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * 🔍 ALPH SPECIFIC ISSUE TEST
 * Focus on understanding why ALPH fails and how to fix it
 */
async function testAlphSpecificIssue() {
  console.log('🔍 ALPH SPECIFIC ISSUE TEST');
  console.log('=' .repeat(80));
  console.log('Investigating the specific issue with ALPH store sync');
  console.log('');

  try {
    // Get ALPH store configuration
    const apiConfig = await prisma.apiConfiguration.findFirst({
      where: { storeIdentifier: 'ALPH', isActive: true }
    });

    if (!apiConfig) {
      console.log('❌ ALPH store configuration not found!');
      return;
    }

    console.log(`📋 Store: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
    console.log(`📋 Base URL: ${apiConfig.baseUrl}`);

    // STEP 1: Check what ecoManagerIds exist for ALPH
    console.log('\n🔍 STEP 1: Checking existing ALPH orders in database...');
    const alphOrders = await prisma.order.findMany({
      where: { 
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER'
      },
      select: {
        id: true,
        ecoManagerId: true,
        reference: true,
        status: true,
        orderDate: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Found ${alphOrders.length} ALPH orders in database:`);
    alphOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.reference} (ecoManagerId: ${order.ecoManagerId}, Status: ${order.status})`);
    });

    // STEP 2: Try the problematic query that's failing
    console.log('\n🔍 STEP 2: Testing the problematic query...');
    try {
      const result = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
        ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
        LIMIT 1
      `;
      console.log('✅ Query succeeded:', result);
    } catch (error: any) {
      console.log('❌ Query failed as expected:', error.message);
      console.log('🔍 This is because ALPH ecoManagerIds contain letters!');
    }

    // STEP 3: Try alternative query approaches
    console.log('\n🔍 STEP 3: Testing alternative query approaches...');
    
    // Approach 1: Extract numeric part only
    try {
      const result1 = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
        ORDER BY CAST(REGEXP_REPLACE("ecoManagerId", '[^0-9]', '', 'g') AS INTEGER) DESC
        LIMIT 1
      `;
      console.log('✅ Approach 1 (extract numeric): SUCCESS');
      console.log('   Last order:', result1[0]?.ecoManagerId);
    } catch (error: any) {
      console.log('❌ Approach 1 failed:', error.message);
    }

    // Approach 2: Simple string ordering
    try {
      const result2 = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
        ORDER BY "ecoManagerId" DESC
        LIMIT 1
      `;
      console.log('✅ Approach 2 (string ordering): SUCCESS');
      console.log('   Last order:', result2[0]?.ecoManagerId);
    } catch (error: any) {
      console.log('❌ Approach 2 failed:', error.message);
    }

    // Approach 3: Order by creation date instead
    try {
      const result3 = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;
      console.log('✅ Approach 3 (by creation date): SUCCESS');
      console.log('   Last order:', result3[0]?.ecoManagerId);
    } catch (error: any) {
      console.log('❌ Approach 3 failed:', error.message);
    }

    // STEP 4: Test EcoManager API connection
    console.log('\n🔍 STEP 4: Testing EcoManager API connection...');
    const ecoService = new EcoManagerService({
      storeName: apiConfig.storeName,
      storeIdentifier: apiConfig.storeIdentifier,
      apiToken: apiConfig.apiToken,
      baseUrl: apiConfig.baseUrl
    }, redis);

    const connectionTest = await ecoService.testConnection();
    if (connectionTest) {
      console.log('✅ ALPH API connection successful');
      
      // STEP 5: Fetch a few orders from API to see the format
      console.log('\n🔍 STEP 5: Fetching sample orders from ALPH API...');
      try {
        const result: any = await (ecoService as any).fetchOrdersPageCursor(null);
        if (result.success && result.data.data.length > 0) {
          const sampleOrders = result.data.data.slice(0, 5);
          console.log(`📊 Sample orders from ALPH API:`);
          sampleOrders.forEach((order: any, index: number) => {
            console.log(`   ${index + 1}. ID: ${order.id}, Reference: ${order.reference}, Customer: ${order.full_name}`);
          });

          // Test the mapping
          const mappedOrder = ecoService.mapOrderToDatabase(sampleOrders[0]);
          console.log(`\n📋 Mapped order example:`);
          console.log(`   - Store Identifier: ${mappedOrder.storeIdentifier}`);
          console.log(`   - Reference: ${mappedOrder.reference}`);
          console.log(`   - EcoManager ID: ${mappedOrder.ecoManagerId}`);
          console.log(`   - Source: ${mappedOrder.source}`);
        }
      } catch (apiError: any) {
        console.log('❌ Failed to fetch from ALPH API:', apiError.message);
      }
    } else {
      console.log('❌ ALPH API connection failed');
    }

    // STEP 6: Test the duplicate check issue
    console.log('\n🔍 STEP 6: Testing duplicate check scenarios...');
    
    // Check if there are any orders with same numeric ID but different stores
    const potentialConflicts = await prisma.$queryRaw<Array<{ecoManagerId: string, storeIdentifier: string, reference: string}>>`
      SELECT "ecoManagerId", "storeIdentifier", "reference"
      FROM "orders"
      WHERE "ecoManagerId" IN (
        SELECT REGEXP_REPLACE("ecoManagerId", '[^0-9]', '', 'g')
        FROM "orders"
        WHERE "storeIdentifier" = 'ALPH'
          AND "ecoManagerId" IS NOT NULL
        LIMIT 10
      )
      AND "storeIdentifier" != 'ALPH'
      ORDER BY "ecoManagerId"
    `;

    if (potentialConflicts.length > 0) {
      console.log(`🚨 Found ${potentialConflicts.length} potential conflicts:`);
      potentialConflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.reference} (Store: ${conflict.storeIdentifier}, ID: ${conflict.ecoManagerId})`);
      });
    } else {
      console.log('✅ No obvious conflicts found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run the test
testAlphSpecificIssue().catch(console.error);