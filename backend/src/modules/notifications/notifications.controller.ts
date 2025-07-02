import { Request, Response } from 'express';
import { notificationService } from '@/services/notification.service';
import { NotificationType } from '@prisma/client';

export class NotificationController {
  /**
   * Get user notifications with pagination and filters
   */
  async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const type = req.query.type as NotificationType;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
      const orderId = req.query.orderId as string;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const result = await notificationService.getUserNotifications(userId, page, limit, {
        type,
        isRead,
        orderId,
        dateFrom,
        dateTo,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch notifications',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
      }

      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch unread count',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const notificationId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
      }

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Notification ID is required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
      }

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to mark notification as read',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
      }

      const userRole = req.user?.role;
      const targetUserId = req.body?.userId; // Optional: specific user ID for admin
      
      let result;
      let message;

      if (userRole === 'ADMIN' && !targetUserId) {
        // Admin marking ALL notifications in the system as read
        result = await notificationService.markAllAsRead(undefined, true);
        message = `All ${result.count} notifications in the system marked as read`;
      } else if (userRole === 'ADMIN' && targetUserId) {
        // Admin marking all notifications for a specific user as read
        result = await notificationService.markAllAsRead(targetUserId, false);
        message = `All ${result.count} notifications for user marked as read`;
      } else {
        // Regular user marking their own notifications as read
        result = await notificationService.markAllAsRead(userId, false);
        message = `All ${result.count} of your notifications marked as read`;
      }

      res.json({
        success: true,
        data: {
          updatedCount: result.count,
          message,
        },
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to mark all notifications as read',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Delete all notifications (Admin only)
   */
  async deleteAllNotifications(req: Request, res: Response) {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only administrators can delete all notifications',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const result = await notificationService.deleteAllNotifications();

      res.json({
        success: true,
        data: {
          deletedCount: result.count,
          message: `Successfully deleted ${result.count} notifications`,
        },
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete all notifications',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Create notification (Admin only)
   */
  async createNotification(req: Request, res: Response) {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'TEAM_MANAGER') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const { userId, orderId, type, title, message } = req.body;

      if (!userId || !type || !title || !message) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: userId, type, title, message',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
      }

      const notification = await notificationService.createNotification({
        userId,
        orderId,
        type,
        title,
        message,
      });

      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully',
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create notification',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Create bulk notifications (Admin only)
   */
  async createBulkNotifications(req: Request, res: Response) {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'TEAM_MANAGER') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      const { userIds, orderId, type, title, message } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !type || !title || !message) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: userIds (array), type, title, message',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
          },
        });
      }

      const notifications = await notificationService.createBulkNotifications(userIds, {
        orderId,
        type,
        title,
        message,
      });

      res.status(201).json({
        success: true,
        data: notifications,
        message: `${notifications.length} notifications created successfully`,
      });
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create bulk notifications',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Get notification statistics (Admin/Manager only)
   */
  async getNotificationStats(req: Request, res: Response) {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'TEAM_MANAGER') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
            statusCode: 403,
          },
        });
      }

      // This could be expanded with more detailed statistics
      const stats = {
        message: 'Notification statistics endpoint - to be implemented with specific metrics',
        available_endpoints: [
          'GET /api/v1/notifications - Get user notifications',
          'GET /api/v1/notifications/unread-count - Get unread count',
          'PUT /api/v1/notifications/:id/read - Mark as read',
          'PUT /api/v1/notifications/mark-all-read - Mark all as read',
          'POST /api/v1/notifications - Create notification (Admin)',
          'POST /api/v1/notifications/bulk - Create bulk notifications (Admin)',
        ],
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch notification statistics',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }

  /**
   * Test notification endpoint (Development only)
   */
  async testNotification(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Endpoint not available in production',
            code: 'NOT_FOUND',
            statusCode: 404,
          },
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
            statusCode: 401,
          },
        });
      }

      const notification = await notificationService.createNotification({
        userId,
        type: 'SYSTEM_ALERT',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working correctly.',
      });

      res.json({
        success: true,
        data: notification,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send test notification',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
        },
      });
    }
  }
}
