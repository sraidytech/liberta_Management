import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EcoManagerConfirmator {
  id: number;
  name: string;
}

interface EcoManagerOrder {
  id: number;
  reference: string;
  order_state_name: string;
  confirmation_state_name?: string;
  full_name: string;
  telephone: string;
  wilaya: string;
  commune: string;
  confirmator: EcoManagerConfirmator | null;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

interface EcoManagerResponse {
  data: EcoManagerOrder[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
  };
}

/**
 * Test script to fetch last 50 orders from EcoManager and check confirmator names
 */
async function testConfirmatorNames() {
  console.log('🧪 Testing EcoManager API - Fetching Last 50 Orders with Confirmator Names\n');
  console.log('='.repeat(80));

  try {
    // Get store configurations from database
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: {
        isActive: true
      }
    });

    if (apiConfigs.length === 0) {
      console.log('❌ No active API configurations found in database');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found ${apiConfigs.length} active store(s)\n`);

    // Map base URLs for each store (hardcoded as they're store-specific)
    const baseUrlMap: { [key: string]: string } = {
      'NATU': 'https://natureldz.ecomanager.dz/api/shop/v2',
      'PURN': 'https://purnadz.ecomanager.dz/api/shop/v2',
      'ALPH': 'https://alphdz.ecomanager.dz/api/shop/v2'
    };

    const stores = apiConfigs.map(config => ({
      name: config.storeName,
      identifier: config.storeIdentifier,
      apiToken: config.apiToken,
      baseUrl: baseUrlMap[config.storeIdentifier] || 'https://natureldz.ecomanager.dz/api/shop/v2'
    }));

    for (const store of stores) {
      if (!store.apiToken) {
        console.log(`\n⚠️  Skipping ${store.name} - No API token configured`);
        continue;
      }

      console.log(`\n📦 Store: ${store.name} (${store.identifier})`);
      console.log('-'.repeat(80));

      try {
        // Create axios instance for this store
        const axiosInstance = axios.create({
          baseURL: store.baseUrl,
          headers: {
            'Authorization': `Bearer ${store.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        // Fetch last 50 orders
        console.log(`\n🔍 Fetching last 50 orders from ${store.name}...`);
        const response = await axiosInstance.get<EcoManagerResponse>('/orders', {
          params: {
            per_page: 50,
            sort_direction: 'desc' // Get newest orders first
          }
        });

        const orders = response.data.data;
        console.log(`✅ Successfully fetched ${orders.length} orders\n`);

        // Analyze confirmator data
        let ordersWithConfirmator = 0;
        let ordersWithoutConfirmator = 0;
        const confirmatorNames = new Set<string>();
        const confirmatorStats: { [key: string]: number } = {};

        console.log('📊 Analyzing Confirmator Data:\n');
        console.log('Order ID'.padEnd(12) + 'Reference'.padEnd(15) + 'Status'.padEnd(20) + 'Confirmator'.padEnd(20) + 'Confirmed At');
        console.log('-'.repeat(100));

        orders.forEach(order => {
          const confirmatorName = order.confirmator?.name || 'N/A';
          const confirmatorId = order.confirmator?.id || 'N/A';
          const confirmedAt = order.confirmed_at || 'Not confirmed';

          console.log(
            `${order.id}`.padEnd(12) +
            `${order.reference}`.padEnd(15) +
            `${order.order_state_name}`.padEnd(20) +
            `${confirmatorName}`.padEnd(20) +
            `${confirmedAt}`
          );

          if (order.confirmator) {
            ordersWithConfirmator++;
            confirmatorNames.add(confirmatorName);
            confirmatorStats[confirmatorName] = (confirmatorStats[confirmatorName] || 0) + 1;
          } else {
            ordersWithoutConfirmator++;
          }
        });

        // Summary statistics
        console.log('\n' + '='.repeat(80));
        console.log('📈 Summary Statistics:\n');
        console.log(`Total Orders Fetched: ${orders.length}`);
        console.log(`Orders WITH Confirmator: ${ordersWithConfirmator} (${((ordersWithConfirmator / orders.length) * 100).toFixed(1)}%)`);
        console.log(`Orders WITHOUT Confirmator: ${ordersWithoutConfirmator} (${((ordersWithoutConfirmator / orders.length) * 100).toFixed(1)}%)`);
        console.log(`\nUnique Confirmators Found: ${confirmatorNames.size}`);
        
        if (confirmatorNames.size > 0) {
          console.log('\n👥 Confirmator Distribution:');
          Object.entries(confirmatorStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name, count]) => {
              console.log(`   ${name}: ${count} orders (${((count / orders.length) * 100).toFixed(1)}%)`);
            });
        }

        // Sample detailed order with confirmator
        const orderWithConfirmator = orders.find(o => o.confirmator);
        if (orderWithConfirmator) {
          console.log('\n📋 Sample Order with Confirmator Details:');
          console.log(JSON.stringify({
            id: orderWithConfirmator.id,
            reference: orderWithConfirmator.reference,
            order_state_name: orderWithConfirmator.order_state_name,
            confirmation_state_name: orderWithConfirmator.confirmation_state_name,
            confirmator: orderWithConfirmator.confirmator,
            confirmed_at: orderWithConfirmator.confirmed_at,
            full_name: orderWithConfirmator.full_name,
            telephone: orderWithConfirmator.telephone,
            wilaya: orderWithConfirmator.wilaya
          }, null, 2));
        }

        console.log('\n✅ Test completed successfully for ' + store.name);

      } catch (error) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as any;
          console.error(`\n❌ API Error for ${store.name}:`);
          console.error(`   Status: ${axiosError.response?.status}`);
          console.error(`   Message: ${axiosError.response?.data?.message || axiosError.message}`);
          if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
            console.error(`   ⚠️  Check API token validity for ${store.name}`);
          }
        } else {
          console.error(`\n❌ Unexpected error for ${store.name}:`, error);
        }
      }

      // Add delay between stores to respect rate limits
      if (stores.indexOf(store) < stores.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next store...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 All tests completed!\n');

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConfirmatorNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});