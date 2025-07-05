import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShippingStatuses() {
  try {
    console.log('🔍 Checking shipping status values in database...');
    
    // Get all unique shipping status values
    const shippingStatuses = await prisma.order.findMany({
      select: {
        shippingStatus: true
      },
      where: {
        shippingStatus: {
          not: null
        }
      },
      distinct: ['shippingStatus']
    });
    
    console.log('📊 Unique shipping status values found:');
    shippingStatuses.forEach((order, index) => {
      console.log(`${index + 1}. "${order.shippingStatus}"`);
    });
    
    // Count orders by shipping status
    const statusCounts = await prisma.order.groupBy({
      by: ['shippingStatus'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log('\n📈 Orders count by shipping status:');
    statusCounts.forEach((status) => {
      console.log(`${status.shippingStatus || 'NULL'}: ${status._count.id} orders`);
    });
    
    // Total orders
    const totalOrders = await prisma.order.count();
    console.log(`\n📦 Total orders: ${totalOrders}`);
    
  } catch (error) {
    console.error('❌ Error checking shipping statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShippingStatuses();