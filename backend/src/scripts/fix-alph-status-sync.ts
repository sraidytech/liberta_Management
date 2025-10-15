import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * 🔧 FIX ALPH STATUS SYNC
 * 
 * This script manually syncs ALPH order statuses using the correct API key
 */
async function fixAlphStatusSync() {
  console.log('🔧 FIXING ALPH STATUS SYNC');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get ALPH API key
    const alphApiKey = process.env.MAYSTRO_API_KEY_1;
    if (!alphApiKey) {
      console.log('❌ MAYSTRO_API_KEY_1 not configured!');
      return;
    }

    console.log(`🔑 Using ALPH API Key: ${alphApiKey.substring(0, 10)}...`);
    console.log('');

    // Get all ALPH orders that need status update
    console.log('📋 Step 1: Get ALPH orders from database');
    const alphOrders = await prisma.order.findMany({
      where: {
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER'
      },
      select: {
        id: true,
        reference: true,
        shippingStatus: true,
        maystroOrderId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Process last 100 orders
    });

    console.log(`Found ${alphOrders.length} ALPH orders to check`);
    console.log('');

    // Status mapping
    const STATUS_MAPPING: { [key: number]: string } = {
      4: "CRÉÉ",
      5: "DEMANDE DE RAMASSAGE",
      6: "EN COURS",
      8: "EN ATTENTE DE TRANSIT",
      9: "EN TRANSIT POUR EXPÉDITION",
      10: "EN TRANSIT POUR RETOUR",
      11: "EN ATTENTE",
      12: "EN RUPTURE DE STOCK",
      15: "PRÊT À EXPÉDIER",
      22: "ASSIGNÉ",
      31: "EXPÉDIÉ",
      32: "ALERTÉ",
      41: "LIVRÉ",
      42: "REPORTÉ",
      50: "ANNULÉ",
      51: "PRÊT À RETOURNER",
      52: "PRIS PAR LE MAGASIN",
      53: "NON REÇU"
    };

    // Process each order
    console.log('📋 Step 2: Sync statuses from Maystro');
    console.log('-'.repeat(80));
    
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    let noChange = 0;

    for (const order of alphOrders) {
      try {
        // Fetch from Maystro using ALPH API key
        const response = await axios.get(
          `https://backend.maystro-delivery.com/api/stores/orders/?external_order_id=${order.reference}`,
          {
            headers: {
              'Authorization': `Token ${alphApiKey}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );

        const data: any = response.data;
        if (data.list && data.list.results && data.list.results.length > 0) {
          const maystroOrder = data.list.results[0];
          const newStatus = STATUS_MAPPING[maystroOrder.status] || `INCONNU (${maystroOrder.status})`;
          
          if (order.shippingStatus !== newStatus) {
            // Update database
            await prisma.order.update({
              where: { id: order.id },
              data: {
                shippingStatus: newStatus,
                maystroOrderId: maystroOrder.instance_uuid || maystroOrder.id,
                trackingNumber: maystroOrder.tracking_number || maystroOrder.display_id,
                updatedAt: new Date()
              }
            });
            
            console.log(`✅ ${order.reference}: ${order.shippingStatus || 'NULL'} → ${newStatus}`);
            updated++;
          } else {
            noChange++;
          }
        } else {
          console.log(`⚠️  ${order.reference}: Not found in Maystro`);
          notFound++;
        }
      } catch (error: any) {
        console.log(`❌ ${order.reference}: ERROR - ${error.message}`);
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updated}`);
    console.log(`➖ No change needed: ${noChange}`);
    console.log(`⚠️  Not found: ${notFound}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total processed: ${alphOrders.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixAlphStatusSync();