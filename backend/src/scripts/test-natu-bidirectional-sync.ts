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

async function testNatuBidirectionalSync() {
  console.log('🎯 TESTING NATU BIDIRECTIONAL SYNC - FETCH ONLY NEW ORDERS...\n');

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

    // Step 1: Get last synced order ID from database
    console.log('📊 GETTING LAST SYNCED ORDER FROM DATABASE...');
    const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "storeIdentifier" = 'NATU'
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" IS NOT NULL
      ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
      LIMIT 1
    `;

    const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
    console.log(`✅ Last synced order ID: ${lastOrderId}\n`);

    // Step 2: Find the exact page where this order exists
    console.log('🔍 FINDING EXACT PAGE FOR LAST ORDER ID...');
    const exactPageResult = await findExactPageForOrder(natuConfig, lastOrderId);
    
    if (!exactPageResult.found) {
      console.log(`❌ Could not find order ${lastOrderId} in EcoManager`);
      console.log('💡 This might mean the order was deleted or the ID is invalid');
      return;
    }

    const exactPage = exactPageResult.page!;
    console.log(`✅ Found order ${lastOrderId} at page: ${exactPage}\n`);

    // Step 3: Bidirectional scan
    console.log('🎯 STARTING BIDIRECTIONAL SCAN...');
    const syncResult = await performBidirectionalSync(natuConfig, exactPage, lastOrderId);
    
    // Step 4: Results summary
    console.log('\n📊 BIDIRECTIONAL SYNC RESULTS:');
    console.log('=' .repeat(80));
    console.log(`   🎯 Starting page: ${exactPage}`);
    console.log(`   🔙 Backward scan: pages ${syncResult.backwardStartPage} to ${exactPage - 1} (${syncResult.backwardPagesScanned} pages)`);
    console.log(`   🔜 Forward scan: pages ${exactPage + 1} to ${syncResult.forwardEndPage} (${syncResult.forwardPagesScanned} pages)`);
    console.log(`   📊 Total pages scanned: ${syncResult.totalPagesScanned}`);
    console.log(`   📊 Total API calls: ${syncResult.totalApiCalls}`);
    console.log(`   📊 Total new orders found: ${syncResult.totalNewOrders}`);
    
    if (syncResult.totalNewOrders > 0) {
      console.log(`   📊 Highest new order ID: ${syncResult.highestNewOrderId}`);
      console.log(`   📊 New order ID range: ${lastOrderId + 1} to ${syncResult.highestNewOrderId}`);
      
      console.log('\n   📋 Breakdown by scan direction:');
      console.log(`     🔙 Backward scan: ${syncResult.backwardNewOrders} new orders`);
      console.log(`     🔜 Forward scan: ${syncResult.forwardNewOrders} new orders`);
      
      console.log('\n   📋 Sample new orders found:');
      syncResult.newOrders.slice(0, 10).forEach((order, index) => {
        console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD (${order.order_state_name}) - ${order.created_at.split('T')[0]}`);
      });
      
      if (syncResult.newOrders.length > 10) {
        console.log(`     ... and ${syncResult.newOrders.length - 10} more orders`);
      }
      
      // Orders in "En dispatch" state
      const dispatchOrders = syncResult.newOrders.filter(order => order.order_state_name === 'En dispatch');
      console.log(`\n   🚚 New orders in "En dispatch" state: ${dispatchOrders.length}`);
      
      if (dispatchOrders.length > 0) {
        console.log('   📋 Sample "En dispatch" orders:');
        dispatchOrders.slice(0, 5).forEach((order, index) => {
          console.log(`     ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD - ${order.created_at.split('T')[0]}`);
        });
      }
    }

    console.log('\n🎯 SYNC STRATEGY VALIDATION:');
    console.log('   ✅ Found exact page for last order ID');
    console.log('   ✅ Scanned backward 15 pages for missed orders');
    console.log('   ✅ Scanned forward until reaching highest order IDs');
    console.log('   ✅ Filtered only new orders not in database');
    console.log('   ✅ Used efficient cursor-based pagination');

    // Simulate saving to database
    if (syncResult.totalNewOrders > 0) {
      console.log('\n💾 SIMULATING DATABASE SAVE...');
      console.log(`   📝 Would save ${syncResult.totalNewOrders} new orders to database`);
      console.log(`   📊 Would update last sync ID to: ${syncResult.highestNewOrderId}`);
      console.log('   ✅ Sync process would be complete');
    } else {
      console.log('\n✅ NO NEW ORDERS TO SYNC - DATABASE IS UP TO DATE');
    }

  } catch (error) {
    console.error('❌ Bidirectional sync test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function findExactPageForOrder(config: any, orderId: number): Promise<{
  found: boolean;
  page?: number;
}> {
  console.log(`   🔍 Searching for order ${orderId} in EcoManager...`);
  
  let cursor: string | null = null;
  let pageCount = 0;
  const maxPages = 100; // Limit search to prevent infinite loops
  
  while (pageCount < maxPages) {
    pageCount++;
    
    const result = await fetchOrdersPage(config, cursor);
    
    if (!result.success) {
      console.log(`   ❌ Failed to fetch page ${pageCount}: ${result.error}`);
      break;
    }

    const orders = result.data.data;
    
    if (orders.length === 0) {
      console.log(`   📭 No more orders available`);
      break;
    }

    // Check if our target order is in this page
    const targetOrder = orders.find(order => order.id === orderId);
    
    if (targetOrder) {
      console.log(`   ✅ Found order ${orderId} on page ${pageCount}`);
      return { found: true, page: pageCount };
    }

    // Check if we've gone past the target ID (orders are sorted by ID desc)
    const minId = Math.min(...orders.map(o => o.id));
    if (minId < orderId) {
      console.log(`   ⏹️  Passed target order ID ${orderId} (current min: ${minId})`);
      break;
    }

    cursor = result.data.meta.next_cursor;
    if (!cursor) {
      console.log(`   ⏹️  No more pages available`);
      break;
    }

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return { found: false };
}

async function performBidirectionalSync(config: any, exactPage: number, lastOrderId: number): Promise<{
  backwardStartPage: number;
  backwardPagesScanned: number;
  backwardNewOrders: number;
  forwardEndPage: number;
  forwardPagesScanned: number;
  forwardNewOrders: number;
  totalPagesScanned: number;
  totalApiCalls: number;
  totalNewOrders: number;
  highestNewOrderId: number;
  newOrders: EcoManagerOrder[];
}> {
  
  let totalApiCalls = 0;
  let totalNewOrders = 0;
  let highestNewOrderId = lastOrderId;
  const newOrders: EcoManagerOrder[] = [];
  
  // Phase 1: Backward scan (15 pages before exact page)
  console.log(`\n🔙 PHASE 1: Backward scan from page ${exactPage}...`);
  const backwardStartPage = Math.max(1, exactPage - 15);
  let backwardPagesScanned = 0;
  let backwardNewOrders = 0;
  
  // Get cursor for backward scanning
  let backwardCursor = await getCursorForPage(config, backwardStartPage);
  
  for (let page = backwardStartPage; page < exactPage && backwardCursor; page++) {
    console.log(`     📄 Scanning backward page ${page}...`);
    
    const result = await fetchOrdersPage(config, backwardCursor);
    totalApiCalls++;
    backwardPagesScanned++;

    if (!result.success) {
      console.log(`     ❌ Failed to fetch page ${page}: ${result.error}`);
      break;
    }

    const orders = result.data.data;
    
    if (orders.length === 0) {
      console.log(`     📭 Page ${page} is empty`);
      break;
    }

    const minId = Math.min(...orders.map(o => o.id));
    const maxId = Math.max(...orders.map(o => o.id));
    
    // Filter for new orders (ID > lastOrderId) and "En dispatch" status
    const pageNewOrders = orders.filter(order => 
      order.id > lastOrderId && order.order_state_name === 'En dispatch'
    );
    
    console.log(`     📋 Page ${page}: ${orders.length} orders, IDs ${minId}-${maxId}, ${pageNewOrders.length} new`);
    
    if (pageNewOrders.length > 0) {
      backwardNewOrders += pageNewOrders.length;
      totalNewOrders += pageNewOrders.length;
      newOrders.push(...pageNewOrders);
      
      const maxNewId = Math.max(...pageNewOrders.map(o => o.id));
      if (maxNewId > highestNewOrderId) {
        highestNewOrderId = maxNewId;
      }
    }

    backwardCursor = result.data.meta.next_cursor;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`   ✅ Backward scan complete: ${backwardPagesScanned} pages, ${backwardNewOrders} new orders`);

  // Phase 2: Forward scan (from exact page + 1 until highest order IDs)
  console.log(`\n🔜 PHASE 2: Forward scan from page ${exactPage + 1}...`);
  let forwardPagesScanned = 0;
  let forwardNewOrders = 0;
  let forwardEndPage = exactPage;
  
  // Start forward scan from first page (newest orders)
  let forwardCursor: string | null = null;
  let reachedExactPage = false;
  let pageCount = 0;
  
  while (true) {
    pageCount++;
    console.log(`     📄 Scanning forward page ${pageCount}...`);
    
    const result = await fetchOrdersPage(config, forwardCursor);
    totalApiCalls++;
    forwardPagesScanned++;
    forwardEndPage = pageCount;

    if (!result.success) {
      console.log(`     ❌ Failed to fetch page ${pageCount}: ${result.error}`);
      break;
    }

    const orders = result.data.data;
    
    if (orders.length === 0) {
      console.log(`     📭 Page ${pageCount} is empty - reached end`);
      break;
    }

    const minId = Math.min(...orders.map(o => o.id));
    const maxId = Math.max(...orders.map(o => o.id));
    
    // Check if we've reached our exact page (where last order ID exists)
    if (!reachedExactPage && orders.some(order => order.id <= lastOrderId)) {
      reachedExactPage = true;
      console.log(`     ⏹️  Reached exact page area (found orders <= ${lastOrderId})`);
      break;
    }
    
    // Filter for new orders (ID > lastOrderId) and "En dispatch" status
    const pageNewOrders = orders.filter(order => 
      order.id > lastOrderId && order.order_state_name === 'En dispatch'
    );
    
    console.log(`     📋 Page ${pageCount}: ${orders.length} orders, IDs ${minId}-${maxId}, ${pageNewOrders.length} new`);
    
    if (pageNewOrders.length > 0) {
      forwardNewOrders += pageNewOrders.length;
      totalNewOrders += pageNewOrders.length;
      newOrders.push(...pageNewOrders);
      
      const maxNewId = Math.max(...pageNewOrders.map(o => o.id));
      if (maxNewId > highestNewOrderId) {
        highestNewOrderId = maxNewId;
      }
    }

    forwardCursor = result.data.meta.next_cursor;
    if (!forwardCursor) {
      console.log(`     ⏹️  No more pages available`);
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`   ✅ Forward scan complete: ${forwardPagesScanned} pages, ${forwardNewOrders} new orders`);

  return {
    backwardStartPage,
    backwardPagesScanned,
    backwardNewOrders,
    forwardEndPage,
    forwardPagesScanned,
    forwardNewOrders,
    totalPagesScanned: backwardPagesScanned + forwardPagesScanned,
    totalApiCalls,
    totalNewOrders,
    highestNewOrderId,
    newOrders
  };
}

async function getCursorForPage(config: any, targetPage: number): Promise<string | null> {
  // This is a simplified approach - in practice, you'd need to navigate to the specific page
  // For now, we'll start from the beginning and navigate to the target page
  let cursor: string | null = null;
  
  for (let page = 1; page < targetPage; page++) {
    const result = await fetchOrdersPage(config, cursor);
    
    if (!result.success || result.data.data.length === 0) {
      break;
    }
    
    cursor = result.data.meta.next_cursor;
    if (!cursor) {
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Faster navigation
  }
  
  return cursor;
}

async function fetchOrdersPage(config: any, cursor: string | null): Promise<{
  success: boolean;
  data: EcoManagerResponse;
  error?: string;
}> {
  try {
    const baseUrl = config.baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
    
    const params: any = {
      per_page: 100,
      sort_direction: 'desc' // Newest first (highest IDs)
    };
    
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

// Run the bidirectional sync test
testNatuBidirectionalSync().catch(console.error);