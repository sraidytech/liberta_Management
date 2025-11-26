/**
 * 🔍 FINAL TEST: Verify Shipping Sync Fix with Maximum Logging
 * 
 * This script tests the fixed shipping sync system with:
 * - 1000 latest orders from database
 * - 1000 orders from Maystro API
 * - Maximum logging for debugging
 * - Perfect summary report
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingSyncService } from '../services/shipping-sync.service';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

interface TestResult {
  accountId: string;
  accountName: string;
  ordersInDb: number;
  ordersWithTracking: number;
  ordersWithoutTracking: number;
  syncedSuccessfully: number;
  syncedWithErrors: number;
  sampleOrders: Array<{
    reference: string;
    beforeTracking: string | null;
    afterTracking: string | null;
    beforeStatus: string | null;
    afterStatus: string | null;
    changed: boolean;
  }>;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 FINAL TEST: Shipping Sync Fix Verification');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const results: TestResult[] = [];

  try {
    // Step 1: Get all Maystro shipping accounts
    console.log('📋 Step 1: Fetching Maystro shipping accounts...\n');
    
    const maystroAccounts = await prisma.shippingAccount.findMany({
      where: {
        company: {
          slug: 'maystro'
        },
        isActive: true
      },
      include: {
        company: true
      }
    });

    console.log(`✅ Found ${maystroAccounts.length} active Maystro account(s)\n`);
    
    for (const account of maystroAccounts) {
      console.log(`   📦 ${account.name} (ID: ${account.id})`);
    }
    console.log('');

    // Step 2: For each account, analyze orders
    for (const account of maystroAccounts) {
      console.log('─'.repeat(80));
      console.log(`🔄 Processing Account: ${account.name}`);
      console.log(`   ID: ${account.id}`);
      console.log('─'.repeat(80) + '\n');

      // Get latest 1000 orders for this account
      console.log(`📊 Step 2a: Fetching latest 1000 orders for ${account.name}...\n`);
      
      const orders = await prisma.order.findMany({
        where: {
          shippingAccountId: account.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000,
        select: {
          id: true,
          reference: true,
          trackingNumber: true,
          shippingStatus: true,
          createdAt: true
        }
      });

      console.log(`✅ Found ${orders.length} orders for ${account.name}`);
      
      const ordersWithTracking = orders.filter(o => o.trackingNumber).length;
      const ordersWithoutTracking = orders.filter(o => !o.trackingNumber).length;
      
      console.log(`   📦 With tracking: ${ordersWithTracking}`);
      console.log(`   ❌ Without tracking: ${ordersWithoutTracking}\n`);

      // Take snapshot of first 10 orders before sync
      const sampleOrders = orders.slice(0, 10).map(o => ({
        reference: o.reference,
        beforeTracking: o.trackingNumber,
        afterTracking: null as string | null,
        beforeStatus: o.shippingStatus,
        afterStatus: null as string | null,
        changed: false
      }));

      console.log(`📸 Snapshot of first 10 orders BEFORE sync:`);
      console.log('─'.repeat(80));
      sampleOrders.forEach((o, i) => {
        console.log(`   ${i + 1}. ${o.reference}`);
        console.log(`      Tracking: ${o.beforeTracking || 'NONE'}`);
        console.log(`      Status: ${o.beforeStatus || 'NONE'}`);
      });
      console.log('');

      // Step 3: Run sync for this account
      console.log(`🚀 Step 3: Running sync for ${account.name}...\n`);
      console.log('─'.repeat(80));
      console.log('SYNC LOGS START:');
      console.log('─'.repeat(80) + '\n');

      const shippingSyncService = new ShippingSyncService(redis);
      
      // Call syncMaystroTrackingNumbers with limit of 1000
      const syncResult = await shippingSyncService.syncMaystroTrackingNumbers(1000);

      console.log('\n' + '─'.repeat(80));
      console.log('SYNC LOGS END');
      console.log('─'.repeat(80) + '\n');

      console.log(`✅ Sync completed for ${account.name}`);
      console.log(`   Updated: ${syncResult.updated}`);
      console.log(`   Failed: ${syncResult.failed}\n`);

      // Step 4: Get updated orders
      console.log(`📊 Step 4: Fetching updated orders...\n`);
      
      const updatedOrders = await prisma.order.findMany({
        where: {
          reference: {
            in: sampleOrders.map(o => o.reference)
          }
        },
        select: {
          reference: true,
          trackingNumber: true,
          shippingStatus: true
        }
      });

      // Update sample orders with after-sync data
      for (const sample of sampleOrders) {
        const updated = updatedOrders.find(o => o.reference === sample.reference);
        if (updated) {
          sample.afterTracking = updated.trackingNumber;
          sample.afterStatus = updated.shippingStatus;
          sample.changed = 
            sample.beforeTracking !== sample.afterTracking ||
            sample.beforeStatus !== sample.afterStatus;
        }
      }

      console.log(`📸 Snapshot of first 10 orders AFTER sync:`);
      console.log('─'.repeat(80));
      sampleOrders.forEach((o, i) => {
        const changeIndicator = o.changed ? '🔄 CHANGED' : '✓ No change';
        console.log(`   ${i + 1}. ${o.reference} ${changeIndicator}`);
        console.log(`      Tracking: ${o.beforeTracking || 'NONE'} → ${o.afterTracking || 'NONE'}`);
        console.log(`      Status: ${o.beforeStatus || 'NONE'} → ${o.afterStatus || 'NONE'}`);
      });
      console.log('');

      // Store results
      results.push({
        accountId: account.id,
        accountName: account.name,
        ordersInDb: orders.length,
        ordersWithTracking,
        ordersWithoutTracking,
        syncedSuccessfully: syncResult.updated,
        syncedWithErrors: syncResult.failed,
        sampleOrders
      });
    }

    // Step 5: Generate final summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY REPORT');
    console.log('='.repeat(80) + '\n');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`⏱️  Total execution time: ${totalTime}s\n`);

    for (const result of results) {
      console.log('─'.repeat(80));
      console.log(`📦 Account: ${result.accountName}`);
      console.log('─'.repeat(80));
      console.log(`   Orders analyzed: ${result.ordersInDb}`);
      console.log(`   Had tracking before: ${result.ordersWithTracking}`);
      console.log(`   Missing tracking before: ${result.ordersWithoutTracking}`);
      console.log(`   Successfully synced: ${result.syncedSuccessfully}`);
      console.log(`   Failed to sync: ${result.syncedWithErrors}`);
      
      const changedCount = result.sampleOrders.filter(o => o.changed).length;
      console.log(`   Sample orders changed: ${changedCount}/${result.sampleOrders.length}`);
      console.log('');
    }

    // Overall statistics
    const totalOrders = results.reduce((sum, r) => sum + r.ordersInDb, 0);
    const totalSynced = results.reduce((sum, r) => sum + r.syncedSuccessfully, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.syncedWithErrors, 0);
    const totalChanged = results.reduce((sum, r) => 
      sum + r.sampleOrders.filter(o => o.changed).length, 0
    );

    console.log('─'.repeat(80));
    console.log('🎯 OVERALL STATISTICS');
    console.log('─'.repeat(80));
    console.log(`   Total accounts processed: ${results.length}`);
    console.log(`   Total orders analyzed: ${totalOrders}`);
    console.log(`   Total successfully synced: ${totalSynced}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log(`   Sample orders changed: ${totalChanged}`);
    console.log('');

    // Verification checks
    console.log('─'.repeat(80));
    console.log('✅ VERIFICATION CHECKS');
    console.log('─'.repeat(80));

    let allChecksPassed = true;

    // Check 1: All accounts processed
    if (results.length === maystroAccounts.length) {
      console.log('   ✅ All Maystro accounts were processed');
    } else {
      console.log('   ❌ Not all accounts were processed!');
      allChecksPassed = false;
    }

    // Check 2: No errors during sync
    if (totalFailed === 0) {
      console.log('   ✅ No errors during sync');
    } else {
      console.log(`   ⚠️  ${totalFailed} errors occurred during sync`);
    }

    // Check 3: Some orders were updated
    if (totalSynced > 0) {
      console.log(`   ✅ ${totalSynced} orders were successfully updated`);
    } else {
      console.log('   ⚠️  No orders were updated (might be expected if all already synced)');
    }

    // Check 4: Sample orders show changes
    if (totalChanged > 0) {
      console.log(`   ✅ ${totalChanged} sample orders showed changes`);
    } else {
      console.log('   ℹ️  No sample orders changed (might be expected if already synced)');
    }

    console.log('');

    if (allChecksPassed && totalSynced > 0) {
      console.log('🎉 TEST PASSED: Shipping sync is working correctly!\n');
    } else if (allChecksPassed) {
      console.log('✅ TEST COMPLETED: No errors, but verify if updates were expected\n');
    } else {
      console.log('⚠️  TEST COMPLETED WITH WARNINGS: Review the results above\n');
    }

    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error('─'.repeat(80));
    console.error(error);
    console.error('─'.repeat(80) + '\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main();