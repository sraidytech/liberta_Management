import prisma from '../config/database';
import { NotificationType } from '@prisma/client';

async function createTestNotifications() {
  try {
    console.log('🔔 Creating test notifications...');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    // Get some orders for testing
    const orders = await prisma.order.findMany({
      take: 5,
      select: {
        id: true,
        reference: true,
      },
    });

    const notifications = [];

    // Create notifications for each user
    for (const user of users) {
      // Order assignment notification
      notifications.push({
        userId: user.id,
        orderId: orders[0]?.id || null,
        type: 'SYSTEM_ALERT' as NotificationType,
        title: 'Test System Alert',
        message: `Order ${orders[0]?.reference || 'TEST-001'} has been assigned to you. Please review and process it.`,
        isRead: false,
      });

      // Order update notification
      notifications.push({
        userId: user.id,
        orderId: orders[1]?.id || null,
        type: 'ORDER_UPDATE' as NotificationType,
        title: 'Order Status Updated',
        message: `Order ${orders[1]?.reference || 'TEST-002'} status has been changed to CONFIRMED.`,
        isRead: false,
      });

      // System alert for admins and managers
      if (user.role === 'ADMIN' || user.role === 'TEAM_MANAGER') {
        notifications.push({
          userId: user.id,
          type: 'SYSTEM_ALERT' as NotificationType,
          title: 'System Alert',
          message: 'High order volume detected. Consider adding more agents to handle the workload.',
          isRead: false,
        });
      }

      // Shipping update for agents
      if (user.role === 'AGENT_SUIVI' || user.role === 'AGENT_CALL_CENTER') {
        notifications.push({
          userId: user.id,
          orderId: orders[2]?.id || null,
          type: 'SHIPPING_UPDATE' as NotificationType,
          title: 'Shipping Update',
          message: `Order ${orders[2]?.reference || 'TEST-003'} has been shipped. Tracking number: TRK123456789`,
          isRead: false,
        });

        // Add some read notifications too
        notifications.push({
          userId: user.id,
          orderId: orders[3]?.id || null,
          type: 'ORDER_UPDATE' as NotificationType,
          title: 'Order Delivered',
          message: `Order ${orders[3]?.reference || 'TEST-004'} has been successfully delivered to the customer.`,
          isRead: true,
        });
      }
    }

    // Create all notifications
    const createdNotifications = await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`✅ Created ${createdNotifications.count} test notifications`);
    console.log(`📊 Notifications created for ${users.length} users`);
    
    // Show summary
    const summary = await prisma.notification.groupBy({
      by: ['type', 'isRead'],
      _count: {
        id: true,
      },
    });

    console.log('\n📈 Notification Summary:');
    summary.forEach(item => {
      console.log(`  ${item.type} (${item.isRead ? 'Read' : 'Unread'}): ${item._count.id}`);
    });

  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestNotifications();