import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function manualAssignment() {
  console.log('🔧 Manual Assignment Script...\n');

  try {
    // Get some unassigned orders
    const unassignedOrders = await prisma.order.findMany({
      where: {
        assignedAgentId: null
      },
      select: {
        id: true,
        reference: true,
        status: true
      },
      take: 5
    });

    console.log(`Found ${unassignedOrders.length} unassigned orders`);

    // Get AGENT_SUIVI users
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT_SUIVI',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        agentCode: true
      }
    });

    console.log(`Found ${agents.length} active agents`);

    if (unassignedOrders.length > 0 && agents.length > 0) {
      // Manually assign first order to first agent
      const order = unassignedOrders[0];
      const agent = agents[0];

      await prisma.order.update({
        where: { id: order.id },
        data: {
          assignedAgentId: agent.id,
          assignedAt: new Date(),
          status: 'ASSIGNED'
        }
      });

      console.log(`✅ Assigned order ${order.reference} to ${agent.name || agent.agentCode}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualAssignment();