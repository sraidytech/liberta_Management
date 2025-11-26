/**
 * Test and Fix Corrupted Orders
 * 
 * This script:
 * 1. Tests the fixed sync workflow on last 1000 orders
 * 2. Actually syncs tracking numbers and statuses from Maystro
 * 3. Verifies the fix worked correctly
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingSyncService } from '../services/shipping-sync.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testAndFixCorruptedOrders() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST AND FIX CORRUPTED ORDERS');
  console.log('🧪 ========================================\n');

  try {
    const syncService = new ShippingSyncService(redis);

    // STEP 1: Get last 1000 orders
    console.log('📊 STEP 1: Fetching last 1000 orders...');
    const orders = await prisma.order.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        trackingNumber: true,
        shippingStatus: true,
        shippingAccountId: true,
        storeIdentifier: true
      }
    });

    console.log(`✅ Found ${orders.length} orders\n`);

    // STEP 2: Identify corrupted orders (those with tracking 1762961157040242)
    const corruptedTracking = '1762961157040242';
    const corruptedOrders = orders.filter(o => o.trackingNumber === corruptedTracking);
    const ordersWithoutTracking = orders.filter(o => !o.trackingNumber);
    const ordersWithShippingAccount = orders.filter(o => o.shippingAccountId);

    console.log('📊 STEP 2: Analyzing orders...');
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Orders with shippingAccountId: ${ordersWithShippingAccount.length}`);
    console.log(`   Orders with corrupted tracking (${corruptedTracking}): ${corruptedOrders.length}`);
    console.log(`   Orders without tracking: ${ordersWithoutTracking.length}`);
    console.log(`   Orders needing sync: ${corruptedOrders.length + ordersWithoutTracking.length}\n`);

    if (corruptedOrders.length > 0) {
      console.log('⚠️  CORRUPTED ORDERS FOUND!');
      console.log(`   Sample corrupted orders (first 5):`);
      corruptedOrders.slice(0, 5).forEach(order => {
        console.log(`      - ${order.reference}: ${order.trackingNumber} (Status: ${order.shippingStatus})`);
      });
      console.log();
    }

    // STEP 3: Run the ACTUAL sync (not dry run!)
    console.log('📊 STEP 3: Running ACTUAL sync from Maystro API...');
    console.log('   This will fetch tracking numbers and statuses from Maystro\n');

    const startTime = Date.now();
    const syncResult = await syncService.syncMaystroTrackingNumbers(10000);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Sync completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Updated: ${syncResult.updated}`);
    console.log(`   Failed: ${syncResult.failed}`);
    console.log(`   Total: ${syncResult.total}\n`);

    // STEP 4: Verify the fix
    console.log('📊 STEP 4: Verifying the fix...');
    
    const ordersAfterSync = await prisma.order.findMany({
      where: {
        id: { in: orders.map(o => o.id) }
      },
      select: {
        id: true,
        reference: true,
        trackingNumber: true,
        shippingStatus: true
      }
    });

    const stillCorrupted = ordersAfterSync.filter(o => o.trackingNumber === corruptedTracking);
    const nowHaveTracking = ordersAfterSync.filter(o => 
      o.trackingNumber && o.trackingNumber !== corruptedTracking
    );
    const stillNoTracking = ordersAfterSync.filter(o => !o.trackingNumber);

    console.log('\n📊 AFTER SYNC:');
    console.log(`   Orders with correct tracking: ${nowHaveTracking.length}`);
    console.log(`   Orders still corrupted: ${stillCorrupted.length}`);
    console.log(`   Orders still without tracking: ${stillNoTracking.length}\n`);

    if (nowHaveTracking.length > 0) {
      console.log('✅ Sample fixed orders (first 5):');
      nowHaveTracking.slice(0, 5).forEach(order => {
        console.log(`   - ${order.reference}: ${order.trackingNumber} (${order.shippingStatus})`);
      });
      console.log();
    }

    if (stillCorrupted.length > 0) {
      console.log('⚠️  Orders still corrupted (first 5):');
      stillCorrupted.slice(0, 5).forEach(order => {
        console.log(`   - ${order.reference}: ${order.trackingNumber}`);
      });
      console.log();
    }

    // STEP 5: Summary
    console.log('\n📊 ========================================');
    console.log('📊 FINAL SUMMARY');
    console.log('📊 ========================================\n');

    const fixedCount = corruptedOrders.length - stillCorrupted.length;
    const successRate = corruptedOrders.length > 0 
      ? ((fixedCount / corruptedOrders.length) * 100).toFixed(1)
      : '0';

    console.log('✅ RESULTS:');
    console.log(`   Corrupted orders before: ${corruptedOrders.length}`);
    console.log(`   Corrupted orders after: ${stillCorrupted.length}`);
    console.log(`   Orders fixed: ${fixedCount}`);
    console.log(`   Success rate: ${successRate}%\n`);

    console.log('📊 TRACKING NUMBERS:');
    console.log(`   Orders with tracking before: ${orders.filter(o => o.trackingNumber).length}`);
    console.log(`   Orders with tracking after: ${nowHaveTracking.length}`);
    console.log(`   New tracking numbers added: ${nowHaveTracking.length - orders.filter(o => o.trackingNumber && o.trackingNumber !== corruptedTracking).length}\n`);

    if (stillCorrupted.length === 0 && stillNoTracking.length < ordersWithoutTracking.length) {
      console.log('✅ ========================================');
      console.log('✅ SUCCESS! The fix is working!');
      console.log('✅ All corrupted orders have been fixed!');
      console.log('✅ ========================================\n');
    } else if (stillCorrupted.length > 0) {
      console.log('⚠️  ========================================');
      console.log('⚠️  WARNING: Some orders still corrupted');
      console.log('⚠️  These orders may not exist in Maystro API');
      console.log('⚠️  ========================================\n');
    } else {
      console.log('ℹ️  ========================================');
      console.log('ℹ️  Sync completed but some orders still need tracking');
      console.log('ℹ️  This is normal for very new orders');
      console.log('ℹ️  ========================================\n');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run the test
testAndFixCorruptedOrders()
  .then(() => {
    console.log('✅ Test and fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });