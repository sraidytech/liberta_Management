import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupActivityLogs() {
  try {
    console.log('🧹 Starting activity logs cleanup...');

    // 1. Remove all PROFILE-related logs
    console.log('📋 Removing PROFILE-related logs...');
    const deletedProfileLogs = await prisma.activityLog.deleteMany({
      where: {
        action: {
          contains: 'PROFILE'
        }
      }
    });
    console.log(`✅ Deleted ${deletedProfileLogs.count} PROFILE-related logs`);

    // 2. Check total logs and apply 6000 limit
    const totalLogs = await prisma.activityLog.count();
    console.log(`📊 Total logs after PROFILE cleanup: ${totalLogs}`);

    if (totalLogs > 6000) {
      const excessLogs = totalLogs - 6000;
      console.log(`🗑️ Need to remove ${excessLogs} excess logs to maintain 6000 limit`);

      // Get the oldest logs to delete
      const oldestLogs = await prisma.activityLog.findMany({
        select: { id: true },
        orderBy: { timestamp: 'asc' },
        take: excessLogs,
      });

      if (oldestLogs.length > 0) {
        const idsToDelete = oldestLogs.map(log => log.id);
        
        const deletedOldLogs = await prisma.activityLog.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });

        console.log(`✅ Deleted ${deletedOldLogs.count} old logs to maintain 6000 limit`);
      }
    }

    // 3. Final count
    const finalCount = await prisma.activityLog.count();
    console.log(`🎯 Final log count: ${finalCount}`);

    // 4. Show statistics
    const logsByLevel = await prisma.activityLog.groupBy({
      by: ['logLevel'],
      _count: {
        id: true,
      },
    });

    const logsByActionType = await prisma.activityLog.groupBy({
      by: ['actionType'],
      _count: {
        id: true,
      },
    });

    console.log('\n📈 Log Statistics:');
    console.log('By Level:');
    logsByLevel.forEach(stat => {
      console.log(`  ${stat.logLevel}: ${stat._count.id}`);
    });

    console.log('\nBy Action Type:');
    logsByActionType.forEach(stat => {
      console.log(`  ${stat.actionType}: ${stat._count.id}`);
    });

    console.log('\n✨ Activity logs cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during activity logs cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupActivityLogs()
  .then(() => {
    console.log('🎉 Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });