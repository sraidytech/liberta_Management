import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { MaystroConfigService } from '../services/maystro-config.service';
import { getMaystroService } from '../services/maystro.service';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_URL?.split(':')[0] || 'localhost',
  port: parseInt(process.env.REDIS_URL?.split(':')[1] || '6379'),
  maxRetriesPerRequest: 3,
});

/**
 * 🔍 DIAGNOSE ALPH MAYSTRO ISSUE
 * 
 * PROBLEM IDENTIFIED:
 * - ALPH store uses MAYSTRO_API_KEY_1 (second API key)
 * - But MaystroService doesn't know which store belongs to which API key
 * - It treats all API keys as interchangeable sources for ALL orders
 * - This means ALPH orders might be searched in the wrong API
 * 
 * SOLUTION NEEDED:
 * - Map stores to specific API keys
 * - Ensure ALPH orders are only searched/synced with MAYSTRO_API_KEY_1
 */
async function diagnoseAlphMaystroIssue() {
  console.log('🔍 DIAGNOSE ALPH MAYSTRO ISSUE');
  console.log('='.repeat(80));
  console.log('');

  try {
    // STEP 1: Check environment configuration
    console.log('📋 STEP 1: Environment Configuration');
    console.log('-'.repeat(80));
    console.log('MAYSTRO_API_KEY:', process.env.MAYSTRO_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('MAYSTRO_API_KEY_1:', process.env.MAYSTRO_API_KEY_1 ? '✅ Set (for ALPH)' : '❌ Not set');
    console.log('MAYSTRO_API_KEY_1_NAME:', process.env.MAYSTRO_API_KEY_1_NAME || 'Not set');
    console.log('');

    // STEP 2: Check MaystroConfigService
    console.log('📋 STEP 2: MaystroConfigService API Keys');
    console.log('-'.repeat(80));
    const configService = new MaystroConfigService(redis);
    const allApiKeys = configService.getAllApiKeys();
    
    console.log(`Found ${allApiKeys.length} API key(s):`);
    allApiKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key.name}`);
      console.log(`     - ID: ${key.id}`);
      console.log(`     - Primary: ${key.isPrimary ? 'Yes' : 'No'}`);
      console.log(`     - Active: ${key.isActive ? 'Yes' : 'No'}`);
      console.log(`     - API Key Preview: ${key.apiKey.substring(0, 10)}...`);
      console.log('');
    });

    // STEP 3: Check ALPH orders in database
    console.log('📋 STEP 3: ALPH Orders in Database');
    console.log('-'.repeat(80));
    const alphOrders = await prisma.order.findMany({
      where: {
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER'
      },
      select: {
        id: true,
        reference: true,
        shippingStatus: true,
        maystroOrderId: true,
        trackingNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${alphOrders.length} recent ALPH orders:`);
    alphOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.reference}`);
      console.log(`     - Shipping Status: ${order.shippingStatus || 'Not set'}`);
      console.log(`     - Maystro Order ID: ${order.maystroOrderId || 'Not set'}`);
      console.log(`     - Tracking Number: ${order.trackingNumber || 'Not set'}`);
      console.log('');
    });

    // STEP 4: Test MaystroService initialization
    console.log('📋 STEP 4: MaystroService Initialization');
    console.log('-'.repeat(80));
    const maystroService = getMaystroService(redis);
    console.log('✅ MaystroService initialized successfully');
    console.log('');

    // STEP 5: THE CRITICAL ISSUE
    console.log('🚨 STEP 5: THE CRITICAL ISSUE IDENTIFIED');
    console.log('-'.repeat(80));
    console.log('');
    console.log('❌ PROBLEM:');
    console.log('   1. ALPH store orders should use MAYSTRO_API_KEY_1');
    console.log('   2. Other stores (NATU, PURNA, etc.) use MAYSTRO_API_KEY (primary)');
    console.log('   3. But MaystroService has NO MAPPING between stores and API keys!');
    console.log('');
    console.log('   Current behavior:');
    console.log('   - MaystroService.fetchAllOrders() fetches from ALL APIs');
    console.log('   - MaystroService.getOrderByReference() searches ALL APIs');
    console.log('   - No way to specify "use API key 1 for ALPH orders only"');
    console.log('');
    console.log('✅ SOLUTION NEEDED:');
    console.log('   1. Add store-to-API-key mapping in MaystroConfigService');
    console.log('   2. Modify MaystroService to respect store mappings');
    console.log('   3. When syncing ALPH orders, use only MAYSTRO_API_KEY_1');
    console.log('   4. When syncing other stores, use only MAYSTRO_API_KEY (primary)');
    console.log('');

    // STEP 6: Check if orders are stuck
    console.log('📋 STEP 6: Check Stuck ALPH Orders');
    console.log('-'.repeat(80));
    const stuckOrders = await prisma.order.findMany({
      where: {
        storeIdentifier: 'ALPH',
        shippingStatus: 'EN TRANSIT POUR EXPÉDITION',
        source: 'ECOMANAGER'
      },
      select: {
        reference: true,
        shippingStatus: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${stuckOrders.length} ALPH orders stuck in "EN TRANSIT POUR EXPÉDITION":`);
    if (stuckOrders.length > 0) {
      stuckOrders.slice(0, 10).forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.reference} (Created: ${order.createdAt.toISOString()})`);
      });
      if (stuckOrders.length > 10) {
        console.log(`  ... and ${stuckOrders.length - 10} more`);
      }
    }
    console.log('');

    // STEP 7: Proposed fix summary
    console.log('📋 STEP 7: PROPOSED FIX SUMMARY');
    console.log('-'.repeat(80));
    console.log('');
    console.log('We need to implement store-to-API-key mapping:');
    console.log('');
    console.log('1. Update MaystroConfigService:');
    console.log('   - Add storeIdentifiers field to MaystroApiKeyConfig');
    console.log('   - Example: { id: "key_1", storeIdentifiers: ["ALPH"] }');
    console.log('');
    console.log('2. Update MaystroService:');
    console.log('   - Add getApiInstanceForStore(storeIdentifier) method');
    console.log('   - Modify syncShippingStatus to use correct API per store');
    console.log('   - Modify getOrderByReference to use correct API per store');
    console.log('');
    console.log('3. Update .env configuration:');
    console.log('   - Add MAYSTRO_API_KEY_1_STORES=ALPH');
    console.log('   - Add MAYSTRO_API_KEY_STORES=NATU,PURNA,DILST,MGSTR,JWLR');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error during diagnosis:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

diagnoseAlphMaystroIssue();