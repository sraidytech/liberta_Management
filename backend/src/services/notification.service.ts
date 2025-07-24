import { prisma } from '../config/database';
import redis from '../config/redis';
import { NotificationType, UserRole } from '@prisma/client';

export interface CreateNotificationData {
  userId: string;
  orderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
}

export interface BatchedNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  isRead?: boolean;
  orderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData) {
    try {
      // ORDER_ASSIGNMENT notifications are completely disabled
      if (data.type === 'ORDER_ASSIGNMENT') {
        console.log(`📋 ORDER_ASSIGNMENT notification blocked: ${data.title}`);
        return null;
      }

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          orderId: data.orderId,
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          order: {
            select: {
              id: true,
              reference: true,
              status: true,
              customer: {
                select: {
                  fullName: true,
                  telephone: true,
                },
              },
            },
          },
        },
      });

      // Send real-time notification via Socket.IO
      await this.sendRealTimeNotification(notification);

      // Cache notification for quick access
      await this.cacheNotification(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Create bulk notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'userId'>
  ) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId =>
          this.createNotification({
            ...notificationData,
            userId,
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: Omit<NotificationFilters, 'userId'> = {}
  ) {
    try {
      const skip = (page - 1) * limit;

      // Get user role to determine filtering logic
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      const where: any = {
        userId,
        ...filters,
      };

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      // For COORDINATEUR users, filter notifications by assigned products
      if (user?.role === 'COORDINATEUR') {
        // Get user's assigned product names
        const userProductAssignments = await prisma.userProductAssignment.findMany({
          where: {
            userId,
            isActive: true
          },
          select: { productName: true }
        });

        const assignedProductNames = userProductAssignments.map(assignment => assignment.productName);

        if (assignedProductNames.length > 0) {
          // Only show notifications for orders that contain assigned products
          where.order = {
            items: {
              some: {
                title: {
                  in: assignedProductNames
                }
              }
            }
          };
        } else {
          // If no products assigned, show no order-related notifications
          where.orderId = null;
        }
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                reference: true,
                status: true,
                customer: {
                  select: {
                    fullName: true,
                    telephone: true,
                  },
                },
                items: {
                  select: {
                    productId: true,
                    title: true,
                    quantity: true,
                    unitPrice: true
                  }
                }
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true,
        },
      });

      // Update cache
      await this.updateNotificationCache(notification);

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user OR all notifications (admin only)
   */
  async markAllAsRead(userId?: string, isAdmin: boolean = false) {
    try {
      let result;
      
      if (isAdmin && !userId) {
        // Admin marking ALL notifications in the system as read
        result = await prisma.notification.updateMany({
          where: {
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        // Clear all notification caches
        const keys = await redis.keys('notifications:user:*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else if (userId) {
        // Mark all notifications for a specific user
        result = await prisma.notification.updateMany({
          where: {
            userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        // Clear user's notification cache
        await redis.del(`notifications:user:${userId}`);
      } else {
        throw new Error('Invalid parameters for markAllAsRead');
      }

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete all notifications (Admin only)
   */
  async deleteAllNotifications() {
    try {
      const result = await prisma.notification.deleteMany({});

      // Clear all notification caches
      const keys = await redis.keys('notifications:user:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return result;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw new Error('Failed to delete all notifications');
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try to get from cache first
      const cached = await redis.get(`notifications:unread:${userId}`);
      if (cached !== null) {
        return parseInt(cached, 10);
      }

      // Get from database
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      // Cache for 5 minutes
      await redis.setex(`notifications:unread:${userId}`, 300, count.toString());

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true, // Only delete read notifications
        },
      });

      console.log(`🧹 Cleaned up ${result.count} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw new Error('Failed to cleanup old notifications');
    }
  }

  /**
   * Send real-time notification via Socket.IO
   */
  private async sendRealTimeNotification(notification: any) {
    try {
      const io = (global as any).io;
      if (!io) return;

      // Send to specific user
      io.to(`user_${notification.userId}`).emit('new_notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.orderId,
        order: notification.order,
        createdAt: notification.createdAt,
        isRead: false,
      });

      // Send to agents room if it's an agent notification
      if (notification.user?.role === 'AGENT_SUIVI' || notification.user?.role === 'AGENT_CALL_CENTER') {
        io.to('agents').emit('agent_notification', {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          orderId: notification.orderId,
        });
      }

      // Send to managers room for important notifications
      if (notification.type === 'SYSTEM_ALERT' || notification.type === 'ORDER_UPDATE') {
        io.to('managers').emit('manager_notification', {
          type: notification.type,
          title: notification.title,
          userId: notification.userId,
          orderId: notification.orderId,
        });
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Cache notification for quick access
   */
  private async cacheNotification(notification: any) {
    try {
      // Cache user's unread count (invalidate)
      await redis.del(`notifications:unread:${notification.userId}`);

      // Cache recent notifications for user
      const cacheKey = `notifications:recent:${notification.userId}`;
      const recentNotifications = await redis.lrange(cacheKey, 0, 9); // Get last 10
      
      // Add new notification to the beginning
      await redis.lpush(cacheKey, JSON.stringify({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        orderId: notification.orderId,
        createdAt: notification.createdAt,
        isRead: false,
      }));

      // Keep only last 10 notifications
      await redis.ltrim(cacheKey, 0, 9);
      
      // Set expiration (1 hour)
      await redis.expire(cacheKey, 3600);
    } catch (error) {
      console.error('Error caching notification:', error);
    }
  }

  /**
   * Update notification cache when marked as read
   */
  private async updateNotificationCache(notification: any) {
    try {
      // Invalidate unread count cache
      await redis.del(`notifications:unread:${notification.userId}`);
      
      // Update recent notifications cache
      const cacheKey = `notifications:recent:${notification.userId}`;
      const recentNotifications = await redis.lrange(cacheKey, 0, -1);
      
      // Update the specific notification in cache
      const updatedNotifications = recentNotifications.map(item => {
        const parsed = JSON.parse(item);
        if (parsed.id === notification.id) {
          parsed.isRead = true;
        }
        return JSON.stringify(parsed);
      });

      // Replace cache
      if (updatedNotifications.length > 0) {
        await redis.del(cacheKey);
        await redis.lpush(cacheKey, ...updatedNotifications);
        await redis.expire(cacheKey, 3600);
      }
    } catch (error) {
      console.error('Error updating notification cache:', error);
    }
  }

  // Agent-specific notification methods

  /**
   * Notify agent about new order assignment
   */
  async notifyOrderAssignment(agentId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            fullName: true,
            telephone: true,
            wilaya: true,
          },
        },
      },
    });

    if (!order) return;

    return this.createNotification({
      userId: agentId,
      orderId,
      type: 'ORDER_ASSIGNMENT',
      title: 'New Order Assigned',
      message: `Order ${order.reference} has been assigned to you. Customer: ${order.customer.fullName} (${order.customer.telephone})`,
    });
  }

  /**
   * Notify about order status change
   */
  async notifyOrderStatusChange(orderId: string, newStatus: string, oldStatus: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        assignedAgent: {
          select: { id: true },
        },
        customer: {
          select: { fullName: true },
        },
      },
    });

    if (!order || !order.assignedAgent) return;

    return this.createNotification({
      userId: order.assignedAgent.id,
      orderId,
      type: 'ORDER_UPDATE',
      title: 'Order Status Updated',
      message: `Order ${order.reference} status changed from ${oldStatus} to ${newStatus}`,
    });
  }

  /**
   * Notify about pending orders that need attention
   */
  async notifyPendingOrderReminder(agentId: string, orderCount: number) {
    return this.createNotification({
      userId: agentId,
      type: 'SYSTEM_ALERT',
      title: 'Pending Orders Reminder',
      message: `You have ${orderCount} pending orders that need attention. Please review and update their status.`,
    });
  }

  /**
   * Notify about shipping updates
   */
  async notifyShippingUpdate(orderId: string, trackingNumber: string, status: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        assignedAgent: {
          select: { id: true },
        },
      },
    });

    if (!order || !order.assignedAgent) return;

    return this.createNotification({
      userId: order.assignedAgent.id,
      orderId,
      type: 'SHIPPING_UPDATE',
      title: 'Shipping Update',
      message: `Order ${order.reference} shipping status: ${status}. Tracking: ${trackingNumber}`,
    });
  }

  /**
   * Handle order assignment notifications with smart aggregation
   * If multiple orders are assigned to the same user within a short time, aggregate them
   */
  private async handleOrderAssignmentNotification(data: CreateNotificationData) {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      // Check for recent assignment notifications for this user
      const recentAssignments = await prisma.notification.findMany({
        where: {
          userId: data.userId,
          type: 'ORDER_ASSIGNMENT',
          createdAt: {
            gte: twoMinutesAgo,
          },
        },
        include: {
          order: {
            select: { reference: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // If there are recent assignments, update the existing notification
      if (recentAssignments.length > 0) {
        const latestNotification = recentAssignments[0];
        const totalAssignments = recentAssignments.length + 1; // +1 for current assignment
        
        // Get the current order reference
        const currentOrder = await prisma.order.findUnique({
          where: { id: data.orderId },
          select: { reference: true },
        });

        // Update the existing notification with aggregated info
        const updatedNotification = await prisma.notification.update({
          where: { id: latestNotification.id },
          data: {
            title: `${totalAssignments} Orders Assigned`,
            message: `${totalAssignments} orders have been assigned to you, including ${currentOrder?.reference}. Check your orders list for details.`,
            isRead: false, // Mark as unread again since it's updated
            createdAt: new Date(), // Update timestamp
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            order: {
              select: {
                id: true,
                reference: true,
                status: true,
                customer: {
                  select: {
                    fullName: true,
                    telephone: true,
                    wilaya: true,
                    commune: true,
                  },
                },
              },
            },
          },
        });

        // Cache and send real-time notification
        await this.cacheNotification(updatedNotification);
        
        console.log(`📦 Aggregated notification: ${totalAssignments} orders assigned to user ${data.userId}`);
        return updatedNotification;
      }

      // If no recent assignments, create a new notification
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          orderId: data.orderId,
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          order: {
            select: {
              id: true,
              reference: true,
              status: true,
              customer: {
                select: {
                  fullName: true,
                  telephone: true,
                  wilaya: true,
                  commune: true,
                },
              },
            },
          },
        },
      });

      // Cache and send real-time notification
      await this.cacheNotification(notification);
      
      console.log(`✅ New assignment notification created for user ${data.userId}`);
      return notification;
    } catch (error) {
      console.error('Error handling order assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create bulk notification for any bulk operation
   */
  async createBulkNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    count: number;
    operation: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: `${data.operation}: ${data.count} items`,
          message: data.message,
          isRead: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Cache and send real-time notification
      await this.cacheNotification(notification);
      
      console.log(`📦 Bulk notification created: ${data.operation} - ${data.count} items for user ${data.userId}`);
      return notification;
    } catch (error) {
      console.error('Error creating bulk notification:', error);
      throw error;
    }
  }

  /**
   * Create optimized batched notification for deadline alerts
   */
  async createBatchedDeadlineNotification(
    userId: string,
    title: string,
    message: string,
    orderIds?: string[]
  ) {
    try {
      const notification = await this.createNotification({
        userId,
        orderId: orderIds?.[0], // Use first order as primary reference
        type: 'SYSTEM_ALERT' as NotificationType,
        title,
        message
      });

      console.log(`📦 Batched deadline notification created: ${title} for user ${userId} (${orderIds?.length || 0} orders)`);
      return notification;
    } catch (error) {
      console.error('Error creating batched deadline notification:', error);
      throw new Error('Failed to create batched deadline notification');
    }
  }

  /**
   * Get notification statistics for monitoring
   */
  async getNotificationStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'hour':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
      }

      const notifications = await prisma.notification.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        select: {
          type: true
        }
      });

      const stats = {
        total: notifications.length,
        byType: {} as Record<string, number>
      };

      notifications.forEach(notification => {
        // Count by type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        byType: {}
      };
    }
  }

  /**
   * Clean up old deadline notifications specifically
   */
  async cleanupOldDeadlineNotifications(daysOld: number = 7): Promise<{ count: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean up old SYSTEM_ALERT notifications that are read
      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true,
          type: 'SYSTEM_ALERT', // Our deadline notifications use SYSTEM_ALERT type
          title: {
            contains: 'orders need attention' // Only delete deadline-related notifications
          }
        },
      });

      console.log(`🧹 Cleaned up ${result.count} old deadline notifications (older than ${daysOld} days)`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old deadline notifications:', error);
      return { count: 0 };
    }
  }
}

export const notificationService = new NotificationService();
