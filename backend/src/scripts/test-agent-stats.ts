import { PrismaClient } from '@prisma/client';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import redis from '../config/redis';

const prisma = new PrismaClient();
const assignmentService = new AgentAssignmentService(redis);

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

      // Test agent-specific stats
      try {
        const agentStats = await assignmentService.getAgentSpecificStats(agent.id);
        console.log(`   📈 Agent-specific stats:`, agentStats);
      } catch (error) {
        console.error(`   ❌ Error getting agent stats:`, error);
      }

      // Check product assignments
      const productAssignments = await prisma.userProductAssignment.count({
        where: { userId: agent.id }
      });
      console.log(`   🏷️  Product assignments: ${productAssignments}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

testAgentStats();