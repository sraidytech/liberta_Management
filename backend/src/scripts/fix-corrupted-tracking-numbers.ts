/**
 * 🔧 FIX CORRUPTED TRACKING NUMBERS - OPTIMIZED VERSION
 *
 * This script fixes all orders that have the corrupted tracking number 1762961157040242
 * by fetching the correct tracking numbers from Maystro API using BULK sync.
 *
 * OPTIMIZED: Uses the fast bulk sync method instead of individual order syncs.
 * Processes up to 50,000 orders with proper shippingAccountId filtering.
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingProviderFactory } from '../services/shipping/shipping-provider-factory';

const prisma = new PrismaClient();

// Use Redis URL from environment (works in Docker and local)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 2000);
  }
});

const CORRUPTED_TRACKING_NUMBER = '1762961157040242';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 FIXING CORRUPTED TRACKING NUMBERS');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    // Step 1: Find all corrupted orders
    console.log(`🔍 Step 1: Finding orders with corrupted tracking number ${CORRUPTED_TRACKING_NUMBER}...\n`);
    
    const corruptedOrders = await prisma.order.findMany({
      where: {
        trackingNumber: CORRUPTED_TRACKING_NUMBER
      },
      select: {
        id: true,
        reference: true,
        trackingNumber: true,
        shippingStatus: true,
        shippingAccountId: true,
        shippingAccount: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                slug: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50000
    });

    console.log(`📊 Found ${corruptedOrders.length} corrupted orders\n`);

    if (corruptedOrders.length === 0) {
      console.log('✅ No corrupted orders found! All tracking numbers are correct.\n');
      return;
    }

    // Step 2: Group by shipping account
    const ordersByAccount = new Map<string, typeof corruptedOrders>();
    
    corruptedOrders.forEach(order => {
      if (order.shippingAccountId) {
        if (!ordersByAccount.has(order.shippingAccountId)) {
          ordersByAccount.set(order.shippingAccountId, []);
        }
        ordersByAccount.get(order.shippingAccountId)!.push(order);
      } else {
        console.warn(`⚠️  Order ${order.reference} has no shippingAccountId - skipping`);
      }
    });

    console.log(`📦 Orders grouped by ${ordersByAccount.size} shipping account(s):\n`);
    ordersByAccount.forEach((orders, accountId) => {
      const accountName = orders[0].shippingAccount?.name || 'Unknown';
      console.log(`   - ${accountName}: ${orders.length} orders`);
    });
    console.log('');

    // Step 3: Fix orders for each account using FAST BULK SYNC
    let totalFixed = 0;
    let totalFailed = 0;

    for (const [accountId, orders] of ordersByAccount.entries()) {
      const accountName = orders[0].shippingAccount?.name || accountId;
      const companySlug = orders[0].shippingAccount?.company.slug;
      const account = orders[0].shippingAccount;

      console.log('─'.repeat(80));
      console.log(`🔄 Processing ${accountName} (${orders.length} orders)`);
      console.log('─'.repeat(80) + '\n');

      if (companySlug !== 'maystro') {
        console.log(`⚠️  Skipping ${accountName} - not a Maystro account\n`);
        continue;
      }

      if (!account) {
        console.log(`❌ No shipping account data - skipping\n`);
        continue;
      }

      try {
        // Get the full shipping account with credentials
        const fullAccount = await prisma.shippingAccount.findUnique({
          where: { id: accountId },
          include: { company: true }
        });

        if (!fullAccount) {
          console.log(`❌ Shipping account not found - skipping\n`);
          continue;
        }

        // Create Maystro provider for this account
        console.log(`🔑 Creating Maystro provider for ${accountName}...\n`);
        const provider = ShippingProviderFactory.createProvider(
          fullAccount.company.slug,
          fullAccount.credentials as any,
          redis,
          fullAccount.baseUrl || undefined
        );

        // Use the FAST bulk sync method with order references
        console.log(`🚀 Running FAST bulk sync for ${orders.length} orders...\n`);
        const orderReferences = orders.map(o => o.reference);
        
        // Call syncTrackingNumbers with the order references
        if ('syncTrackingNumbers' in provider && typeof (provider as any).syncTrackingNumbers === 'function') {
          const result = await (provider as any).syncTrackingNumbers(
            undefined, // storeIdentifier
            orders.length, // maxOrders
            accountId // shippingAccountId
          );

          totalFixed += result.updated;
          totalFailed += result.errors;

          console.log(`\n✅ ${accountName} complete:`);
          console.log(`   Updated: ${result.updated}`);
          console.log(`   Errors: ${result.errors}\n`);

          // Show sample of fixed orders
          if (result.details && result.details.length > 0) {
            console.log(`📋 Sample of fixed orders (first 10):`);
            result.details.slice(0, 10).forEach((detail: any, i: number) => {
              console.log(`   ${i + 1}. ${detail.reference}: ${detail.status}`);
            });
            console.log('');
          }
        } else {
          console.log(`❌ Provider does not support bulk sync\n`);
          totalFailed += orders.length;
        }

      } catch (error: any) {
        console.error(`❌ Error processing ${accountName}:`, error.message);
        totalFailed += orders.length;
      }
    }

    // Step 4: Verify fix
    console.log('─'.repeat(80));
    console.log('🔍 Step 4: Verifying fix...\n');

    const remainingCorrupted = await prisma.order.count({
      where: {
        trackingNumber: CORRUPTED_TRACKING_NUMBER
      }
    });

    console.log(`📊 Remaining corrupted orders: ${remainingCorrupted}\n`);

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Total corrupted found: ${corruptedOrders.length}`);
    console.log(`   Successfully fixed: ${totalFixed}`);
    console.log(`   Failed to fix: ${totalFailed}`);
    console.log(`   Remaining corrupted: ${remainingCorrupted}`);
    console.log(`   Execution time: ${duration}s`);
    console.log('');

    if (remainingCorrupted === 0) {
      console.log('🎉 SUCCESS! All corrupted tracking numbers have been fixed!\n');
    } else {
      console.log(`⚠️  ${remainingCorrupted} orders still have corrupted tracking numbers.\n`);
      console.log('   These may be orders without shipping accounts or failed API lookups.\n');
    }

    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ SCRIPT FAILED:');
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