import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface EcoManagerOrder {
  id: number;
  reference: string;
  full_name: string;
  order_state_name: string;
  confirmation_state_name: string | null;
  created_at: string;
  confirmed_at?: string;
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

async function seedDecemberConfirmations() {
  console.log('🌱 Seeding December 2025 confirmation data...\n');
  console.log('='.repeat(80));
  
  const stores = await prisma.apiConfiguration.findMany({
    where: { isActive: true }
  });
  
  console.log(`Found ${stores.length} active stores\n`);
  
  let totalSeeded = 0;
  let totalSkipped = 0;
  
  for (let storeIndex = 0; storeIndex < stores.length; storeIndex++) {
    const store = stores[storeIndex];
    
    // Skip ALPH store (as per original script)
    if (store.storeIdentifier === 'ALPH') {
      console.log(`⏭️ Skipping ${store.storeName} (ALPH)\n`);
      continue;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 [Store ${storeIndex + 1}/${stores.length}] Processing ${store.storeName} (${store.storeIdentifier})`);
    console.log(`${'='.repeat(80)}\n`);
    
    const baseUrl = 'https://natureldz.ecomanager.dz/api/shop/v2';
    let page = 1;
    let hasMore = true;
    let cursor: string | undefined = undefined;
    const allDecemberOrders: EcoManagerOrder[] = [];
    
    // STEP 1: Fetch all December orders (like test script)
    while (hasMore) {
      try {
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
            'Authorization': `Bearer ${store.apiToken}`,
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
        
        // Filter December 2025 orders
        const decemberOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getFullYear() === 2025 && orderDate.getMonth() === 11;
        });
        
        console.log(`      ✅ Found ${orders.length} orders, ${decemberOrders.length} from December 2025`);
        
        allDecemberOrders.push(...decemberOrders);
        
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
        
      } catch (error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 429) {
          const retryAfter = parseInt(axiosError.response?.headers['retry-after'] || '60');
          console.log(`      ⏳ Rate limit hit! Waiting ${retryAfter} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          // Don't increment page, retry same page
          continue;
        }
        console.error(`      ❌ Error fetching page ${page}:`, axiosError.message || error);
        hasMore = false;
      }
    }
    
    console.log(`\n   ✅ Fetched ${allDecemberOrders.length} December 2025 orders`);
    
    let storeSeeded = 0;
    let storeSkipped = 0;
    
    // STEP 2: Batch process database operations
    if (allDecemberOrders.length > 0) {
      console.log(`   💾 Processing database operations...`);
      
      // Get all existing order IDs in one query
      const existingOrderIds = await prisma.orderConfirmation.findMany({
        where: {
          ecoManagerOrderId: {
            in: allDecemberOrders.map(o => o.id)
          }
        },
        select: { ecoManagerOrderId: true }
      });
      
      const existingIds = new Set(existingOrderIds.map(o => o.ecoManagerOrderId));
      const newOrders = allDecemberOrders.filter(o => !existingIds.has(o.id));
      
      console.log(`      - New orders to seed: ${newOrders.length}`);
      console.log(`      - Already existing: ${existingOrderIds.length}`);
      
      storeSkipped = existingOrderIds.length;
      totalSkipped += existingOrderIds.length;
      
      // Batch create new records (100 at a time)
      const batchSize = 100;
      for (let i = 0; i < newOrders.length; i += batchSize) {
        const batch = newOrders.slice(i, i + batchSize);
        
        // Get linked orders for this batch
        const linkedOrders = await prisma.order.findMany({
          where: {
            OR: batch.flatMap(order => [
              { ecoManagerId: `${store.storeIdentifier}${order.id}`, storeIdentifier: store.storeIdentifier },
              { ecoManagerId: order.id.toString(), storeIdentifier: store.storeIdentifier }
            ])
          },
          select: {
            id: true,
            ecoManagerId: true
          }
        });
        
        // Create map for quick lookup
        const linkedOrderMap = new Map(
          linkedOrders.map(o => [o.ecoManagerId, o.id])
        );
        
        // Batch create
        await prisma.orderConfirmation.createMany({
          data: batch.map(order => ({
            ecoManagerOrderId: order.id,
            orderReference: order.reference,
            storeIdentifier: store.storeIdentifier,
            orderId: linkedOrderMap.get(`${store.storeIdentifier}${order.id}`) || 
                     linkedOrderMap.get(order.id.toString()) || 
                     null,
            confirmatorId: order.confirmator?.id || null,
            confirmatorName: order.confirmator?.name || null,
            confirmationState: order.confirmation_state_name || null,
            orderState: order.order_state_name || null,
            confirmedAt: order.confirmed_at ? new Date(order.confirmed_at) : null
          })),
          skipDuplicates: true
        });
        
        storeSeeded += batch.length;
        totalSeeded += batch.length;
        console.log(`      - Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newOrders.length / batchSize)}`);
      }
    }
    
    console.log(`\n   ✅ Store complete:`);
    console.log(`      - New records: ${storeSeeded}`);
    console.log(`      - Skipped (existing): ${storeSkipped}`);
    
    // Delay between stores to avoid rate limiting
    if (storeIndex < stores.length - 1) {
      console.log(`   ⏳ Waiting 2 seconds before next store...\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎉 Seeding completed!`);
  console.log(`   - Total new records: ${totalSeeded}`);
  console.log(`   - Total skipped: ${totalSkipped}`);
  console.log(`${'='.repeat(80)}\n`);
}

seedDecemberConfirmations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());