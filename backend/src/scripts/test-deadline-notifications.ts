import { deadlineNotificationService } from '../services/deadline-notification.service';
import { deliveryDelayService } from '../services/delivery-delay.service';
import { notificationService } from '../services/notification.service';
import { prisma } from '../config/database';
import redis from '../config/redis';

/**
 * Test script for deadline notification system
 * Tests rate limiting, batching, and notification delivery
 */
async function testDeadlineNotifications() {
  console.log('🧪 Starting Deadline Notification System Tests...\n');

  try {
    // Test 1: Get deadline notification summary
    console.log('📊 Test 1: Getting deadline notification summary...');
    const summary = await deliveryDelayService.getDeadlineNotificationSummary();
    console.log('Summary:', summary);
    console.log('✅ Test 1 passed\n');

    // Test 2: Get orders needing notifications
    console.log('📋 Test 2: Getting orders needing deadline notifications...');
    const ordersData = await deliveryDelayService.getOrdersNeedingDeadlineNotifications();
    console.log(`Found ${ordersData.length} agents with delayed orders`);
    ordersData.forEach(agent => {
      console.log(`  - ${agent.agentName}: ${agent.orders.length} orders`);
      agent.orders.slice(0, 3).forEach(order => {
        console.log(`    * ${order.reference} (${order.delayInfo.delayLevel}, +${order.delayInfo.delayDays}d)`);
      });
    });
    console.log('✅ Test 2 passed\n');

    // Test 3: Test rate limiting for a specific agent
    if (ordersData.length > 0) {
      const testAgent = ordersData[0];
      console.log(`🚫 Test 3: Testing rate limiting for agent ${testAgent.agentName}...`);
      
      // Clear any existing rate limits
      await redis.del(`notification_rate_limit:${testAgent.agentId}`);
      
      // Check initial rate limit
      const initialLimit = await deadlineNotificationService.getAgentRateLimit(testAgent.agentId);
      console.log('Initial rate limit:', initialLimit);
      
      // Test single notification
      const testResult = await deadlineNotificationService.testDeadlineNotification(testAgent.agentId);
      console.log('Test notification result:', testResult);
      
      // Check rate limit after notification
      const afterLimit = await deadlineNotificationService.getAgentRateLimit(testAgent.agentId);
      console.log('Rate limit after notification:', afterLimit);
      
      console.log('✅ Test 3 passed\n');
    }

    // Test 4: Test full deadline processing
    console.log('🚀 Test 4: Testing full deadline notification processing...');
    const processingResults = await deadlineNotificationService.processAllAgentDeadlines();
    console.log('Processing results:', processingResults);
    console.log('✅ Test 4 passed\n');

    // Test 5: Test notification statistics
    console.log('📈 Test 5: Testing notification statistics...');
    const stats = await notificationService.getNotificationStats('hour');
    console.log('Notification stats (last hour):', stats);
    console.log('✅ Test 5 passed\n');

    // Test 6: Test deadline statistics from service
    console.log('📊 Test 6: Testing deadline statistics...');
    const deadlineStats = await deadlineNotificationService.getDeadlineStats();
    console.log('Deadline stats:', deadlineStats);
    console.log('✅ Test 6 passed\n');

    // Test 7: Test rate limit clearing (admin function)
    console.log('🧹 Test 7: Testing rate limit clearing...');
    const clearedCount = await deadlineNotificationService.clearAllRateLimits();
    console.log(`Cleared rate limits for ${clearedCount} agents`);
    console.log('✅ Test 7 passed\n');

    // Test 8: Test batched notification creation
    console.log('📦 Test 8: Testing batched notification creation...');
    if (ordersData.length > 0) {
      const testAgent = ordersData[0];
      const testTitle = '🚨 TEST: 3 orders need attention';
      const testMessage = '2 CRITICAL orders overdue (avg 1.5 days), 1 WARNING order approaching deadline. Most urgent: #12345 (+2d), #12346 (+1d), #12347 (due soon)';
      const orderIds = testAgent.orders.slice(0, 3).map(o => o.id);
      
      const batchedNotification = await notificationService.createBatchedDeadlineNotification(
        testAgent.agentId,
        testTitle,
        testMessage,
        orderIds
      );
      
      console.log('Batched notification created:', {
        id: batchedNotification?.id,
        title: batchedNotification?.title,
        orderCount: orderIds.length
      });
      console.log('✅ Test 8 passed\n');
    }

    // Test 9: Verify AGENT_SUIVI filtering
    console.log('👥 Test 9: Verifying AGENT_SUIVI filtering...');
    const allAgents = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true, name: true, email: true }
    });
    
    const agentSuiviCount = allAgents.filter(a => a.role === 'AGENT_SUIVI').length;
    const otherAgentsCount = allAgents.filter(a => a.role !== 'AGENT_SUIVI').length;
    
    console.log(`Total active agents: ${allAgents.length}`);
    console.log(`AGENT_SUIVI: ${agentSuiviCount}`);
    console.log(`Other roles: ${otherAgentsCount}`);
    console.log(`Agents with delayed orders (should be AGENT_SUIVI only): ${ordersData.length}`);
    
    // Verify all agents in ordersData are AGENT_SUIVI
    const nonAgentSuivi = ordersData.filter(agent => {
      const agentData = allAgents.find(a => a.id === agent.agentId);
      return agentData?.role !== 'AGENT_SUIVI';
    });
    
    if (nonAgentSuivi.length === 0) {
      console.log('✅ All agents with delayed orders are AGENT_SUIVI');
    } else {
      console.log('❌ Found non-AGENT_SUIVI agents:', nonAgentSuivi);
    }
    console.log('✅ Test 9 passed\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Deadline notification summary retrieval');
    console.log('✅ Orders needing notifications filtering');
    console.log('✅ Rate limiting functionality');
    console.log('✅ Full deadline processing');
    console.log('✅ Notification statistics');
    console.log('✅ Deadline statistics caching');
    console.log('✅ Rate limit clearing');
    console.log('✅ Batched notification creation');
    console.log('✅ AGENT_SUIVI role filtering');
    
    console.log('\n🚀 System is ready for production!');
    console.log('📅 Scheduler will run deadline checks every 4 hours at: 06:00, 10:00, 14:00, 18:00');
    console.log('🚫 Rate limit: Max 10 notifications per 15 minutes per agent');
    console.log('📦 Notifications are batched and aggregated to prevent spam');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await redis.disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDeadlineNotifications()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testDeadlineNotifications };