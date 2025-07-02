import prisma from '../config/database';

/**
 * Clean up excessive notifications and keep only the latest 50 per user
 */
async function cleanupExcessiveNotifications() {
  try {
    console.log('🧹 Starting notification cleanup...');

    // Get all users with notifications
    const usersWithNotifications = await prisma.user.findMany({
      where: {
        notifications: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            notifications: true,
          },
        },
      },
    });

    console.log(`Found ${usersWithNotifications.length} users with notifications`);

    for (const user of usersWithNotifications) {
      const notificationCount = user._count.notifications;
      
      if (notificationCount > 50) {
        console.log(`User ${user.name || user.email} has ${notificationCount} notifications. Cleaning up...`);

        // Get the oldest notifications to delete (keep latest 50)
        const notificationsToDelete = await prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
          take: notificationCount - 50,
          select: { id: true },
        });

        const idsToDelete = notificationsToDelete.map(n => n.id);

        // Delete the old notifications in batches to avoid PostgreSQL bind variable limit
        const batchSize = 10000; // Safe batch size for PostgreSQL
        let totalDeleted = 0;

        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          const deleteResult = await prisma.notification.deleteMany({
            where: {
              id: { in: batch },
            },
          });
          totalDeleted += deleteResult.count;
          console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleteResult.count} notifications`);
        }

        console.log(`✅ Deleted ${totalDeleted} old notifications for user ${user.name || user.email}`);
      } else {
        console.log(`User ${user.name || user.email} has ${notificationCount} notifications (within limit)`);
      }
    }

    // Get final statistics
    const totalNotifications = await prisma.notification.count();
    const totalUsers = await prisma.user.count();
    
    console.log(`\n📊 Cleanup completed!`);
    console.log(`Total notifications remaining: ${totalNotifications}`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Average notifications per user: ${(totalNotifications / totalUsers).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupExcessiveNotifications();