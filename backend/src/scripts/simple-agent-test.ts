import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAgentStats() {
  try {
    console.log('🧪 Testing Agent Stats...\n');

    // Get all agents
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'AGENT_SUIVI'
      },
      select: {
        id: true,
        name: true,
        agentCode: true
      }
    });

    console.log('👥 Found agents:', agents.length);

    for (const agent of agents) {
      console.log(`\n🔍 Testing agent: ${agent.name} (${agent.agentCode})`);
      console.log(`   Agent ID: ${agent.id}`);

      // Test admin stats (how admin dashboard counts)
      const adminCount = await prisma.order.count({
        where: {
          assignedAgentId: agent.id,
          status: 'ASSIGNED'
        }
      });

      console.log(`   📊 Admin count (ASSIGNED status only): ${adminCount}`);

      // Check total assigned orders (all statuses)
      const totalAssigned = await prisma.order.count({
        where: {
          assignedAgentId: agent.id
        }
      });

      console.log(`   📈 Total assigned orders (all statuses): ${totalAssigned}`);

      // Check product assignments
      const productAssignments = await prisma.userProductAssignment.findMany({
        where: { userId: agent.id },
        select: { productName: true }
      });
      
      console.log(`   🏷️  Product assignments: ${productAssignments.length}`);
      if (productAssignments.length > 0) {
        console.log(`   📦 Products: ${productAssignments.map(p => p.productName).slice(0, 5).join(', ')}${productAssignments.length > 5 ? '...' : ''}`);
      }

      // If agent has product assignments, test filtered count
      if (productAssignments.length > 0) {
        const productNames = productAssignments.map(p => p.productName);
        const filteredCount = await prisma.order.count({
          where: {
            assignedAgentId: agent.id,
            status: 'ASSIGNED',
            items: {
              some: {
                title: {
                  in: productNames
                }
              }
            }
          }
        });
        console.log(`   🔍 Filtered count (with product filter): ${filteredCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAgentStats();