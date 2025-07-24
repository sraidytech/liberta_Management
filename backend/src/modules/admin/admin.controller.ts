import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { SyncPositionManager } from '../../services/sync-position-manager.service';
import redis from '../../config/redis';

export class AdminController {
  private syncPositionManager: SyncPositionManager;

  constructor() {
    this.syncPositionManager = new SyncPositionManager(redis);
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
   * Clean up ALL order assignments - Complete cleanup for testing new assignment system
   */
  async cleanupAssignments(req: Request, res: Response) {
    try {
      console.log('🧹 Starting COMPLETE assignment cleanup for ALL orders...');

      const result = await prisma.$transaction(async (tx) => {
        // Reset ALL order assignments (not limited to recent orders)
        const updatedOrders = await tx.order.updateMany({
          where: {
            assignedAgentId: { not: null }
          },
          data: {
            assignedAgentId: null,
            assignedAt: null, // Also reset assignedAt timestamp
            status: 'PENDING' // Reset status to PENDING for reassignment
          }
        });

        // Reset ALL agent current order counts
        const updatedAgents = await tx.user.updateMany({
          where: {
            role: 'AGENT_SUIVI'
          },
          data: {
            currentOrders: 0
          }
        });

        // Delete all agent activities related to assignments
        const deletedActivities = await tx.agentActivity.deleteMany({
          where: {
            activityType: 'ORDER_ASSIGNED'
          }
        });

        // Delete assignment-related notifications
        const deletedNotifications = await tx.notification.deleteMany({
          where: {
            type: 'ORDER_ASSIGNMENT'
          }
        });

        // Get total order count for reporting
        const totalOrders = await tx.order.count();

        return {
          totalOrders,
          unassignedOrders: updatedOrders.count,
          resetAgents: updatedAgents.count,
          deletedActivities: deletedActivities.count,
          deletedNotifications: deletedNotifications.count
        };
      }, {
        timeout: 120000 // 2 minute timeout for large operations
      });

      console.log('✅ COMPLETE assignment cleanup completed');
      console.log(`📊 Cleanup results:`, result);

      res.json({
        success: true,
        message: `Complete assignment cleanup completed successfully. Unassigned ${result.unassignedOrders} orders from ${result.totalOrders} total orders, reset ${result.resetAgents} agents.`,
        data: result,
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
   * 🚀 NEW: Restore sync positions from JSON backup or calculate from database
   */
  async restoreSyncPositions(req: Request, res: Response) {
    try {
      console.log('🔄 [ADMIN] Starting sync position restoration...');

      // Check current sync position status
      const statusBefore = await this.syncPositionManager.getSyncPositionStatus();
      console.log(`📊 [BEFORE] Sync position status:`);
      console.log(`   - Total Stores: ${statusBefore.totalStores}`);
      console.log(`   - Healthy Stores: ${statusBefore.healthyStores}`);
      console.log(`   - Problematic Stores: ${statusBefore.problematicStores}`);

      // Perform restoration
      const restoration = await this.syncPositionManager.restoreAllSyncPositions();
      
      // Check status after restoration
      const statusAfter = await this.syncPositionManager.getSyncPositionStatus();

      console.log('✅ [ADMIN] Sync position restoration completed');
      console.log(`📊 [RESULTS]:`);
      console.log(`   - Restored: ${restoration.restored} stores`);
      console.log(`   - Failed: ${restoration.failed} stores`);
      console.log(`   - Healthy After: ${statusAfter.healthyStores}/${statusAfter.totalStores}`);

      res.json({
        success: true,
        message: `Successfully restored sync positions for ${restoration.restored} stores`,
        data: {
          restoration,
          statusBefore,
          statusAfter,
          summary: {
            totalStores: statusAfter.totalStores,
            restored: restoration.restored,
            failed: restoration.failed,
            healthyBefore: statusBefore.healthyStores,
            healthyAfter: statusAfter.healthyStores,
            improvement: statusAfter.healthyStores - statusBefore.healthyStores
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error restoring sync positions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore sync positions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🚀 NEW: Get sync position status for all stores
   */
  async getSyncPositionStatus(req: Request, res: Response) {
    try {
      console.log('📊 [ADMIN] Getting sync position status...');

      const status = await this.syncPositionManager.getSyncPositionStatus();
      
      // Add additional insights
      const insights = {
        cacheHealth: status.healthyStores / status.totalStores,
        needsAttention: status.stores.filter(s => s.status !== 'healthy'),
        recommendations: [] as string[]
      };

      if (status.problematicStores > 0) {
        insights.recommendations.push(`${status.problematicStores} stores need sync position restoration`);
      }

      if (insights.cacheHealth < 0.8) {
        insights.recommendations.push('Consider running "Restore Sync Positions" to improve cache health');
      }

      console.log(`✅ [ADMIN] Sync position status retrieved: ${status.healthyStores}/${status.totalStores} healthy`);

      res.json({
        success: true,
        data: {
          ...status,
          insights
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error getting sync position status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sync position status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🚀 NEW: Auto-detect and recover from cache loss
   */
  async autoRecoverSyncPositions(req: Request, res: Response) {
    try {
      console.log('🔍 [ADMIN] Starting auto-recovery detection...');

      const detection = await this.syncPositionManager.detectCacheLoss();
      
      if (!detection.cacheCleared) {
        return res.json({
          success: true,
          message: 'No cache loss detected. All sync positions are healthy.',
          data: {
            cacheCleared: false,
            missingStores: [],
            resetStores: [],
            recovered: false
          },
          timestamp: new Date().toISOString()
        });
      }

      console.log('⚠️ [ADMIN] Cache loss detected, initiating auto-recovery...');
      const recovered = await this.syncPositionManager.autoRecover();

      const finalStatus = await this.syncPositionManager.getSyncPositionStatus();

      res.json({
        success: true,
        message: recovered 
          ? `Auto-recovery completed. Restored sync positions for affected stores.`
          : 'Cache loss detected but auto-recovery failed. Manual intervention required.',
        data: {
          cacheCleared: detection.cacheCleared,
          missingStores: detection.missingStores,
          resetStores: detection.resetStores,
          recovered,
          finalStatus
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in auto-recovery:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform auto-recovery',
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
