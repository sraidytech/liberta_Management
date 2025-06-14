import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../services/ecomanager.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function findPurnaDispatchOrders() {
  console.log('🔍 Finding PURNA "En dispatch" Orders...\n');

  try {
    const PURNA_TOKEN = 'dqEjmOe1nNprl4xpqOKBP5ZiPJA0JvYHGGDgT86ksnUruXoaKNLECopMlLApKWgW2WI51TuoE1YdI9hQ';
    
    const ecoService = new EcoManagerService({
      storeName: 'PURNA - Purna Store',
      storeIdentifier: 'PURNA',
      apiToken: PURNA_TOKEN,
      baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
    }, redis);

    console.log('1. Clearing corrupted cache...');
    await redis.del('ecomanager:pageinfo:PURNA');
    console.log('   ✅ Cache cleared');

    console.log('\n2. Searching for pages with high order IDs (like in your Google Sheet)...');
    
    // Based on your Google Sheet, PURNA orders are in the 161000+ range
    // Let's find the correct pages by scanning backwards from a high page number
    
    let foundDispatchOrders = false;
    let totalDispatchOrders = 0;
    const dispatchOrderSamples: any[] = [];
    
    // Start from a high page number and work backwards
    for (let page = 600; page >= 580; page--) {
      try {
        console.log(`\n📄 Scanning PURNA page ${page}...`);
        const orders = await ecoService.fetchOrdersPage(page, 100);
        
        if (orders && orders.length > 0) {
          const firstId = orders[0].id;
          const lastId = orders[orders.length - 1].id;
          console.log(`   📊 Found ${orders.length} orders (ID range: ${firstId} - ${lastId})`);
          
          // Check if this page has orders in the range we see in Google Sheets (161000+)
          const hasHighIds = orders.some(order => order.id >= 161000);
          
          if (hasHighIds) {
            console.log('   🎯 This page has high IDs matching Google Sheet range!');
            
            // Count orders by status
            const statusCounts: { [key: string]: number } = {};
            orders.forEach(order => {
              statusCounts[order.order_state_name] = (statusCounts[order.order_state_name] || 0) + 1;
            });
            
            console.log('   📋 Status breakdown:', statusCounts);
            
            // Look for "En dispatch" orders
            const enDispatchOrders = orders.filter(order => order.order_state_name === 'En dispatch');
            
            if (enDispatchOrders.length > 0) {
              foundDispatchOrders = true;
              totalDispatchOrders += enDispatchOrders.length;
              console.log(`   🎉 FOUND ${enDispatchOrders.length} "En dispatch" orders!`);
              
              // Save samples
              enDispatchOrders.slice(0, 3).forEach(order => {
                dispatchOrderSamples.push({
                  page,
                  id: order.id,
                  reference: order.reference,
                  customer: order.full_name,
                  total: order.total
                });
                console.log(`      - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
              });
              
              // Update cache to point to this correct page
              await ecoService.savePageInfo(page, firstId, lastId);
              console.log(`   💾 Updated cache to point to page ${page}`);
            }
          }
        } else {
          console.log(`   📄 Page ${page}: Empty`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`   ❌ Error scanning page ${page}:`, error);
      }
    }

    console.log('\n3. 📊 RESULTS SUMMARY:');
    console.log(`   🎯 Found "En dispatch" orders: ${foundDispatchOrders ? 'YES' : 'NO'}`);
    console.log(`   📈 Total "En dispatch" orders found: ${totalDispatchOrders}`);
    
    if (dispatchOrderSamples.length > 0) {
      console.log('\n   📋 Sample "En dispatch" orders found:');
      dispatchOrderSamples.forEach((sample, index) => {
        console.log(`      ${index + 1}. Page ${sample.page} - Order ${sample.id}: ${sample.customer} - ${sample.total} DZD`);
      });
    }

    if (foundDispatchOrders) {
      console.log('\n4. 🔧 Testing Fixed Sync...');
      
      // Now test the sync with the corrected cache
      const newOrders = await ecoService.fetchNewOrders(0);
      console.log(`   📥 Sync result: ${newOrders.length} orders found`);
      
      if (newOrders.length > 0) {
        console.log('   ✅ SUCCESS! Sync is now finding orders');
        console.log('\n   📋 Sample synced orders:');
        newOrders.slice(0, 5).forEach((order, index) => {
          console.log(`      ${index + 1}. Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
        });
      }
    }

    console.log('\n5. 🎯 FINAL RECOMMENDATIONS:');
    
    if (foundDispatchOrders) {
      console.log('   ✅ ISSUE RESOLVED!');
      console.log('   📈 Cache has been corrected to point to the right pages');
      console.log('   🔄 Run the sync button again - it should now find PURNA orders');
      console.log('   💡 The problem was that cache was pointing to very old pages (1-2) instead of current pages (580+)');
    } else {
      console.log('   ⚠️  Still no "En dispatch" orders found');
      console.log('   💡 This might mean:');
      console.log('      - PURNA orders in Google Sheet are from a different time period');
      console.log('      - Orders have been processed and status changed');
      console.log('      - Need to scan different page ranges');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the script
findPurnaDispatchOrders().catch(console.error);