import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface EcoManagerOrder {
  id: number;
  reference: string;
  order_state_name: string;
  full_name: string;
  telephone: string;
  wilaya: string;
  commune: string;
  total: number;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: number;
    product_id: number;
    sku: string;
    title: string;
    quantity: number;
    selling_price: number;
  }>;
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

async function fetchAllNatuOrders() {
  console.log('🔍 FETCHING ALL NATU ORDERS FROM ECOMANAGER...\n');

  try {
    // Get NATU store configuration
    const natuConfig = await prisma.apiConfiguration.findFirst({
      where: { storeIdentifier: 'NATU', isActive: true }
    });

    if (!natuConfig) {
      console.log('❌ NATU store configuration not found!');
      return;
    }

    console.log('🏪 NATU Store Configuration:');
    console.log(`   Store: ${natuConfig.storeName}`);
    console.log(`   Identifier: ${natuConfig.storeIdentifier}`);
    console.log(`   Base URL: ${natuConfig.baseUrl}`);
    console.log(`   Token: ...${natuConfig.apiToken.slice(-4)}\n`);

    // Fetch all orders using cursor-based pagination
    console.log('🔄 Starting to fetch ALL orders using cursor-based pagination...\n');
    
    let allOrders: EcoManagerOrder[] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    let hasMore = true;

    while (hasMore) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.slice(0, 20)}...)` : ' (first page)'}...`);

      const result = await fetchOrdersPage(natuConfig, cursor);
      
      if (!result.success) {
        console.log(`❌ Failed to fetch page ${pageCount}: ${result.error}`);
        break;
      }

      const orders = result.data.data;
      allOrders.push(...orders);

      if (orders.length > 0) {
        const minId = Math.min(...orders.map(o => o.id));
        const maxId = Math.max(...orders.map(o => o.id));
        console.log(`   ✅ Page ${pageCount}: ${orders.length} orders (IDs ${minId}-${maxId})`);
        
        // Show sample orders from this page
        console.log(`   📋 Sample orders:`);
        orders.slice(0, 3).forEach((order, index) => {
          console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.order_state_name}) - ${order.created_at.split('T')[0]}`);
        });
      } else {
        console.log(`   📭 Page ${pageCount}: No orders found`);
      }

      // Check if there are more pages
      cursor = result.data.meta.next_cursor;
      hasMore = !!cursor && result.data.links.next !== null;

      if (!hasMore) {
        console.log(`   ⏹️  No more pages available`);
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n📊 FETCH COMPLETE - SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`   📈 Total pages fetched: ${pageCount}`);
    console.log(`   📈 Total orders found: ${allOrders.length}`);
    
    if (allOrders.length > 0) {
      const allIds = allOrders.map(o => o.id).sort((a, b) => a - b);
      const minId = allIds[0];
      const maxId = allIds[allIds.length - 1];
      
      console.log(`   📊 Order ID range: ${minId} to ${maxId}`);
      console.log(`   📅 Date range: ${allOrders[allOrders.length - 1]?.created_at.split('T')[0]} to ${allOrders[0]?.created_at.split('T')[0]}`);
      
      // Order states breakdown
      const stateBreakdown = allOrders.reduce((acc, order) => {
        acc[order.order_state_name] = (acc[order.order_state_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n   📋 Orders by state:');
      Object.entries(stateBreakdown).forEach(([state, count]) => {
        console.log(`     ${state}: ${count} orders`);
      });
      
      // Recent orders (highest IDs)
      const recentOrders = allOrders
        .sort((a, b) => b.id - a.id)
        .slice(0, 10);
      
      console.log('\n   📋 Most recent orders (highest IDs):');
      recentOrders.forEach((order, index) => {
        console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.order_state_name}) - ${order.created_at.split('T')[0]}`);
      });
      
      // Orders in "En dispatch" state
      const dispatchOrders = allOrders.filter(order => order.order_state_name === 'En dispatch');
      console.log(`\n   🚚 Orders in "En dispatch" state: ${dispatchOrders.length}`);
      
      if (dispatchOrders.length > 0) {
        console.log('   📋 Sample "En dispatch" orders:');
        dispatchOrders.slice(0, 5).forEach((order, index) => {
          console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD - ${order.created_at.split('T')[0]}`);
        });
      }
    }

    console.log('\n🎯 ANALYSIS:');
    console.log('   This shows ALL orders currently available in EcoManager for NATU store');
    console.log('   Use this data to understand the real order ID ranges and sync requirements');

  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchOrdersPage(config: any, cursor: string | null): Promise<{
  success: boolean;
  data: EcoManagerResponse;
  error?: string;
}> {
  try {
    const baseUrl = config.baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
    
    const params: any = {
      per_page: 100, // Maximum per page for efficiency
    };
    
    // Add cursor if provided (for pagination)
    if (cursor) {
      params.cursor = cursor;
    }
    
    const response = await axios.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params,
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data as EcoManagerResponse
    };

  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log('       ⏳ Rate limited, waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      // Retry once
      return await fetchOrdersPage(config, cursor);
    }
    
    return {
      success: false,
      data: {} as EcoManagerResponse,
      error: error.message
    };
  }
}

// Run the fetch
fetchAllNatuOrders().catch(console.error);