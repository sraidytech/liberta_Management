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
}

async function findEcoManagerMaxOrder() {
  console.log('🔍 FINDING ECOMANAGER\'S HIGHEST ORDER ID...\n');

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
    console.log(`   Base URL: ${natuConfig.baseUrl}`);
    console.log(`   Token: ...${natuConfig.apiToken.slice(-4)}\n`);

    // Strategy: Fetch first page (newest orders) to get the highest ID
    console.log('🎯 FETCHING NEWEST ORDERS (HIGHEST IDs)...');
    
    const result = await fetchFirstPage(natuConfig);
    
    if (!result.success) {
      console.log(`❌ Failed to fetch orders: ${result.error}`);
      return;
    }

    const orders = result.orders;
    
    if (orders.length === 0) {
      console.log('❌ No orders found in EcoManager');
      return;
    }

    // Find the highest order ID
    const orderIds = orders.map(o => o.id).sort((a, b) => b - a);
    const highestOrderId = orderIds[0];
    const lowestOrderId = orderIds[orderIds.length - 1];

    console.log(`✅ FIRST PAGE RESULTS:`);
    console.log(`   📊 Orders in first page: ${orders.length}`);
    console.log(`   📊 Order ID range: ${lowestOrderId} to ${highestOrderId}`);
    console.log(`   📅 Date range: ${orders[orders.length - 1]?.created_at.split('T')[0]} to ${orders[0]?.created_at.split('T')[0]}`);

    // Show the highest orders
    console.log('\n📋 HIGHEST ORDER IDs (NEWEST):');
    orders.slice(0, 10).forEach((order, index) => {
      console.log(`   ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.order_state_name}) - ${order.created_at.split('T')[0]}`);
    });

    // Get database last sync info
    console.log('\n📊 DATABASE COMPARISON:');
    const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "storeIdentifier" = 'NATU'
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" IS NOT NULL
      ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
      LIMIT 1
    `;

    const dbLastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
    
    console.log(`   📈 Database last order ID: ${dbLastOrderId}`);
    console.log(`   📈 EcoManager highest order ID: ${highestOrderId}`);
    console.log(`   📊 Difference: ${Math.abs(dbLastOrderId - highestOrderId)} orders`);

    // Analysis
    console.log('\n🎯 ANALYSIS:');
    console.log('=' .repeat(80));
    
    if (dbLastOrderId > highestOrderId) {
      const gap = dbLastOrderId - highestOrderId;
      console.log(`❌ DATABASE IS AHEAD BY ${gap} ORDERS!`);
      console.log('   • Database has order IDs that don\'t exist in EcoManager yet');
      console.log('   • This suggests database has future/invalid order IDs');
      console.log('   • Sync should start from EcoManager\'s actual highest ID');
      
      console.log('\n💡 RECOMMENDED ACTION:');
      console.log(`   • Reset sync starting point to: ${highestOrderId}`);
      console.log('   • This will sync any new orders that come after this point');
      console.log('   • Investigate why database has higher order IDs');
      
    } else if (highestOrderId > dbLastOrderId) {
      const gap = highestOrderId - dbLastOrderId;
      console.log(`✅ ECOMANAGER HAS ${gap} NEW ORDERS!`);
      console.log('   • EcoManager has orders newer than database');
      console.log('   • This is the normal sync scenario');
      console.log('   • Sync should fetch orders from database last ID to EcoManager highest ID');
      
      console.log('\n💡 RECOMMENDED ACTION:');
      console.log(`   • Sync orders from ${dbLastOrderId + 1} to ${highestOrderId}`);
      console.log('   • Use cursor-based pagination starting from newest');
      console.log('   • Filter for orders with ID > ${dbLastOrderId}');
      
    } else {
      console.log(`✅ DATABASE AND ECOMANAGER ARE IN SYNC!`);
      console.log('   • Both have the same highest order ID');
      console.log('   • No new orders to sync');
      
      console.log('\n💡 RECOMMENDED ACTION:');
      console.log('   • Monitor for new orders');
      console.log('   • Sync process is working correctly');
    }

    // Check for "En dispatch" orders
    const dispatchOrders = orders.filter(order => order.order_state_name === 'En dispatch');
    console.log(`\n🚚 ORDERS IN "EN DISPATCH" STATE: ${dispatchOrders.length}`);
    
    if (dispatchOrders.length > 0) {
      console.log('📋 Sample "En dispatch" orders:');
      dispatchOrders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD - ${order.created_at.split('T')[0]}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to find max order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchFirstPage(config: any): Promise<{
  success: boolean;
  orders: EcoManagerOrder[];
  error?: string;
}> {
  try {
    const baseUrl = config.baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
    
    const response = await axios.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      params: {
        per_page: 100, // Get more orders to see the range
        sort_direction: 'desc' // Newest first (highest IDs)
      },
      timeout: 30000,
    });

    const responseData = response.data as any;
    const orders = responseData?.data || [];
    
    return {
      success: true,
      orders
    };

  } catch (error: any) {
    return {
      success: false,
      orders: [],
      error: error.message
    };
  }
}

// Run the search
findEcoManagerMaxOrder().catch(console.error);