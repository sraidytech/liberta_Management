import { PrismaClient } from '@prisma/client';
import { AgentAssignmentService } from '../services/agent-assignment.service';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testAgentOrders() {
  console.log('🔍 Testing Agent Orders System...\n');

  try {
    // 1. Check if we have AGENT_SUIVI users
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT_SUIVI',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        agentCode: true,
        maxOrders: true,
        currentOrders: true
      }
    });

    console.log('📋 Active AGENT_SUIVI users:');
    agents.forEach(agent => {
      console.log(`  - ${agent.name || agent.agentCode} (${agent.id}): ${agent.currentOrders}/${agent.maxOrders} orders`);
    });

    if (agents.length === 0) {
      console.log('❌ No active AGENT_SUIVI users found!');
      return;
    }

    // 2. Check unassigned orders
    const unassignedOrders = await prisma.order.findMany({
      where: {
        assignedAgentId: null,
        OR: [
          { shippingStatus: null },
          { shippingStatus: { notIn: ['Livré', 'livré', 'LIVRE', 'annulé', 'Annulé', 'ANNULE'] } }
        ]
      },
      select: {
        id: true,
        reference: true,
        shippingStatus: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`\n📦 Found ${unassignedOrders.length} unassigned orders (showing first 10):`);
    unassignedOrders.forEach(order => {
      console.log(`  - ${order.reference}: status=${order.status}, shipping=${order.shippingStatus || 'null'}`);
    });

    // 3. Check assigned orders for each agent
    console.log('\n👥 Current agent assignments:');
    for (const agent of agents) {
      const assignedOrders = await prisma.order.findMany({
        where: {
          assignedAgentId: agent.id
        },
        select: {
          id: true,
          reference: true,
          status: true,
          assignedAt: true
        },
        orderBy: { assignedAt: 'desc' },
        take: 5
      });

      console.log(`\n  ${agent.name || agent.agentCode} (${agent.agentCode}):`);
      if (assignedOrders.length === 0) {
        console.log('    - No orders assigned');
      } else {
        assignedOrders.forEach(order => {
          console.log(`    - ${order.reference}: ${order.status} (assigned: ${order.assignedAt?.toISOString()})`);
        });
      }
    }

    // 4. Test assignment system
    if (unassignedOrders.length > 0) {
      console.log('\n🧪 Testing assignment system...');
      const assignmentService = new AgentAssignmentService(redis);
      
      // Mark agents as active
      for (const agent of agents) {
        await assignmentService.markAgentAsActive(agent.id);
        console.log(`✅ Marked ${agent.name || agent.agentCode} as active`);
      }

      // Test assignment
      const testResult = await assignmentService.testAssignmentSystem(3);
      console.log('\n📊 Assignment test results:');
      console.log(`  - Total processed: ${testResult.totalProcessed}`);
      console.log(`  - Successful: ${testResult.successfulAssignments}`);
      console.log(`  - Failed: ${testResult.failedAssignments}`);

      if (testResult.results.length > 0) {
        console.log('\n📝 Assignment details:');
        testResult.results.forEach(result => {
          if (result.success) {
            console.log(`  ✅ ${result.orderId} → ${result.assignedAgentName}`);
          } else {
            console.log(`  ❌ ${result.orderId}: ${result.message}`);
          }
        });
      }
    }

    // 5. Final check - show updated assignments
    console.log('\n🔄 Updated agent assignments:');
    for (const agent of agents) {
      const assignedOrders = await prisma.order.count({
        where: {
          assignedAgentId: agent.id
        }
      });
      console.log(`  - ${agent.name || agent.agentCode}: ${assignedOrders} total orders`);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

testAgentOrders();