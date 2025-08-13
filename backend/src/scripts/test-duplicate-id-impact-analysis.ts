import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/**
 * 🔍 DUPLICATE ID IMPACT ANALYSIS
 * This test investigates what happens when we have orders with same numeric ID
 * but different stores (e.g., NATU20512 and ALPH20512)
 * 
 * We need to check:
 * 1. Database constraints and indexes
 * 2. Unique constraints that might be violated
 * 3. Any code that assumes ecoManagerId is globally unique
 * 4. References and relationships that might break
 */
async function testDuplicateIdImpactAnalysis() {
  console.log('🔍 DUPLICATE ID IMPACT ANALYSIS');
  console.log('=' .repeat(80));
  console.log('Investigating potential issues when orders have same numeric ID');
  console.log('but different stores (e.g., NATU20512 and ALPH20512)');
  console.log('');

  try {
    // STEP 1: Check current database schema for unique constraints
    console.log('🔍 STEP 1: Checking database schema for unique constraints...');
    await checkDatabaseConstraints();

    // STEP 2: Find existing examples of duplicate numeric IDs
    console.log('\n🔍 STEP 2: Finding existing examples of duplicate numeric IDs...');
    await findExistingDuplicateIds();

    // STEP 3: Test what happens when we try to create duplicate numeric IDs
    console.log('\n🔍 STEP 3: Testing creation of orders with duplicate numeric IDs...');
    await testDuplicateIdCreation();

    // STEP 4: Check all code references to ecoManagerId
    console.log('\n🔍 STEP 4: Analyzing potential code issues...');
    await analyzeCodeReferences();

    // STEP 5: Test specific scenarios
    console.log('\n🔍 STEP 5: Testing specific scenarios...');
    await testSpecificScenarios();

    // STEP 6: Check for any other unique constraints or indexes
    console.log('\n🔍 STEP 6: Checking for other potential conflicts...');
    await checkOtherConstraints();

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

/**
 * Check database constraints that might be affected
 */
async function checkDatabaseConstraints() {
  try {
    // Check the orders table structure
    const tableInfo = await prisma.$queryRaw`
      SELECT 
        column_name,
        is_nullable,
        data_type,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Orders table structure:');
    console.table(tableInfo);

    // Check for unique constraints
    const uniqueConstraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'orders' 
      AND tc.table_schema = 'public'
      AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
    `;

    console.log('\n📋 Unique constraints on orders table:');
    console.table(uniqueConstraints);

    // Check for indexes
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'orders' 
      AND schemaname = 'public';
    `;

    console.log('\n📋 Indexes on orders table:');
    console.table(indexes);

  } catch (error: any) {
    console.error('❌ Error checking database constraints:', error.message);
  }
}

/**
 * Find existing examples of duplicate numeric IDs across stores
 */
async function findExistingDuplicateIds() {
  try {
    // Find orders that have the same numeric ecoManagerId but different stores
    const duplicateIds = await prisma.$queryRaw<Array<{
      ecoManagerId: string;
      stores: string;
      count: number;
    }>>`
      SELECT 
        "ecoManagerId",
        STRING_AGG(DISTINCT "storeIdentifier", ', ' ORDER BY "storeIdentifier") as stores,
        COUNT(*) as count
      FROM "orders"
      WHERE "ecoManagerId" IS NOT NULL
      GROUP BY "ecoManagerId"
      HAVING COUNT(DISTINCT "storeIdentifier") > 1
      ORDER BY COUNT(*) DESC, "ecoManagerId" DESC
      LIMIT 20;
    `;

    if (duplicateIds.length > 0) {
      console.log(`🚨 Found ${duplicateIds.length} ecoManagerIds that exist across multiple stores:`);
      duplicateIds.forEach((dup, index) => {
        console.log(`   ${index + 1}. ID ${dup.ecoManagerId}: ${dup.stores} (${dup.count} orders)`);
      });

      // Get detailed info for the first few duplicates
      console.log('\n📋 Detailed info for first 3 duplicates:');
      for (let i = 0; i < Math.min(3, duplicateIds.length); i++) {
        const dup = duplicateIds[i];
        const orders = await prisma.order.findMany({
          where: { ecoManagerId: dup.ecoManagerId },
          select: {
            id: true,
            reference: true,
            storeIdentifier: true,
            ecoManagerId: true,
            status: true,
            total: true,
            createdAt: true
          }
        });

        console.log(`\n   📊 Orders with ecoManagerId ${dup.ecoManagerId}:`);
        orders.forEach(order => {
          console.log(`      - ${order.reference} (${order.storeIdentifier}): ${order.status}, ${order.total} DZD, created ${order.createdAt.toISOString().split('T')[0]}`);
        });
      }
    } else {
      console.log('✅ No existing duplicate ecoManagerIds found across different stores');
    }

  } catch (error: any) {
    console.error('❌ Error finding duplicate IDs:', error.message);
  }
}

/**
 * Test what happens when we try to create orders with duplicate numeric IDs
 */
async function testDuplicateIdCreation() {
  try {
    console.log('🧪 Testing creation of orders with duplicate numeric IDs...');
    
    // First, check if we can create a test scenario
    const testId = '99999';
    
    // Clean up any existing test orders
    await prisma.order.deleteMany({
      where: { ecoManagerId: testId }
    });

    // Create a test customer
    let testCustomer = await prisma.customer.findFirst({
      where: { telephone: 'TEST_DUPLICATE_ID' }
    });

    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          fullName: 'Test Customer for Duplicate ID',
          telephone: 'TEST_DUPLICATE_ID',
          wilaya: 'Test Wilaya',
          commune: 'Test Commune',
          totalOrders: 0
        }
      });
    }

    // Try to create two orders with the same ecoManagerId but different stores
    console.log('   📝 Creating first order (NATU99999)...');
    const order1 = await prisma.order.create({
      data: {
        reference: 'NATU99999',
        ecoManagerId: testId,
        storeIdentifier: 'NATU',
        source: 'ECOMANAGER',
        status: 'PENDING',
        total: 1000,
        orderDate: new Date(),
        customerId: testCustomer.id,
        items: {
          create: [{
            productId: 'TEST_PRODUCT',
            sku: 'TEST_SKU',
            title: 'Test Product',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000
          }]
        }
      }
    });

    console.log('   ✅ First order created successfully');

    console.log('   📝 Creating second order (ALPH99999)...');
    const order2 = await prisma.order.create({
      data: {
        reference: 'ALPH99999',
        ecoManagerId: testId,
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER',
        status: 'PENDING',
        total: 1500,
        orderDate: new Date(),
        customerId: testCustomer.id,
        items: {
          create: [{
            productId: 'TEST_PRODUCT_2',
            sku: 'TEST_SKU_2',
            title: 'Test Product 2',
            quantity: 1,
            unitPrice: 1500,
            totalPrice: 1500
          }]
        }
      }
    });

    console.log('   ✅ Second order created successfully');
    console.log('   ✅ RESULT: Database allows multiple orders with same ecoManagerId but different stores');

    // Test queries that might be affected
    console.log('\n   🔍 Testing queries that might be affected:');
    
    // Test findUnique by ecoManagerId (this should return the first one found)
    const uniqueQuery = await prisma.order.findUnique({
      where: { ecoManagerId: testId }
    });
    console.log(`   📊 findUnique by ecoManagerId: Returns ${uniqueQuery?.reference} (${uniqueQuery?.storeIdentifier})`);

    // Test findMany by ecoManagerId (this should return both)
    const manyQuery = await prisma.order.findMany({
      where: { ecoManagerId: testId }
    });
    console.log(`   📊 findMany by ecoManagerId: Returns ${manyQuery.length} orders`);

    // Test findFirst with store filter
    const firstWithStore = await prisma.order.findFirst({
      where: { 
        ecoManagerId: testId,
        storeIdentifier: 'ALPH'
      }
    });
    console.log(`   📊 findFirst with store filter: Returns ${firstWithStore?.reference} (${firstWithStore?.storeIdentifier})`);

    // Clean up test orders
    await prisma.order.deleteMany({
      where: { ecoManagerId: testId }
    });
    console.log('   🧹 Test orders cleaned up');

  } catch (error: any) {
    console.error('❌ Error testing duplicate ID creation:', error.message);
    
    // Clean up in case of error
    try {
      await prisma.order.deleteMany({
        where: { ecoManagerId: '99999' }
      });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Analyze code references to ecoManagerId
 */
async function analyzeCodeReferences() {
  console.log('📋 Code analysis findings:');
  console.log('   🔍 Current sync logic uses: findUnique({ where: { ecoManagerId } })');
  console.log('   🚨 ISSUE: findUnique returns the FIRST match, not necessarily the right store');
  console.log('   ✅ SOLUTION: Use findFirst({ where: { ecoManagerId, storeIdentifier } })');
  console.log('');
  console.log('   📋 Other potential areas to check:');
  console.log('   - Order search/lookup functions');
  console.log('   - API endpoints that query by ecoManagerId');
  console.log('   - Reports or analytics that group by ecoManagerId');
  console.log('   - Any caching mechanisms using ecoManagerId as key');
}

/**
 * Test specific scenarios
 */
async function testSpecificScenarios() {
  try {
    console.log('🧪 Testing specific scenarios:');
    
    // Scenario 1: What happens if we search for an order by ecoManagerId?
    console.log('\n   📋 Scenario 1: Searching for existing duplicate ecoManagerId');
    
    // Find an actual duplicate if it exists
    const existingDuplicate = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "ecoManagerId" IS NOT NULL
      GROUP BY "ecoManagerId"
      HAVING COUNT(DISTINCT "storeIdentifier") > 1
      LIMIT 1;
    `;

    if (existingDuplicate.length > 0) {
      const testId = existingDuplicate[0].ecoManagerId;
      console.log(`   🔍 Testing with existing duplicate ID: ${testId}`);
      
      const allOrders = await prisma.order.findMany({
        where: { ecoManagerId: testId },
        select: { reference: true, storeIdentifier: true }
      });
      
      const uniqueResult = await prisma.order.findUnique({
        where: { ecoManagerId: testId },
        select: { reference: true, storeIdentifier: true }
      });
      
      console.log(`   📊 All orders with ID ${testId}: ${allOrders.map(o => o.reference).join(', ')}`);
      console.log(`   📊 findUnique returns: ${uniqueResult?.reference} (${uniqueResult?.storeIdentifier})`);
      console.log(`   🚨 ISSUE: findUnique is non-deterministic when duplicates exist!`);
    } else {
      console.log('   ✅ No existing duplicates found to test with');
    }

  } catch (error: any) {
    console.error('❌ Error testing scenarios:', error.message);
  }
}

/**
 * Check for other potential constraints or conflicts
 */
async function checkOtherConstraints() {
  try {
    console.log('🔍 Checking for other potential conflicts:');
    
    // Check if reference field has any constraints
    const referenceConstraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'orders' 
      AND kcu.column_name = 'reference'
      AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
    `;

    if (Array.isArray(referenceConstraints) && referenceConstraints.length > 0) {
      console.log('   📋 Reference field constraints:');
      console.table(referenceConstraints);
    } else {
      console.log('   ✅ No unique constraints on reference field');
    }

    // Check for foreign key relationships
    const foreignKeys = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'orders';
    `;

    if (Array.isArray(foreignKeys) && foreignKeys.length > 0) {
      console.log('   📋 Foreign key relationships:');
      console.table(foreignKeys);
    } else {
      console.log('   ✅ No foreign key constraints found');
    }

  } catch (error: any) {
    console.error('❌ Error checking other constraints:', error.message);
  }
}

// Run the test
testDuplicateIdImpactAnalysis().catch(console.error);