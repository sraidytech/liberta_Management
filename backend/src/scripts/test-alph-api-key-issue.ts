import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔍 TEST ALPH API KEY ISSUE
 * 
 * This script tests if ALPH orders can be found using both API keys
 * to confirm which API key actually has the ALPH orders
 */
async function testAlphApiKeyIssue() {
  console.log('🔍 TESTING ALPH API KEY ISSUE');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get ALPH orders from database
    console.log('📋 Step 1: Get ALPH orders from database');
    const alphOrders = await prisma.order.findMany({
      where: {
        storeIdentifier: 'ALPH',
        source: 'ECOMANAGER'
      },
      select: {
        reference: true,
        shippingStatus: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`Found ${alphOrders.length} ALPH orders in database:`);
    alphOrders.forEach((order, i) => {
      console.log(`  ${i + 1}. ${order.reference} - Status: ${order.shippingStatus || 'Not set'}`);
    });
    console.log('');

    if (alphOrders.length === 0) {
      console.log('❌ No ALPH orders found in database!');
      return;
    }

    // Test with primary API key
    console.log('📋 Step 2: Test with PRIMARY API KEY');
    console.log('-'.repeat(80));
    const primaryApiKey = process.env.MAYSTRO_API_KEY;
    console.log(`API Key: ${primaryApiKey?.substring(0, 10)}...`);
    console.log('');

    for (const order of alphOrders.slice(0, 3)) {
      try {
        const response = await axios.get(
          `https://backend.maystro-delivery.com/api/stores/orders/?external_order_id=${order.reference}`,
          {
            headers: {
              'Authorization': `Token ${primaryApiKey}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );

        const data: any = response.data;
        if (data.list && data.list.results && data.list.results.length > 0) {
          const maystroOrder = data.list.results[0];
          console.log(`✅ ${order.reference} FOUND in PRIMARY API`);
          console.log(`   Maystro Status: ${maystroOrder.status}`);
        } else {
          console.log(`❌ ${order.reference} NOT FOUND in PRIMARY API`);
        }
      } catch (error: any) {
        console.log(`❌ ${order.reference} ERROR in PRIMARY API: ${error.message}`);
      }
    }

    console.log('');

    // Test with secondary API key (ALPH)
    console.log('📋 Step 3: Test with SECONDARY API KEY (ALPH)');
    console.log('-'.repeat(80));
    const alphApiKey = process.env.MAYSTRO_API_KEY_1;
    console.log(`API Key: ${alphApiKey?.substring(0, 10)}...`);
    console.log('');

    if (!alphApiKey) {
      console.log('❌ MAYSTRO_API_KEY_1 not configured!');
      return;
    }

    for (const order of alphOrders.slice(0, 3)) {
      try {
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
          console.log(`✅ ${order.reference} FOUND in ALPH API`);
          console.log(`   Maystro Status Code: ${maystroOrder.status}`);
          console.log(`   Maystro Status Name: ${getStatusName(maystroOrder.status)}`);
          console.log(`   Database Status: ${order.shippingStatus || 'Not set'}`);
          console.log(`   Match: ${order.shippingStatus === getStatusName(maystroOrder.status) ? '✅ YES' : '❌ NO - NEEDS UPDATE!'}`);
        } else {
          console.log(`❌ ${order.reference} NOT FOUND in ALPH API`);
        }
      } catch (error: any) {
        console.log(`❌ ${order.reference} ERROR in ALPH API: ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 CONCLUSION');
    console.log('='.repeat(80));
    console.log('If ALPH orders are:');
    console.log('  - NOT FOUND in PRIMARY API ❌');
    console.log('  - FOUND in ALPH API (MAYSTRO_API_KEY_1) ✅');
    console.log('');
    console.log('Then the issue is confirmed: The system uses PRIMARY API for all stores,');
    console.log('but ALPH orders only exist in the ALPH API (MAYSTRO_API_KEY_1).');
    console.log('');
    console.log('SOLUTION: Update syncShippingStatus to use MAYSTRO_API_KEY_1 for ALPH orders.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

function getStatusName(statusCode: number): string {
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
  return STATUS_MAPPING[statusCode] || `INCONNU (${statusCode})`;
}

testAlphApiKeyIssue();