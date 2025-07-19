import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix orders that have shippingStatus 'LIVRÉ' but status is not 'DELIVERED'
 * This script will update all such orders to have status 'DELIVERED'
 */
async function fixDeliveredOrdersStatus() {
  console.log('🚀 Starting fix for delivered orders status...\n');

  try {
    // Step 1: Find orders with shippingStatus 'LIVRÉ' but status != 'DELIVERED'
    console.log('🔍 Finding orders with shippingStatus LIVRÉ but status != DELIVERED...');
    
    const ordersToFix = await prisma.order.findMany({
      where: {
        shippingStatus: 'LIVRÉ',
        status: {
          not: 'DELIVERED'
        }
      },
      select: {
        id: true,
        reference: true,
        status: true,
        shippingStatus: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${ordersToFix.length} orders that need status update`);

    if (ordersToFix.length === 0) {
      console.log('✅ No orders need fixing. All orders with LIVRÉ shipping status already have DELIVERED status.');
      return;
    }

    // Step 2: Show sample of orders to be fixed
    console.log('\n📋 Sample orders to be fixed:');
    ordersToFix.slice(0, 10).forEach(order => {
      console.log(`   - ${order.reference}: ${order.status} → DELIVERED (created: ${order.createdAt.toISOString().split('T')[0]})`);
    });
    
    if (ordersToFix.length > 10) {
      console.log(`   ... and ${ordersToFix.length - 10} more orders`);
    }

    // Step 3: Update orders in batches
    console.log('\n🔄 Updating orders status to DELIVERED...');
    const BATCH_SIZE = 100;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ordersToFix.length; i += BATCH_SIZE) {
      const batch = ordersToFix.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ordersToFix.length / BATCH_SIZE)} (${batch.length} orders)...`);

      try {
        const result = await prisma.order.updateMany({
          where: {
            id: {
              in: batch.map(order => order.id)
            }
          },
          data: {
            status: 'DELIVERED',
            updatedAt: new Date()
          }
        });

        updatedCount += result.count;
        console.log(`✅ Updated ${result.count} orders in this batch`);
      } catch (error: any) {
        errorCount += batch.length;
        console.error(`❌ Error updating batch: ${error.message}`);
      }

      // Small delay between batches
      if (i + BATCH_SIZE < ordersToFix.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 4: Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const remainingOrders = await prisma.order.count({
      where: {
        shippingStatus: 'LIVRÉ',
        status: {
          not: 'DELIVERED'
        }
      }
    });

    const totalDeliveredByStatus = await prisma.order.count({
      where: {
        status: 'DELIVERED'
      }
    });

    const totalDeliveredByShipping = await prisma.order.count({
      where: {
        shippingStatus: 'LIVRÉ'
      }
    });

    console.log('\n📊 Final Results:');
    console.log(`   ✅ Orders updated: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   🔍 Remaining unfixed orders: ${remainingOrders}`);
    console.log(`   🎯 Total orders with status DELIVERED: ${totalDeliveredByStatus}`);
    console.log(`   🚚 Total orders with shippingStatus LIVRÉ: ${totalDeliveredByShipping}`);

    if (remainingOrders === 0) {
      console.log('\n🎉 SUCCESS! All orders with LIVRÉ shipping status now have DELIVERED status.');
      console.log('💡 The dashboard should now show the correct delivered orders count.');
    } else {
      console.log(`\n⚠️  WARNING: ${remainingOrders} orders still need fixing. Check the errors above.`);
    }

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixDeliveredOrdersStatus().catch(console.error);
}

export { fixDeliveredOrdersStatus };