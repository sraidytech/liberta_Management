import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAgentActivities() {
  console.log('🧹 Starting AgentActivity cleanup...');
  
  try {
    // Get total count before cleanup
    const totalBefore = await prisma.agentActivity.count();
    console.log(`📊 Total AgentActivity records before cleanup: ${totalBefore}`);
    
    // Keep only the last 1000 records per agent for ORDER_ASSIGNED activities
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT_SUIVI' },
      select: { id: true, name: true, agentCode: true }
    });
    
    let totalDeleted = 0;
    
    for (const agent of agents) {
      console.log(`🔄 Processing agent: ${agent.name || agent.agentCode} (${agent.id})`);
      
      // Get ORDER_ASSIGNED activities for this agent, ordered by creation date (newest first)
      const activities = await prisma.agentActivity.findMany({
        where: {
          agentId: agent.id,
          activityType: 'ORDER_ASSIGNED'
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true }
      });
      
      if (activities.length > 100) {
        // Keep only the latest 100 ORDER_ASSIGNED records per agent
        const toDelete = activities.slice(100);
        const deleteIds = toDelete.map(a => a.id);
        
        console.log(`  📋 Deleting ${deleteIds.length} old ORDER_ASSIGNED records for agent ${agent.name || agent.agentCode}`);
        
        // Process deletions in batches of 10,000 to avoid database limits
        const batchSize = 10000;
        let deletedCount = 0;
        
        for (let i = 0; i < deleteIds.length; i += batchSize) {
          const batch = deleteIds.slice(i, i + batchSize);
          console.log(`    🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deleteIds.length / batchSize)} (${batch.length} records)`);
          
          const deleteResult = await prisma.agentActivity.deleteMany({
            where: {
              id: { in: batch }
            }
          });
          
          deletedCount += deleteResult.count;
          console.log(`    ✅ Batch deleted ${deleteResult.count} records`);
          
          // Small delay between batches to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        totalDeleted += deletedCount;
        console.log(`  ✅ Total deleted ${deletedCount} records for agent ${agent.name || agent.agentCode}`);
      } else {
        console.log(`  ✅ Agent ${agent.name || agent.agentCode} has ${activities.length} records - no cleanup needed`);
      }
    }
    
    // Also clean up very old activities (older than 30 days) regardless of type
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`🗓️ Cleaning up activities older than ${thirtyDaysAgo.toISOString()}`);
    
    const oldActivitiesDeleted = await prisma.agentActivity.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });
    
    totalDeleted += oldActivitiesDeleted.count;
    console.log(`🗑️ Deleted ${oldActivitiesDeleted.count} activities older than 30 days`);
    
    // Get total count after cleanup
    const totalAfter = await prisma.agentActivity.count();
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Before: ${totalBefore} records`);
    console.log(`   After: ${totalAfter} records`);
    console.log(`   Deleted: ${totalDeleted} records`);
    console.log(`   Reduction: ${((totalDeleted / totalBefore) * 100).toFixed(1)}%`);
    
    console.log('\n✅ AgentActivity cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAgentActivities()
  .then(() => {
    console.log('🎉 Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });