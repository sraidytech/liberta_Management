/**
 * Migration Script: Assign Shipping Accounts to Existing Orders
 * 
 * This script updates all existing orders to inherit the shippingAccountId
 * from their store's configuration.
 * 
 * Run: npx ts-node src/scripts/migrate-orders-shipping-accounts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOrdersShippingAccounts() {
  console.log('🔄 Starting migration: Assign shipping accounts to existing orders\n');

  try {
    // Step 1: Get all stores with shipping accounts
    const storesWithShipping = await prisma.apiConfiguration.findMany({
      where: {
        shippingAccountId: { not: null }
      },
      select: {
        id: true,
        storeName: true,
        storeIdentifier: true,
        shippingAccountId: true,
        shippingAccount: {
          include: {
            company: true
          }
        }
      }
    });

    console.log(`📊 Found ${storesWithShipping.length} stores with shipping accounts:\n`);
    storesWithShipping.forEach(store => {
      console.log(`   - ${store.storeName} (${store.storeIdentifier})`);
      console.log(`     → ${store.shippingAccount?.name} (${store.shippingAccount?.company.name})\n`);
    });

    if (storesWithShipping.length === 0) {
      console.log('⚠️  No stores have shipping accounts linked.');
      console.log('   Please link stores to shipping accounts first in Admin > Stores\n');
      return;
    }

    // Step 2: Update orders for each store
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const store of storesWithShipping) {
      console.log(`\n🔄 Processing orders for: ${store.storeName}`);
      
      // Count orders that need updating
      const ordersToUpdate = await prisma.order.count({
        where: {
          storeIdentifier: store.storeIdentifier,
          shippingAccountId: null
        }
      });

      if (ordersToUpdate === 0) {
        console.log(`   ✅ All orders already have shipping accounts assigned`);
        continue;
      }

      console.log(`   📦 Found ${ordersToUpdate} orders to update`);

      // Update orders
      const result = await prisma.order.updateMany({
        where: {
          storeIdentifier: store.storeIdentifier,
          shippingAccountId: null
        },
        data: {
          shippingAccountId: store.shippingAccountId
        }
      });

      console.log(`   ✅ Updated ${result.count} orders`);
      totalUpdated += result.count;

      // Count orders that already had shipping accounts
      const alreadyAssigned = await prisma.order.count({
        where: {
          storeIdentifier: store.storeIdentifier,
          shippingAccountId: { not: null }
        }
      });

      if (alreadyAssigned > result.count) {
        const skipped = alreadyAssigned - result.count;
        console.log(`   ⏭️  Skipped ${skipped} orders (already had shipping accounts)`);
        totalSkipped += skipped;
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total orders updated: ${totalUpdated}`);
    console.log(`⏭️  Total orders skipped: ${totalSkipped}`);
    console.log(`📦 Total stores processed: ${storesWithShipping.length}`);

    // Step 4: Verification
    console.log('\n🔍 VERIFICATION:\n');
    
    const ordersWithShipping = await prisma.order.count({
      where: {
        shippingAccountId: { not: null }
      }
    });

    const ordersWithoutShipping = await prisma.order.count({
      where: {
        shippingAccountId: null
      }
    });

    const ordersWithTracking = await prisma.order.count({
      where: {
        trackingNumber: { not: null }
      }
    });

    const ordersReadyToSync = await prisma.order.count({
      where: {
        shippingAccountId: { not: null },
        trackingNumber: { not: null },
        shippingStatus: { not: 'LIVRÉ' }
      }
    });

    console.log(`📊 Orders with shipping account: ${ordersWithShipping}`);
    console.log(`⚠️  Orders without shipping account: ${ordersWithoutShipping}`);
    console.log(`📦 Orders with tracking number: ${ordersWithTracking}`);
    console.log(`✅ Orders ready to sync: ${ordersReadyToSync}`);

    if (ordersWithoutShipping > 0) {
      console.log('\n⚠️  WARNING: Some orders still don\'t have shipping accounts.');
      console.log('   These orders are from stores that don\'t have shipping accounts linked.');
      console.log('   Link those stores to shipping accounts in Admin > Stores\n');
      
      // Show which stores have orders without shipping accounts
      const storesWithoutShipping = await prisma.order.groupBy({
        by: ['storeIdentifier'],
        where: {
          shippingAccountId: null
        },
        _count: true
      });

      if (storesWithoutShipping.length > 0) {
        console.log('   Stores with unlinked orders:');
        for (const group of storesWithoutShipping) {
          if (group.storeIdentifier) {
            const store = await prisma.apiConfiguration.findFirst({
              where: { storeIdentifier: group.storeIdentifier }
            });
            console.log(`   - ${store?.storeName || group.storeIdentifier}: ${group._count} orders`);
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateOrdersShippingAccounts()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });