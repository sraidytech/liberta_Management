const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCommissionData() {
  try {
    console.log('Testing commission data extraction...');
    
    // Test 1: Check if OrderItem table has data
    const orderItemCount = await prisma.orderItem.count();
    console.log(`OrderItem count: ${orderItemCount}`);
    
    // Test 2: Get sample order items
    const sampleItems = await prisma.orderItem.findMany({
      take: 5,
      select: {
        title: true,
        sku: true,
        quantity: true
      }
    });
    console.log('Sample order items:', sampleItems);
    
    // Test 3: Get distinct product titles
    const distinctItems = await prisma.orderItem.findMany({
      select: {
        title: true,
        sku: true,
        quantity: true
      },
      distinct: ['title'],
      take: 10
    });
    console.log('Distinct product titles:', distinctItems);
    
    // Test 4: Check User table for agents
    const agentCount = await prisma.user.count({
      where: { role: 'AGENT_SUIVI' }
    });
    console.log(`Agent count: ${agentCount}`);
    
  } catch (error) {
    console.error('Error testing commission data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommissionData();