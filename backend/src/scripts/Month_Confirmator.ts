import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface EcoManagerOrder {
  id: number;
  reference: string;
  full_name: string;
  order_state_name: string;
  created_at: string;
  confirmator?: {
    id: number;
    name: string;
  } | null;
}

interface ApiResponse {
  data: EcoManagerOrder[];
  meta?: {
    next_cursor?: string;
    per_page?: number;
  };
  links?: {
    next?: string | null;
  };
}

async function fetchDecemberOrdersWithConfirmators() {
  console.log('🧪 Fetching ALL December 2025 Orders with Confirmator Names\n');
  console.log('='.repeat(80));

  try {
    // Get NATU store configuration
    const storeConfig = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier: 'NATU' }
    });

    if (!storeConfig) {
      console.log('❌ NATU store configuration not found');
      return;
    }

    console.log('✅ Found NATU store configuration\n');
    console.log(`📦 Store: ${storeConfig.storeName} (${storeConfig.storeIdentifier})`);
    console.log('-'.repeat(80));

    // Base URL map for stores
    const baseUrlMap: { [key: string]: string } = {
      'NATU': 'https://natureldz.ecomanager.dz/api/shop/v2',
      'PURNA': 'https://purnadz.ecomanager.dz/api/shop/v2',
      'ALPH': 'https://alphaphonedz.ecomanager.dz/api/shop/v2'
    };

    const baseUrl = baseUrlMap[storeConfig.storeIdentifier];
    if (!baseUrl) {
      console.log(`❌ No base URL configured for store: ${storeConfig.storeIdentifier}`);
      return;
    }

    console.log(`\n🔍 Fetching ALL December 2025 orders (newest first)...`);
    console.log(`   API: ${baseUrl}/orders`);
    console.log(`   Strategy: Paginated fetch with descending order`);
    console.log(`   Per Page: 100`);
    console.log(`   Month: December 2025\n`);

    const allOrders: EcoManagerOrder[] = [];
    let page = 1;
    let hasMore = true;
    let cursor: string | undefined = undefined;

    // Fetch all pages until we reach orders before December 2025
    while (hasMore) {
      console.log(`   📄 Fetching page ${page}...`);

      const params: any = {
        per_page: 100,
        sort_direction: 'desc'
      };

      if (cursor) {
        params.cursor = cursor;
      } else {
        params.page = page;
      }

      const response = await axios.get<ApiResponse>(`${baseUrl}/orders`, {
        headers: {
          'Authorization': `Bearer ${storeConfig.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params,
        timeout: 30000
      });

      const orders = response.data.data;

      if (!orders || orders.length === 0) {
        console.log(`      ℹ️  No more orders found`);
        hasMore = false;
        break;
      }

      // Filter orders from December 2025
      const decemberOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === 2025 && orderDate.getMonth() === 11; // December is month 11 (0-indexed)
      });

      console.log(`      ✅ Found ${orders.length} orders, ${decemberOrders.length} from December 2025`);

      allOrders.push(...decemberOrders);

      // Check if we've gone past December 2025
      const lastOrderDate = new Date(orders[orders.length - 1].created_at);
      if (lastOrderDate.getFullYear() < 2025 || 
          (lastOrderDate.getFullYear() === 2025 && lastOrderDate.getMonth() < 11)) {
        console.log(`      ℹ️  Reached orders before December 2025, stopping...`);
        hasMore = false;
        break;
      }

      // Check for next page
      cursor = response.data.meta?.next_cursor;
      const hasNextLink = response.data.links?.next;

      if (!cursor && !hasNextLink) {
        console.log(`      ℹ️  No more pages available`);
        hasMore = false;
        break;
      }

      page++;

      // Rate limiting: wait 250ms between requests (4 req/sec)
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (allOrders.length === 0) {
      console.log('\n❌ No December 2025 orders found');
      return;
    }

    console.log(`\n✅ Total December 2025 orders fetched: ${allOrders.length}\n`);
    console.log('📊 December 2025 Orders with Confirmator Names:\n');
    console.log('Order ID    Reference         Customer                 Confirmator              Status              Date');
    console.log('-'.repeat(140));

    // Track statistics
    let ordersWithConfirmator = 0;
    let ordersWithoutConfirmator = 0;
    const confirmatorCounts: { [key: string]: number } = {};
    const statusCounts: { [key: string]: number } = {};
    const dateCounts: { [key: string]: number } = {};
    let oldestDate = '';
    let newestDate = '';

    // Display orders
    allOrders.forEach((order, index) => {
      const confirmatorName = (order as any).confirmator?.name || 'N/A';
      const status = order.order_state_name || 'Unknown';
      const date = order.created_at ? order.created_at.split(' ')[0] : 'Unknown';

      // Track dates
      if (index === 0) newestDate = date;
      if (index === allOrders.length - 1) oldestDate = date;

      // Track statistics
      if ((order as any).confirmator) {
        ordersWithConfirmator++;
        confirmatorCounts[confirmatorName] = (confirmatorCounts[confirmatorName] || 0) + 1;
      } else {
        ordersWithoutConfirmator++;
      }
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      dateCounts[date] = (dateCounts[date] || 0) + 1;

      // Format output
      const orderId = order.id.toString().padEnd(11);
      const reference = order.reference.padEnd(17);
      const customer = order.full_name.substring(0, 24).padEnd(24);
      const confirmator = confirmatorName.substring(0, 24).padEnd(24);
      const orderStatus = status.substring(0, 19).padEnd(19);

      console.log(`${orderId} ${reference} ${customer} ${confirmator} ${orderStatus} ${date}`);
    });

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 Summary Statistics:\n');
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Orders WITH Confirmator: ${ordersWithConfirmator} (${((ordersWithConfirmator / allOrders.length) * 100).toFixed(1)}%)`);
    console.log(`Orders WITHOUT Confirmator: ${ordersWithoutConfirmator} (${((ordersWithoutConfirmator / allOrders.length) * 100).toFixed(1)}%)`);

    console.log(`\n👥 Confirmator Distribution:`);
    Object.entries(confirmatorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`   ${name}: ${count} orders (${((count / allOrders.length) * 100).toFixed(1)}%)`);
      });

    console.log(`\n📊 Order Status Distribution:`);
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count} orders (${((count / allOrders.length) * 100).toFixed(1)}%)`);
      });

    console.log(`\n📅 Orders by Date:`);
    Object.entries(dateCounts)
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
      .forEach(([date, count]) => {
        console.log(`   ${date}: ${count} orders`);
      });

    console.log(`\n📅 Date Range:`);
    console.log(`   Newest: ${newestDate}`);
    console.log(`   Oldest: ${oldestDate}`);

    console.log('\n✅ Fetch completed successfully!');
    console.log('\n' + '='.repeat(80));
    console.log('🎉 All December 2025 data retrieved!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      console.error('Response status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
fetchDecemberOrdersWithConfirmators();