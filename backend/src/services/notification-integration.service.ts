import { notificationService } from './notification.service';
import { prisma } from '@/config/database';
import { OrderStatus, UserRole } from '@prisma/client';

/**
 * Integration service to connect notifications with existing systems
 */
export class NotificationIntegrationService {
  private pendingAssignments = new Map<string, { orderIds: string[], timestamp: number, agentName: string }>();
  private pendingTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly BULK_TIMEOUT = 2000; // 2 seconds to collect bulk assignments

  /**
   * Handle order assignment notifications with bulk detection
   */
  async handleOrderAssignment(orderId: string, agentId: string, assignedBy?: string) {
    try {
      // Get order and agent details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              fullName: true,
              telephone: true,
              wilaya: true,
              commune: true,
            },
          },
        },
      });

      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        select: { name: true, email: true, role: true },
      });

      if (!order || !agent) {
        console.error('Order or agent not found for notification');
        return;
      }

      // ORDER_ASSIGNMENT notifications are disabled per user request
      console.log(`📋 Order assignment notification disabled for order ${order.reference} assigned to ${agent.name || agent.email}`);

      // 🚨 DISABLED: Manager notifications for automatic assignments to prevent notification spam
      // if (!assignedBy) {
      //   await this.notifyManagers({
      //     type: 'SYSTEM_ALERT',
      //     title: 'Automatic Order Assignment',
      //     message: `Order ${order.reference} was automatically assigned to ${agent.name || agent.email}`,
      //     orderId,
      //   });
      // }
      console.log(`📋 Manager notification for automatic assignment disabled for order ${order.reference}`);

      console.log(`✅ Order assignment notification sent for order ${order.reference}`);
    } catch (error) {
      console.error('Error handling order assignment notification:', error);
    }
  }

  /**
   * Add assignment to pending list and handle bulk notification
   */
  private async addToPendingAssignments(orderId: string, agentId: string, agentName: string) {
    const now = Date.now();
    
    // Clear any existing timeout for this agent
    if (this.pendingTimeouts.has(agentId)) {
      clearTimeout(this.pendingTimeouts.get(agentId)!);
    }
    
    if (this.pendingAssignments.has(agentId)) {
      // Add to existing pending assignments
      const pending = this.pendingAssignments.get(agentId)!;
      pending.orderIds.push(orderId);
      pending.timestamp = now; // Update timestamp
    } else {
      // Create new pending assignment
      this.pendingAssignments.set(agentId, {
        orderIds: [orderId],
        timestamp: now,
        agentName
      });
    }

    // Set/reset timeout to process bulk notification
    const timeoutId = setTimeout(async () => {
      await this.processPendingAssignments(agentId);
    }, this.BULK_TIMEOUT);
    
    this.pendingTimeouts.set(agentId, timeoutId);
  }

  /**
   * Process pending assignments and create single notification ONLY for bulk assignments
   */
  private async processPendingAssignments(agentId: string) {
    const pending = this.pendingAssignments.get(agentId);
    if (!pending) return;

    // Remove from pending assignments and clear timeout
    this.pendingAssignments.delete(agentId);
    this.pendingTimeouts.delete(agentId);

    const orderCount = pending.orderIds.length;
    
    if (orderCount === 1) {
      // Single order - NO NOTIFICATION! User will see it in their orders list
      console.log(`📋 Single order assignment for ${pending.agentName} - no notification created`);
      return;
    }

    // ORDER_ASSIGNMENT notifications are completely disabled per user request
    console.log(`📋 Bulk ORDER_ASSIGNMENT notification disabled: ${orderCount} orders assigned to ${pending.agentName}`);
  }

  /**
   * Handle order status change notifications
   */
  async handleOrderStatusChange(orderId: string, newStatus: OrderStatus, oldStatus: OrderStatus, changedBy?: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true },
          },
          customer: {
            select: { fullName: true },
          },
        },
      });

      if (!order) {
        console.error('Order not found for status change notification');
        return;
      }

      // Notify assigned agent if different from the one who made the change
      if (order.assignedAgent && order.assignedAgent.id !== changedBy) {
        await notificationService.createNotification({
          userId: order.assignedAgent.id,
          orderId,
          type: 'ORDER_UPDATE',
          title: 'Order Status Updated',
          message: `Order ${order.reference} status changed from ${oldStatus} to ${newStatus}`,
        });
      }

      // Notify managers for important status changes
      const importantStatuses: OrderStatus[] = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
      if (importantStatuses.includes(newStatus)) {
        await this.notifyManagers({
          type: 'ORDER_UPDATE',
          title: `Order ${newStatus}`,
          message: `Order ${order.reference} (${order.customer.fullName}) is now ${newStatus}`,
          orderId,
        });
      }

      console.log(`✅ Order status change notification sent for order ${order.reference}`);
    } catch (error) {
      console.error('Error handling order status change notification:', error);
    }
  }

  /**
   * Handle shipping update notifications
   */
  async handleShippingUpdate(orderId: string, trackingNumber: string, shippingStatus: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          assignedAgent: {
            select: { id: true },
          },
        },
      });

      if (!order || !order.assignedAgent) {
        console.error('Order or assigned agent not found for shipping notification');
        return;
      }

      await notificationService.createNotification({
        userId: order.assignedAgent.id,
        orderId,
        type: 'SHIPPING_UPDATE',
        title: 'Shipping Update',
        message: `Order ${order.reference} shipping status: ${shippingStatus}. Tracking: ${trackingNumber}`,
      });

      console.log(`✅ Shipping update notification sent for order ${order.reference}`);
    } catch (error) {
      console.error('Error handling shipping update notification:', error);
    }
  }

  /**
   * Send daily pending order reminders to agents
   */
  async sendPendingOrderReminders() {
    try {
      // Get agents with pending orders
      const agentsWithPendingOrders = await prisma.user.findMany({
        where: {
          role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
          isActive: true,
          assignedOrders: {
            some: {
              status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
            },
          },
        },
        include: {
          assignedOrders: {
            where: {
              status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
            },
            select: {
              id: true,
              reference: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      for (const agent of agentsWithPendingOrders) {
        const pendingCount = agent.assignedOrders.length;
        
        // Find orders older than 24 hours
        const oldOrders = agent.assignedOrders.filter(order => {
          const hoursSinceCreated = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceCreated > 24;
        });

        if (pendingCount > 0) {
          let message = `You have ${pendingCount} pending orders that need attention.`;
          if (oldOrders.length > 0) {
            message += ` ${oldOrders.length} orders are older than 24 hours and require immediate action.`;
          }

          await notificationService.createNotification({
            userId: agent.id,
            type: 'SYSTEM_ALERT',
            title: 'Pending Orders Reminder',
            message,
          });
        }
      }

      console.log(`✅ Pending order reminders sent to ${agentsWithPendingOrders.length} agents`);
    } catch (error) {
      console.error('Error sending pending order reminders:', error);
    }
  }

  /**
   * Send bulk notifications to agents based on role
   */
  async notifyAgentsByRole(
    roles: UserRole[],
    notificationData: {
      type: 'ORDER_ASSIGNMENT' | 'ORDER_UPDATE' | 'SYSTEM_ALERT' | 'SHIPPING_UPDATE';
      title: string;
      message: string;
      orderId?: string;
    }
  ) {
    try {
      const agents = await prisma.user.findMany({
        where: {
          role: { in: roles },
          isActive: true,
        },
        select: { id: true },
      });

      const userIds = agents.map(agent => agent.id);

      if (userIds.length > 0) {
        await notificationService.createBulkNotifications(userIds, notificationData);
        console.log(`✅ Bulk notification sent to ${userIds.length} agents with roles: ${roles.join(', ')}`);
      }
    } catch (error) {
      console.error('Error sending bulk notifications to agents:', error);
    }
  }

  /**
   * Notify managers about system events
   */
  async notifyManagers(notificationData: {
    type: 'ORDER_ASSIGNMENT' | 'ORDER_UPDATE' | 'SYSTEM_ALERT' | 'SHIPPING_UPDATE';
    title: string;
    message: string;
    orderId?: string;
  }) {
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'TEAM_MANAGER'] },
          isActive: true,
        },
        select: { id: true },
      });

      const userIds = managers.map(manager => manager.id);

      if (userIds.length > 0) {
        await notificationService.createBulkNotifications(userIds, notificationData);
        console.log(`✅ Manager notification sent to ${userIds.length} managers`);
      }
    } catch (error) {
      console.error('Error sending manager notifications:', error);
    }
  }

  /**
   * Handle system alerts (sync errors, API failures, etc.)
   */
  async handleSystemAlert(
    title: string,
    message: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
    metadata?: any
  ) {
    try {
      // Always notify admins for system alerts
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });

      // Notify team managers for medium and high severity alerts
      let managers: { id: string }[] = [];
      if (severity === 'MEDIUM' || severity === 'HIGH') {
        managers = await prisma.user.findMany({
          where: {
            role: 'TEAM_MANAGER',
            isActive: true,
          },
          select: { id: true },
        });
      }

      const userIds = [...admins.map(a => a.id), ...managers.map(m => m.id)];

      if (userIds.length > 0) {
        await notificationService.createBulkNotifications(userIds, {
          type: 'SYSTEM_ALERT',
          title: `[${severity}] ${title}`,
          message,
        });

        console.log(`✅ System alert (${severity}) sent to ${userIds.length} users`);
      }
    } catch (error) {
      console.error('Error handling system alert:', error);
    }
  }

  /**
   * Send performance notifications to agents
   */
  async sendPerformanceNotifications() {
    try {
      // This could be expanded to include performance metrics
      // For now, it's a placeholder for future implementation
      console.log('📊 Performance notifications feature - to be implemented');
    } catch (error) {
      console.error('Error sending performance notifications:', error);
    }
  }

  /**
   * Clean up old notifications periodically
   */
  async cleanupOldNotifications() {
    try {
      const result = await notificationService.cleanupOldNotifications(30); // 30 days
      console.log(`🧹 Cleaned up old notifications: ${result.count} removed`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

export const notificationIntegrationService = new NotificationIntegrationService();