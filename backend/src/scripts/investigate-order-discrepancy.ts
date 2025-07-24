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
}

async function investigateOrderDiscrepancy() {
  console.log('🔍 INVESTIGATING ORDER ID DISCREPANCY...\n');

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
    console.log(`   Token: ...${natuConfig.apiToken.slice(-4)}\n`);

    // 1. Check database for NATU orders
    console.log('📊 CHECKING DATABASE FOR NATU ORDERS...');
    
    const dbOrderStats = await prisma.$queryRaw<Array<{
      count: bigint;
      min_id: string;
      max_id: string;
      latest_created: Date;
    }>>`
      SELECT 
        COUNT(*) as count,
        MIN("ecoManagerId") as min_id,
        MAX("ecoManagerId") as max_id,
        MAX("createdAt") as latest_created
      FROM "orders"
      WHERE "storeIdentifier" = 'NATU'
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" IS NOT NULL
    `;

    if (dbOrderStats.length > 0) {
      const stats = dbOrderStats[0];
      console.log(`   📈 Database NATU orders: ${stats.count.toString()}`);
      console.log(`   📊 Order ID range: ${stats.min_id} to ${stats.max_id}`);
      console.log(`   📅 Latest order date: ${stats.latest_created}`);
    }

    // Get recent orders from database with customer info
    const recentDbOrders = await prisma.$queryRaw<Array<{
      ecoManagerId: string;
      createdAt: Date;
      fullName: string;
      total: number;
    }>>`
      SELECT o."ecoManagerId", o."createdAt", c."fullName", o."total"
      FROM "orders" o
      JOIN "customers" c ON o."customerId" = c."id"
      WHERE o."storeIdentifier" = 'NATU'
        AND o."source" = 'ECOMANAGER'
        AND o."ecoManagerId" IS NOT NULL
      ORDER BY CAST(o."ecoManagerId" AS INTEGER) DESC
      LIMIT 10
    `;

    console.log('\n   📋 Recent orders in database:');
    recentDbOrders.forEach((order, index) => {
      console.log(`     ${index + 1}. Order ${order.ecoManagerId}: ${order.fullName} - ${order.total} DZD (${order.createdAt.toISOString().split('T')[0]})`);
    });

    // 2. Check EcoManager API for current orders
    console.log('\n🌐 CHECKING ECOMANAGER API FOR CURRENT ORDERS...');
    
    const apiResult = await fetchLatestOrdersFromAPI(natuConfig);
    
    if (apiResult.success && apiResult.orders.length > 0) {
      const minId = Math.min(...apiResult.orders.map(o => o.id));
      const maxId = Math.max(...apiResult.orders.map(o => o.id));
      
      console.log(`   📈 EcoManager orders found: ${apiResult.orders.length}`);
      console.log(`   📊 Order ID range: ${minId} to ${maxId}`);
      console.log(`   📅 Date range: ${apiResult.orders[apiResult.orders.length - 1]?.created_at} to ${apiResult.orders[0]?.created_at}`);
      
      console.log('\n   📋 Recent orders in EcoManager:');
      apiResult.orders.slice(0, 10).forEach((order, index) => {
        console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.created_at.split('T')[0]}) - ${order.order_state_name}`);
      });
    }

    // 3. Try to find the specific order 174302
    console.log('\n🔍 SEARCHING FOR SPECIFIC ORDER 174302...');
    const specificOrderResult = await searchForSpecificOrder(natuConfig, 174302);
    
    if (specificOrderResult.found) {
      console.log(`   ✅ Order 174302 found in EcoManager!`);
      console.log(`   📋 Details: ${specificOrderResult.order?.full_name} - ${specificOrderResult.order?.total} DZD`);
    } else {
      console.log(`   ❌ Order 174302 NOT found in EcoManager`);
      console.log(`   💡 This explains why cursor pagination stops early`);
    }

    // 4. Analysis and recommendations
    console.log('\n📊 DISCREPANCY ANALYSIS:');
    console.log('=' .repeat(80));
    
    if (dbOrderStats.length > 0 && apiResult.success) {
      const dbMaxId = parseInt(dbOrderStats[0].max_id);
      const apiMaxId = Math.max(...apiResult.orders.map(o => o.id));
      
      console.log(`   Database max order ID: ${dbMaxId}`);
      console.log(`   EcoManager max order ID: ${apiMaxId}`);
      console.log(`   Difference: ${dbMaxId - apiMaxId} orders`);
      
      if (dbMaxId > apiMaxId) {
        console.log('\n❌ CRITICAL ISSUE IDENTIFIED:');
        console.log('   • Database has orders with higher IDs than EcoManager');
        console.log('   • This suggests data was deleted from EcoManager');
        console.log('   • Or there was a database import from a different source');
        console.log('   • Sync should start from EcoManager\'s actual highest ID');
        
        console.log('\n💡 RECOMMENDED SOLUTION:');
        console.log(`   • Reset last sync ID to EcoManager's max ID: ${apiMaxId}`);
        console.log('   • This will prevent scanning for non-existent orders');
        console.log('   • Future syncs will work correctly from this point');
      }
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchLatestOrdersFromAPI(config: any): Promise<{
  success: boolean;
  orders: EcoManagerOrder[];
  error?: string;
}> {
  try {
    const baseUrl = (config as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
    
    const response = await axios.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100,
        sort: '-id' // Sort by ID descending (newest first)
      },
      timeout: 15000
    });

    const orders = (response.data as any)?.data || [];
    
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

async function searchForSpecificOrder(config: any, orderId: number): Promise<{
  found: boolean;
  order?: EcoManagerOrder;
}> {
  try {
    const baseUrl = (config as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
    
    // Try to fetch the specific order directly
    const response = await axios.get(`${baseUrl}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return {
      found: true,
      order: response.data as EcoManagerOrder
    };

  } catch (error: any) {
    if (error.response?.status === 404) {
      return { found: false };
    }
    
    // If direct access fails, try searching through pagination
    console.log('   🔄 Direct access failed, searching through pagination...');
    
    try {
      const baseUrl = (config as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
      let cursor: string | undefined = undefined;
      let found = false;
      let searchAttempts = 0;
      const maxSearchAttempts = 50; // Limit search to prevent infinite loops
      
      while (!found && searchAttempts < maxSearchAttempts) {
        const params: any = {
          per_page: 100,
          sort: '-id'
        };
        
        if (cursor) {
          params.cursor = cursor;
        }
        
        const searchResponse = await axios.get(`${baseUrl}/orders`, {
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          params,
          timeout: 15000
        });

        const responseData = searchResponse.data as any;
        const orders = responseData?.data || [];
        const targetOrder = orders.find((order: any) => order.id === orderId);
        
        if (targetOrder) {
          return {
            found: true,
            order: targetOrder as EcoManagerOrder
          };
        }
        
        // Check if we've gone past the target ID
        const minId = Math.min(...orders.map((o: any) => o.id));
        if (minId < orderId) {
          break; // We've passed the target ID, it doesn't exist
        }
        
        cursor = responseData?.meta?.next_cursor;
        if (!cursor || !responseData?.meta?.has_more) {
          break;
        }
        
        searchAttempts++;
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
      }
      
      return { found: false };
      
    } catch (searchError) {
      return { found: false };
    }
  }
}

// Run the investigation
investigateOrderDiscrepancy().catch(console.error);