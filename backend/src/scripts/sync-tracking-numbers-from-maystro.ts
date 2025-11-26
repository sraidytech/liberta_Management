/**
 * Sync Tracking Numbers from Maystro
 * 
 * This script fetches orders from Maystro API and updates our database with:
 * - tracking_number (from Maystro's tracking_number field)
 * - shippingStatus (from Maystro's status code)
 * 
 * This is the MISSING PIECE - the new system only syncs orders that already have
 * tracking numbers, but this script GETS the tracking numbers from Maystro first!
 * 
 * Run: npx ts-node src/scripts/sync-tracking-numbers-from-maystro.ts
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { MaystroService } from '../services/maystro.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function syncTrackingNumbers() {
  console.log('🔄 Starting tracking number sync from Maystro...\n');

  try {
    // Step 1: Get Maystro configuration
    const maystroConfig = {
      id: 'primary',
      name: 'Primary Maystro API',
      apiKey: process.env.MAYSTRO_API_KEY || process.env.MAYSTRO_API_KEY_1 || '',
      baseUrl: process.env.MAYSTRO_BASE_URL || 'https://backend.maystro-delivery.com',
      isPrimary: true
    };

    if (!maystroConfig.apiKey) {
      throw new Error('MAYSTRO_API_KEY not found in environment variables');
    }

    const maystroService = new MaystroService(maystroConfig, redis);

    // Step 2: Fetch orders from Maystro API
    console.log('📡 Fetching orders from Maystro API...');
    const maystroOrders = await maystroService.fetchAllOrders(15000); // Fetch 10,000 orders
    console.log(`✅ Fetched ${maystroOrders.length} orders from Maystro\n`);

    // Step 3: Create lookup map by reference (external_order_id)
    const orderMap = new Map(
      maystroOrders.map(order => [order.external_order_id, order])
    );

    // Step 4: Get orders from database that need tracking numbers
    console.log('📦 Getting orders from database...');
    const dbOrders = await prisma.order.findMany({
      where: {
        shippingAccountId: { not: null }, // Only orders with shipping accounts
        OR: [
          { trackingNumber: null }, // Orders without tracking numbers
          { shippingStatus: null }, // Orders without status
          { shippingStatus: '' }    // Orders with empty status
        ]
      },
      take: 50000, // Process up to 50,000 orders
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        trackingNumber: true,
        shippingStatus: true,
        shippingAccountId: true
      }
    });

    console.log(`✅ Found ${dbOrders.length} orders in database that need updates\n`);

    // Step 5: Match and update
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    console.log('🔄 Matching and updating orders...\n');

    for (const dbOrder of dbOrders) {
      const maystroOrder = orderMap.get(dbOrder.reference);

      if (!maystroOrder) {
        notFound++;
        continue;
      }

      // Check if we need to update
      const needsTrackingNumber = !dbOrder.trackingNumber && maystroOrder.tracking_number;
      const needsStatus = !dbOrder.shippingStatus && maystroOrder.status;

      if (!needsTrackingNumber && !needsStatus) {
        skipped++;
        continue;
      }

      // Update order
      try {
        const updateData: any = {};

        if (needsTrackingNumber && maystroOrder.tracking_number) {
          updateData.trackingNumber = maystroOrder.tracking_number;
        }

        if (needsStatus && maystroOrder.status) {
          updateData.shippingStatus = maystroService.mapStatus(maystroOrder.status);
        }

        // Also update maystroOrderId if available
        if (maystroOrder.instance_uuid) {
          updateData.maystroOrderId = maystroOrder.instance_uuid;
        }

        await prisma.order.update({
          where: { id: dbOrder.id },
          data: updateData
        });

        updated++;

        if (updated % 100 === 0) {
          console.log(`   ✅ Updated ${updated} orders...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to update order ${dbOrder.reference}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updated} orders`);
    console.log(`⏭️  Skipped: ${skipped} orders (already have tracking + status)`);
    console.log(`❌ Not Found: ${notFound} orders (not in Maystro API)`);
    console.log(`📦 Total Processed: ${dbOrders.length} orders`);
    console.log(`📡 Maystro Orders Fetched: ${maystroOrders.length} orders\n`);

    // Step 6: Verification
    console.log('🔍 VERIFICATION:\n');

    const ordersWithTracking = await prisma.order.count({
      where: {
        trackingNumber: { not: null },
        shippingAccountId: { not: null }
      }
    });

    const ordersWithoutTracking = await prisma.order.count({
      where: {
        trackingNumber: null,
        shippingAccountId: { not: null }
      }
    });

    const ordersReadyToSync = await prisma.order.count({
      where: {
        trackingNumber: { not: null },
        shippingAccountId: { not: null },
        shippingStatus: { not: 'LIVRÉ' }
      }
    });

    console.log(`📊 Orders with tracking number: ${ordersWithTracking}`);
    console.log(`⚠️  Orders without tracking number: ${ordersWithoutTracking}`);
    console.log(`✅ Orders ready to sync status: ${ordersReadyToSync}\n`);

    console.log('✅ Tracking number sync completed!\n');

  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run sync
syncTrackingNumbers()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });