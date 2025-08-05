/**
 * 🔍 AGENT REPORTS PERFORMANCE DIAGNOSTIC SCRIPT
 * 
 * This script analyzes the production data to understand why agent reports are timing out
 * and provides specific optimization recommendations.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosePerformance() {
  console.log('🔍 DIAGNOSING AGENT REPORTS PERFORMANCE ISSUE');
  console.log('================================================');
  console.log('');

  try {
    // 1. Check data volume
    console.log('📊 DATA VOLUME ANALYSIS:');
    
    const [totalUsers, totalOrders, totalActivities, dateRange] = await Promise.all([
      prisma.user.count({
        where: {
          role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
          isActive: true
        }
      }),
      prisma.order.count(),
      prisma.agentActivity.count(),
      prisma.order.aggregate({
        _min: { orderDate: true },
        _max: { orderDate: true }
      })
    ]);

    console.log(`   👥 Active Agents: ${totalUsers}`);
    console.log(`   📦 Total Orders: ${totalOrders.toLocaleString()}`);
    console.log(`   📝 Total Activities: ${totalActivities.toLocaleString()}`);
    console.log(`   📅 Date Range: ${dateRange._min.orderDate?.toISOString().split('T')[0]} to ${dateRange._max.orderDate?.toISOString().split('T')[0]}`);
    console.log('');

    // 2. Check recent data volume (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [recentOrders, recentActivities] = await Promise.all([
      prisma.order.count({
        where: {
          orderDate: { gte: thirtyDaysAgo }
        }
      }),
      prisma.agentActivity.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    console.log('📈 RECENT DATA (Last 30 days):');
    console.log(`   📦 Recent Orders: ${recentOrders.toLocaleString()}`);
    console.log(`   📝 Recent Activities: ${recentActivities.toLocaleString()}`);
    console.log('');

    // 3. Check index usage
    console.log('🔍 INDEX ANALYSIS:');
    
    const indexQuery = await prisma.$queryRaw<Array<{
      indexname: string;
      tablename: string;
    }>>`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('orders', 'users', 'agent_activities', 'customers')
      AND indexname LIKE '%idx%'
      ORDER BY tablename, indexname;
    `;

    console.log('   📋 Available Performance Indexes:');
    indexQuery.forEach(index => {
      console.log(`      ✅ ${index.tablename}.${index.indexname}`);
    });
    console.log('');

    // 4. Test simple queries to identify bottleneck
    console.log('⚡ QUERY PERFORMANCE TEST:');
    
    const testStart = Date.now();
    
    // Test 1: Simple user query
    const userQueryStart = Date.now();
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
        isActive: true
      },
      select: { id: true, name: true }
    });
    const userQueryTime = Date.now() - userQueryStart;
    console.log(`   👥 User Query: ${userQueryTime}ms (${users.length} users)`);

    // Test 2: Orders with agent join (limited)
    const orderQueryStart = Date.now();
    const ordersWithAgent = await prisma.order.findMany({
      where: {
        orderDate: { gte: thirtyDaysAgo },
        assignedAgentId: { not: null }
      },
      select: {
        id: true,
        status: true,
        total: true,
        assignedAgentId: true
      },
      take: 1000 // Limit to test performance
    });
    const orderQueryTime = Date.now() - orderQueryStart;
    console.log(`   📦 Order Query (1000 limit): ${orderQueryTime}ms (${ordersWithAgent.length} orders)`);

    // Test 3: Activities query (limited)
    const activityQueryStart = Date.now();
    const activities = await prisma.agentActivity.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        id: true,
        agentId: true,
        duration: true
      },
      take: 1000 // Limit to test performance
    });
    const activityQueryTime = Date.now() - activityQueryStart;
    console.log(`   📝 Activity Query (1000 limit): ${activityQueryTime}ms (${activities.length} activities)`);

    const totalTestTime = Date.now() - testStart;
    console.log(`   ⏱️  Total Test Time: ${totalTestTime}ms`);
    console.log('');

    // 5. Recommendations
    console.log('💡 PERFORMANCE RECOMMENDATIONS:');
    
    if (totalOrders > 100000) {
      console.log('   🚨 HIGH DATA VOLUME DETECTED:');
      console.log('      - Consider data archiving for orders older than 1 year');
      console.log('      - Implement pagination for large datasets');
      console.log('      - Use more aggressive caching (longer TTL)');
    }

    if (recentOrders > 10000) {
      console.log('   ⚠️  HIGH RECENT ACTIVITY:');
      console.log('      - Raw SQL queries may be too complex for this data volume');
      console.log('      - Consider breaking down into smaller, focused queries');
      console.log('      - Implement background pre-computation');
    }

    if (userQueryTime > 100) {
      console.log('   🐌 SLOW USER QUERIES:');
      console.log('      - Check if user indexes are properly created');
      console.log('      - Consider database connection pooling optimization');
    }

    if (orderQueryTime > 1000) {
      console.log('   🐌 SLOW ORDER QUERIES:');
      console.log('      - Order indexes may not be optimal');
      console.log('      - Consider query optimization or data partitioning');
    }

    if (activityQueryTime > 1000) {
      console.log('   🐌 SLOW ACTIVITY QUERIES:');
      console.log('      - Activity indexes may need optimization');
      console.log('      - Consider activity data cleanup/archiving');
    }

    console.log('');
    console.log('🎯 IMMEDIATE ACTION PLAN:');
    console.log('   1. Replace complex raw SQL with simpler Prisma queries');
    console.log('   2. Add aggressive caching (10+ minute TTL)');
    console.log('   3. Implement query result pagination');
    console.log('   4. Add background pre-computation for heavy reports');
    console.log('');

  } catch (error) {
    console.error('❌ Diagnostic Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
diagnosePerformance();