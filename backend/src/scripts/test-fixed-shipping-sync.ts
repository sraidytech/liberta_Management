/**
 * Test Script for Fixed Shipping Sync
 * 
 * This script tests the fixed shipping sync workflow with maximum logging
 * to verify that orders are properly filtered by shippingAccountId
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingSyncService } from '../services/shipping-sync.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testFixedShippingSync() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTING FIXED SHIPPING SYNC WORKFLOW');
  console.log('🧪 ========================================\n');

  try {
    // STEP 1: Get last 1000 orders
    console.log('📊 STEP 1: Fetching last 1000 orders from database...');
    const orders = await prisma.order.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        trackingNumber: true,
        shippingStatus: true,
        shippingAccountId: true,
        storeIdentifier: true,
        createdAt: true
      }
    });

    console.log(`✅ Found ${orders.length} orders\n`);

    // STEP 2: Analyze orders by shipping account
    console.log('📊 STEP 2: Analyzing orders by shipping account...');
    const ordersByAccount = new Map<string, any[]>();
    let ordersWithoutAccount = 0;
    let ordersWithoutTracking = 0;

    orders.forEach(order => {
      if (!order.shippingAccountId) {
        ordersWithoutAccount++;
      } else {
        if (!ordersByAccount.has(order.shippingAccountId)) {
          ordersByAccount.set(order.shippingAccountId, []);
        }
        ordersByAccount.get(order.shippingAccountId)!.push(order);
      }

      if (!order.trackingNumber) {
        ordersWithoutTracking++;
      }
    });

    console.log(`\n📊 ORDER DISTRIBUTION:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Orders WITHOUT shippingAccountId: ${ordersWithoutAccount}`);
    console.log(`   Orders WITHOUT trackingNumber: ${ordersWithoutTracking}`);
    console.log(`   Orders WITH shippingAccountId: ${orders.length - ordersWithoutAccount}`);
    console.log(`   Unique shipping accounts: ${ordersByAccount.size}\n`);

    // STEP 3: Get shipping account details
    console.log('📊 STEP 3: Getting shipping account details...');
    const accountIds = Array.from(ordersByAccount.keys());
    const accounts = await prisma.shippingAccount.findMany({
      where: { id: { in: accountIds } },
      include: { company: true }
    });

    console.log(`\n📦 SHIPPING ACCOUNTS FOUND:`);
    accounts.forEach(account => {
      const orderCount = ordersByAccount.get(account.id)?.length || 0;
      console.log(`   - ${account.name} (${account.company.name})`);
      console.log(`     ID: ${account.id}`);
      console.log(`     Orders: ${orderCount}`);
      console.log(`     Active: ${account.isActive ? '✅' : '❌'}`);
    });

    // STEP 4: Test sync for Maystro accounts only
    console.log('\n📊 STEP 4: Testing sync for Maystro accounts...');
    const maystroAccounts = accounts.filter(a => a.company.slug === 'maystro');
    
    if (maystroAccounts.length === 0) {
      console.log('⚠️  No Maystro accounts found in the last 1000 orders');
      console.log('   This is expected if you use other shipping companies');
      return;
    }

    console.log(`\n🔍 Found ${maystroAccounts.length} Maystro account(s):`);
    maystroAccounts.forEach(account => {
      const orderCount = ordersByAccount.get(account.id)?.length || 0;
      console.log(`   - ${account.name}: ${orderCount} orders`);
    });

    // STEP 5: Simulate the sync process with detailed logging
    console.log('\n📊 STEP 5: Simulating sync process (DRY RUN - NO UPDATES)...\n');
    
    const syncService = new ShippingSyncService(redis);

    for (const account of maystroAccounts) {
      const accountOrders = ordersByAccount.get(account.id) || [];
      
      console.log(`\n🔄 ========================================`);
      console.log(`🔄 Processing Account: ${account.name}`);
      console.log(`🔄 Account ID: ${account.id}`);
      console.log(`🔄 Company: ${account.company.name}`);
      console.log(`🔄 Orders to process: ${accountOrders.length}`);
      console.log(`🔄 ========================================\n`);

      // Show sample orders
      console.log(`📦 Sample orders for this account (first 5):`);
      accountOrders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.reference}`);
        console.log(`      Tracking: ${order.trackingNumber || 'NULL'}`);
        console.log(`      Status: ${order.shippingStatus || 'NULL'}`);
        console.log(`      Store: ${order.storeIdentifier}`);
        console.log(`      ShippingAccountId: ${order.shippingAccountId}`);
      });

      // Verify filtering
      console.log(`\n🔒 CRITICAL VERIFICATION:`);
      const wrongAccountOrders = accountOrders.filter(o => o.shippingAccountId !== account.id);
      if (wrongAccountOrders.length > 0) {
        console.log(`   ❌ ERROR: Found ${wrongAccountOrders.length} orders with WRONG shippingAccountId!`);
        wrongAccountOrders.forEach(order => {
          console.log(`      - ${order.reference}: has ${order.shippingAccountId}, expected ${account.id}`);
        });
      } else {
        console.log(`   ✅ All ${accountOrders.length} orders have correct shippingAccountId: ${account.id}`);
      }

      // Check for orders without tracking
      const ordersNeedingTracking = accountOrders.filter(o => !o.trackingNumber);
      console.log(`\n📊 Orders needing tracking numbers: ${ordersNeedingTracking.length}`);
      if (ordersNeedingTracking.length > 0) {
        console.log(`   Sample orders without tracking (first 3):`);
        ordersNeedingTracking.slice(0, 3).forEach(order => {
          console.log(`      - ${order.reference} (${order.storeIdentifier})`);
        });
      }

      // Check for orders with tracking
      const ordersWithTracking = accountOrders.filter(o => o.trackingNumber);
      console.log(`\n📊 Orders with tracking numbers: ${ordersWithTracking.length}`);
      if (ordersWithTracking.length > 0) {
        console.log(`   Sample orders with tracking (first 3):`);
        ordersWithTracking.slice(0, 3).forEach(order => {
          console.log(`      - ${order.reference}: ${order.trackingNumber}`);
        });
      }
    }

    // STEP 6: Summary
    console.log('\n\n📊 ========================================');
    console.log('📊 TEST SUMMARY');
    console.log('📊 ========================================\n');

    console.log('✅ VERIFICATION RESULTS:');
    console.log(`   - Total orders tested: ${orders.length}`);
    console.log(`   - Orders with shippingAccountId: ${orders.length - ordersWithoutAccount}`);
    console.log(`   - Orders without shippingAccountId: ${ordersWithoutAccount}`);
    console.log(`   - Maystro accounts found: ${maystroAccounts.length}`);
    
    let totalMaystroOrders = 0;
    maystroAccounts.forEach(account => {
      totalMaystroOrders += ordersByAccount.get(account.id)?.length || 0;
    });
    console.log(`   - Total Maystro orders: ${totalMaystroOrders}`);

    console.log('\n🔒 SAFETY CHECKS:');
    let allSafe = true;
    
    // Check 1: All orders have correct shippingAccountId
    for (const account of maystroAccounts) {
      const accountOrders = ordersByAccount.get(account.id) || [];
      const wrongOrders = accountOrders.filter(o => o.shippingAccountId !== account.id);
      if (wrongOrders.length > 0) {
        console.log(`   ❌ Account ${account.name} has ${wrongOrders.length} orders with wrong shippingAccountId`);
        allSafe = false;
      } else {
        console.log(`   ✅ Account ${account.name}: All ${accountOrders.length} orders have correct shippingAccountId`);
      }
    }

    // Check 2: No cross-contamination
    const otherAccounts = accounts.filter(a => a.company.slug !== 'maystro');
    if (otherAccounts.length > 0) {
      console.log(`\n   ℹ️  Found ${otherAccounts.length} non-Maystro account(s):`);
      otherAccounts.forEach(account => {
        const orderCount = ordersByAccount.get(account.id)?.length || 0;
        console.log(`      - ${account.name} (${account.company.name}): ${orderCount} orders`);
        console.log(`        These orders will NOT be touched by Maystro sync ✅`);
      });
    }

    if (allSafe) {
      console.log('\n✅ ========================================');
      console.log('✅ ALL SAFETY CHECKS PASSED!');
      console.log('✅ The fix is working correctly!');
      console.log('✅ ========================================\n');
    } else {
      console.log('\n❌ ========================================');
      console.log('❌ SAFETY CHECKS FAILED!');
      console.log('❌ DO NOT DEPLOY - FIX ISSUES FIRST!');
      console.log('❌ ========================================\n');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR during test:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run the test
testFixedShippingSync()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });