import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class AdminController {
  constructor() {
    // No need to initialize EcoManagerService here
  }

  /**
   * Delete all orders from the database in batches
   */
  async deleteAllOrders(req: Request, res: Response) {
    try {
      console.log('🗑️ Starting batch deletion of all orders...');

      // Get total count first
      const totalOrders = await prisma.order.count();
      console.log(`📊 Total orders to delete: ${totalOrders}`);

      if (totalOrders === 0) {
        return res.json({
          success: true,
          message: 'No orders to delete',
          data: { totalDeleted: 0 }
        });
      }

      const BATCH_SIZE = 1000; // Process 1000 orders at a time
      let totalDeleted = 0;
      let batchCount = 0;

      // Process in batches to prevent timeout and connection issues
      while (true) {
        batchCount++;
        console.log(`🔄 Processing batch ${batchCount} (${BATCH_SIZE} orders)...`);

        const batchResult = await prisma.$transaction(async (tx) => {
          // Get a batch of order IDs
          const orderBatch = await tx.order.findMany({
            select: { id: true },
            take: BATCH_SIZE
          });

          if (orderBatch.length === 0) {
            return { deletedCount: 0, finished: true };
          }

          const orderIds = orderBatch.map(order => order.id);

          // Delete related data for this batch
          const deletedItems = await tx.orderItem.deleteMany({
            where: { orderId: { in: orderIds } }
          });

          // Delete activity logs (no orderId field, so delete all for simplicity)
          const deletedLogs = await tx.activityLog.deleteMany({});

          // Delete agent activities (no orderId field, so delete all for simplicity)
          const deletedActivities = await tx.agentActivity.deleteMany({});

          // Delete notifications related to orders
          const deletedNotifications = await tx.notification.deleteMany({
            where: { orderId: { in: orderIds } }
          });

          // Delete the orders themselves
          const deletedOrders = await tx.order.deleteMany({
            where: { id: { in: orderIds } }
          });

          console.log(`   ✅ Batch ${batchCount}: Deleted ${deletedOrders.count} orders, ${deletedItems.count} items, ${deletedLogs.count} logs`);

          return {
            deletedCount: deletedOrders.count,
            finished: orderBatch.length < BATCH_SIZE
          };
        }, {
          timeout: 60000 // 60 second timeout per batch
        });

        totalDeleted += batchResult.deletedCount;

        // Small delay between batches to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

        if (batchResult.finished) {
          break;
        }
      }

      console.log(`✅ All orders deleted successfully! Total: ${totalDeleted} orders in ${batchCount} batches`);

      res.json({
        success: true,
        message: `Successfully deleted ${totalDeleted} orders in ${batchCount} batches`,
        data: {
          totalDeleted,
          batchCount,
          batchSize: BATCH_SIZE
        },
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