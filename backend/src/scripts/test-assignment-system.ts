import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { AgentAssignmentService } from '../services/agent-assignment.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testAssignmentSystem() {
  console.log('🎯 Testing Agent Assignment System...\n');

  const assignmentService = new AgentAssignmentService(redis);

  try {
    // 1. Check current stats
    console.log('📊 Current Assignment Statistics:');
    const stats = await assignmentService.getAssignmentStats();
    console.log(`- Total Agents: ${stats.totalAgents}`);
    console.log(`- Online Agents: ${stats.onlineAgents}`);
    console.log(`- Offline Agents: ${stats.offlineAgents}`);
    console.log(`- Unassigned Orders: ${stats.unassignedOrders}`);
    console.log(`- Total Assigned Orders: ${stats.totalAssignedOrders}\n`);

    // 2. Show agent workloads
    console.log('👥 Agent Workloads:');
    if (stats.agentWorkloads.length === 0) {
      console.log('- No AGENT_SUIVI found\n');
    } else {
      stats.agentWorkloads.forEach(agent => {
        console.log(`- ${agent.agentName} (${agent.agentCode}): ${agent.assignedOrders}/${agent.maxOrders} orders (${agent.utilizationRate.toFixed(1)}%) - ${agent.isOnline ? 'Online' : 'Offline'}`);
      });
      console.log('');
    }

    // 3. Test assignment if there are unassigned orders
    if (stats.unassignedOrders > 0) {
      console.log('🔄 Testing automatic assignment...');
      const result = await assignmentService.autoAssignUnassignedOrders();
      console.log(`- Processed: ${result.totalProcessed} orders`);
      console.log(`- Successfully assigned: ${result.successfulAssignments} orders`);
      console.log(`- Failed assignments: ${result.failedAssignments} orders\n`);

      if (result.successfulAssignments > 0) {
        console.log('✅ Assignment Results:');
        result.results
          .filter(r => r.success)
          .slice(0, 5) // Show first 5 successful assignments
          .forEach(r => {
            console.log(`- Order ${r.orderId} assigned to ${r.assignedAgentName}`);
          });
        console.log('');
      }

      if (result.failedAssignments > 0) {
        console.log('❌ Failed Assignments:');
        result.results
          .filter(r => !r.success)
          .slice(0, 5) // Show first 5 failed assignments
          .forEach(r => {
            console.log(`- Order ${r.orderId}: ${r.message}`);
          });
        console.log('');
      }
    } else {
      console.log('✅ No unassigned orders found\n');
    }

    // 4. Test agent activity simulation
    console.log('🔌 Testing agent activity tracking...');
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT_SUIVI',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        agentCode: true
      },
      take: 2 // Test with first 2 agents
    });

    if (agents.length > 0) {
      for (const agent of agents) {
        // Simulate agent coming online
        await assignmentService.updateAgentActivity(agent.id, `socket_${agent.id}_test`);
        console.log(`- ${agent.name} (${agent.agentCode}) marked as active`);
      }
      console.log('');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if agents are now considered online
      const updatedStats = await assignmentService.getAssignmentStats();
      console.log('📊 Updated Statistics after activity simulation:');
      console.log(`- Online Agents: ${updatedStats.onlineAgents}`);
      console.log(`- Offline Agents: ${updatedStats.offlineAgents}\n`);
    } else {
      console.log('- No AGENT_SUIVI found for testing\n');
    }

    // 5. Test round-robin assignment with multiple orders
    console.log('🔄 Testing round-robin assignment...');
    
    // Get some unassigned orders for testing
    const unassignedOrders = await prisma.order.findMany({
      where: {
        assignedAgentId: null,
        status: 'PENDING'
      },
      select: {
        id: true,
        reference: true
      },
      take: 3 // Test with 3 orders
    });

    if (unassignedOrders.length > 0) {
      console.log(`Found ${unassignedOrders.length} unassigned orders for round-robin test:`);
      
      for (const order of unassignedOrders) {
        const result = await assignmentService.assignOrder(order.id);
        if (result.success) {
          console.log(`- Order ${order.reference} assigned to ${result.assignedAgentName}`);
        } else {
          console.log(`- Order ${order.reference} assignment failed: ${result.message}`);
        }
      }
      console.log('');
    } else {
      console.log('- No unassigned orders available for round-robin test\n');
    }

    // 6. Final statistics
    console.log('📊 Final Assignment Statistics:');
    const finalStats = await assignmentService.getAssignmentStats();
    console.log(`- Total Agents: ${finalStats.totalAgents}`);
    console.log(`- Online Agents: ${finalStats.onlineAgents}`);
    console.log(`- Unassigned Orders: ${finalStats.unassignedOrders}`);
    console.log(`- Total Assigned Orders: ${finalStats.totalAssignedOrders}`);

    console.log('\n✅ Assignment system test completed successfully!');

  } catch (error) {
    console.error('❌ Assignment system test failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the test
testAssignmentSystem().catch(console.error);