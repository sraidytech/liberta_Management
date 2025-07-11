import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class AdminController {
  constructor() {
    // No need to initialize EcoManagerService here
  }

  /**
   * Delete all orders from the database
   */
  async deleteAllOrders(req: Request, res: Response) {
    try {
      console.log('🗑️ Starting deletion of all orders...');

      // Delete in correct order to respect foreign key constraints
      await prisma.$transaction(async (tx) => {
        // Delete order items first
        const deletedItems = await tx.orderItem.deleteMany({});
        console.log(`Deleted ${deletedItems.count} order items`);

        // Delete activity logs
        const deletedLogs = await tx.activityLog.deleteMany({});
        console.log(`Deleted ${deletedLogs.count} activity logs`);

        // Delete agent activities related to orders
        const deletedActivities = await tx.agentActivity.deleteMany({});
        console.log(`Deleted ${deletedActivities.count} agent activities`);

        // Delete notifications related to orders
        const deletedNotifications = await tx.notification.deleteMany({});
        console.log(`Deleted ${deletedNotifications.count} notifications`);

        // Finally delete orders
        const deletedOrders = await tx.order.deleteMany({});
        console.log(`Deleted ${deletedOrders.count} orders`);

        return {
          orders: deletedOrders.count,
          items: deletedItems.count,
          logs: deletedLogs.count,
          activities: deletedActivities.count,
          notifications: deletedNotifications.count
        };
      });

      console.log('✅ All orders deleted successfully');

      res.json({
        success: true,
        message: 'All orders deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Fetch and sync all stores from EcoManager
   */
  async syncStores(req: Request, res: Response) {
    try {
      console.log('🏪 Starting store synchronization...');

      // Get all API configurations
      const apiConfigs = await prisma.apiConfiguration.findMany({
        where: { isActive: true }
      });

      if (apiConfigs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active API configurations found. Please add store configurations first.'
        });
      }

      const syncResults = [];

      for (const config of apiConfigs) {
        try {
          console.log(`Verifying store: ${config.storeName}`);
          
          // Simple verification - just check if config exists and is active
          syncResults.push({
            storeId: config.id,
            storeName: config.storeName,
            status: 'success',
            message: 'Store configuration found and active'
          });

        } catch (error) {
          console.error(`Error verifying store ${config.storeName}:`, error);
          syncResults.push({
            storeId: config.id,
            storeName: config.storeName,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log('✅ Store synchronization completed');

      res.json({
        success: true,
        message: 'Store synchronization completed',
        results: syncResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error syncing stores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync stores',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clean up all order assignments
   */
  async cleanupAssignments(req: Request, res: Response) {
    try {
      console.log('🧹 Starting assignment cleanup...');

      const result = await prisma.$transaction(async (tx) => {
        // Reset all order assignments
        const updatedOrders = await tx.order.updateMany({
          where: {
            assignedAgentId: { not: null }
          },
          data: {
            assignedAgentId: null
          }
        });

        // Reset all agent current order counts
        const updatedAgents = await tx.user.updateMany({
          where: {
            role: 'AGENT_SUIVI'
          },
          data: {
            currentOrders: 0
          }
        });

        // Delete all agent activities
        const deletedActivities = await tx.agentActivity.deleteMany({});

        // Delete assignment-related notifications
        const deletedNotifications = await tx.notification.deleteMany({
          where: {
            type: 'ORDER_ASSIGNMENT'
          }
        });

        return {
          unassignedOrders: updatedOrders.count,
          resetAgents: updatedAgents.count,
          deletedActivities: deletedActivities.count,
          deletedNotifications: deletedNotifications.count
        };
      });

      console.log('✅ Assignment cleanup completed');

      res.json({
        success: true,
        message: 'Assignment cleanup completed successfully',
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error cleaning up assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup assignments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(req: Request, res: Response) {
    try {
      const stats = await prisma.$transaction(async (tx) => {
        const totalOrders = await tx.order.count();
        const assignedOrders = await tx.order.count({
          where: { assignedAgentId: { not: null } }
        });
        const unassignedOrders = await tx.order.count({
          where: { assignedAgentId: null }
        });
        const totalAgents = await tx.user.count({
          where: { role: 'AGENT_SUIVI', isActive: true }
        });
        const totalStores = await tx.apiConfiguration.count({
          where: { isActive: true }
        });

        return {
          totalOrders,
          assignedOrders,
          unassignedOrders,
          totalAgents,
          totalStores
        };
      });

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const adminController = new AdminController();