const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkShippingStatuses() {
  try {
    console.log('🔍 Checking shipping status values in database...');
    
    // Get all unique shipping status values
    const shippingStatuses = await prisma.order.groupBy({
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
    
    console.log('\n📊 Shipping Status Distribution:');
    console.log('================================');
    shippingStatuses.forEach(status => {
      console.log(`${status.shippingStatus || 'NULL'}: ${status._count.id} orders`);
    });
    
    // Get all unique order status values
    const orderStatuses = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log('\n📊 Order Status Distribution:');
    console.log('=============================');
    orderStatuses.forEach(status => {
      console.log(`${status.status}: ${status._count.id} orders`);
    });
    
    // Check recent orders with both statuses
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        reference: true,
        status: true,
        shippingStatus: true,
        total: true,
        createdAt: true
      }
    });
    
    console.log('\n📋 Recent Orders Sample:');
    console.log('========================');
    recentOrders.forEach(order => {
      console.log(`${order.reference}: status=${order.status}, shippingStatus=${order.shippingStatus || 'NULL'}, total=${order.total} DA`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShippingStatuses();