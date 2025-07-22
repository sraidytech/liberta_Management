import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EcoManagerService } from '../../services/ecomanager.service';
import { Redis } from 'ioredis';
import redis from '../../config/redis';

const prisma = new PrismaClient();

export class StoresController {
  /**
   * Get all store configurations
   */
  static async getAllStores(req: Request, res: Response) {
    try {
      const stores = await prisma.apiConfiguration.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get additional statistics for each store
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          const totalOrders = await prisma.order.count({
            where: { storeIdentifier: store.storeIdentifier }
          });

          const lastOrder = await prisma.order.findFirst({
            where: { storeIdentifier: store.storeIdentifier },
            orderBy: { createdAt: 'desc' }
          });

          return {
            ...store,
            totalOrders,
            lastSyncTime: store.lastUsed,
            lastOrderDate: lastOrder?.createdAt || null
          };
        })
      );

      res.json({
        success: true,
        data: storesWithStats
      });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stores',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific store configuration
   */
  static async getStore(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const store = await prisma.apiConfiguration.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store configuration not found'
        });
      }

      // Get additional statistics
      const totalOrders = await prisma.order.count({
        where: { storeIdentifier: store.storeIdentifier }
      });

      const lastOrder = await prisma.order.findFirst({
        where: { storeIdentifier: store.storeIdentifier },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: {
          ...store,
          totalOrders,
          lastSyncTime: store.lastUsed,
          lastOrderDate: lastOrder?.createdAt || null
        }
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new store configuration
   */
  static async createStore(req: Request, res: Response) {
    try {
      const { storeName, storeIdentifier, apiToken, baseUrl } = req.body;
      const userId = (req as any).user.id;

      // Validate required fields
      if (!storeName || !storeIdentifier || !apiToken) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: storeName, storeIdentifier, and apiToken are required'
        });
      }

      // Validate baseUrl is provided
      if (!baseUrl || baseUrl.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Base URL is required. Please provide the EcoManager store URL (e.g., https://alphalab.ecomanager.dz)'
        });
      }

      // Ensure the URL has the API path
      let finalBaseUrl = baseUrl.trim();
      
      // Automatically append /api/shop/v2 if not already present
      if (!finalBaseUrl.endsWith('/api/shop/v2')) {
        // Remove trailing slash if present
        finalBaseUrl = finalBaseUrl.replace(/\/$/, '');
        finalBaseUrl += '/api/shop/v2';
      }

      // Validate it's an EcoManager URL
      if (!finalBaseUrl.includes('ecomanager.dz')) {
        return res.status(400).json({
          success: false,
          message: 'Base URL must be a valid EcoManager domain (*.ecomanager.dz)'
        });
      }

      // Check if storeIdentifier already exists
      const existingStore = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier }
      });

      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: 'Store identifier already exists'
        });
      }

      // Test API connection before saving
      const ecoService = new EcoManagerService({
        storeName,
        storeIdentifier,
        apiToken,
        baseUrl: finalBaseUrl
      }, redis);

      const connectionTest = await ecoService.testConnection();
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          message: 'Failed to connect to EcoManager API. Please check your API token and base URL.'
        });
      }

      // Create the store configuration
      const store = await prisma.apiConfiguration.create({
        data: {
          storeName,
          storeIdentifier,
          apiToken,
          baseUrl: finalBaseUrl,
          createdById: userId
        } as any,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Store configuration created successfully',
        data: store
      });
    } catch (error) {
      console.error('Error creating store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create store configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a store configuration
   */
  static async updateStore(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { storeName, storeIdentifier, apiToken, baseUrl, isActive } = req.body;

      // Check if store exists
      const existingStore = await prisma.apiConfiguration.findUnique({
        where: { id }
      });

      if (!existingStore) {
        return res.status(404).json({
          success: false,
          message: 'Store configuration not found'
        });
      }

      // If storeIdentifier is being changed, check for conflicts
      if (storeIdentifier && storeIdentifier !== existingStore.storeIdentifier) {
        const conflictingStore = await prisma.apiConfiguration.findUnique({
          where: { storeIdentifier }
        });

        if (conflictingStore) {
          return res.status(400).json({
            success: false,
            message: 'Store identifier already exists'
          });
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (storeName !== undefined) updateData.storeName = storeName;
      if (storeIdentifier !== undefined) updateData.storeIdentifier = storeIdentifier;
      if (apiToken !== undefined) updateData.apiToken = apiToken;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (isActive !== undefined) updateData.isActive = isActive;

      // If API credentials are being updated, test the connection
      if (apiToken || baseUrl) {
        const finalBaseUrl = baseUrl || (existingStore as any).baseUrl;
        const finalApiToken = apiToken || existingStore.apiToken;
        const finalStoreName = storeName || existingStore.storeName;
        const finalStoreIdentifier = storeIdentifier || existingStore.storeIdentifier;

        const ecoService = new EcoManagerService({
          storeName: finalStoreName,
          storeIdentifier: finalStoreIdentifier,
          apiToken: finalApiToken,
          baseUrl: finalBaseUrl
        }, redis);

        const connectionTest = await ecoService.testConnection();
        if (!connectionTest) {
          return res.status(400).json({
            success: false,
            message: 'Failed to connect to EcoManager API. Please check your API token and base URL.'
          });
        }
      }

      // Update the store configuration
      const updatedStore = await prisma.apiConfiguration.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Store configuration updated successfully',
        data: updatedStore
      });
    } catch (error) {
      console.error('Error updating store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update store configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Toggle store active status
   */
  static async toggleStoreStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const store = await prisma.apiConfiguration.findUnique({
        where: { id }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store configuration not found'
        });
      }

      const updatedStore = await prisma.apiConfiguration.update({
        where: { id },
        data: {
          isActive: !store.isActive
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: `Store ${updatedStore.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedStore
      });
    } catch (error) {
      console.error('Error toggling store status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle store status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a store configuration
   */
  static async deleteStore(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const store = await prisma.apiConfiguration.findUnique({
        where: { id }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store configuration not found'
        });
      }

      // Check if there are orders associated with this store
      const orderCount = await prisma.order.count({
        where: { storeIdentifier: store.storeIdentifier }
      });

      if (orderCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete store configuration. There are ${orderCount} orders associated with this store.`
        });
      }

      await prisma.apiConfiguration.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Store configuration deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete store configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test API connection for a store
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const { storeName, storeIdentifier, apiToken, baseUrl } = req.body;

      if (!storeName || !storeIdentifier || !apiToken) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: storeName, storeIdentifier, and apiToken are required'
        });
      }

      // Validate baseUrl is provided
      if (!baseUrl || baseUrl.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Base URL is required for connection testing'
        });
      }

      // Ensure the URL has the API path
      let finalBaseUrl = baseUrl.trim();
      
      // Automatically append /api/shop/v2 if not already present
      if (!finalBaseUrl.endsWith('/api/shop/v2')) {
        // Remove trailing slash if present
        finalBaseUrl = finalBaseUrl.replace(/\/$/, '');
        finalBaseUrl += '/api/shop/v2';
      }

      // Validate it's an EcoManager URL
      if (!finalBaseUrl.includes('ecomanager.dz')) {
        return res.status(400).json({
          success: false,
          message: 'Base URL must be a valid EcoManager domain (*.ecomanager.dz)'
        });
      }

      const ecoService = new EcoManagerService({
        storeName,
        storeIdentifier,
        apiToken,
        baseUrl: finalBaseUrl
      }, redis);

      const connectionTest = await ecoService.testConnection();

      if (connectionTest) {
        res.json({
          success: true,
          message: 'API connection successful'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to connect to EcoManager API. Please check your credentials.'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test API connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get rate limit status for all stores
   */
  static async getRateLimitStatus(req: Request, res: Response) {
    try {
      const stores = await prisma.apiConfiguration.findMany({
        where: { isActive: true },
        select: {
          id: true,
          storeName: true,
          storeIdentifier: true,
          baseUrl: true
        }
      });

      const rateLimitStatuses = await Promise.all(
        stores.map(async (store) => {
          try {
            if (!store.baseUrl) {
              throw new Error('Base URL is missing for this store');
            }

            const ecoService = new EcoManagerService({
              storeName: store.storeName,
              storeIdentifier: store.storeIdentifier,
              apiToken: 'dummy', // We only need rate limit status, not actual API calls
              baseUrl: store.baseUrl
            }, redis);

            const rateLimitStatus = await ecoService.getRateLimitStatus();
            
            return {
              storeId: store.id,
              storeName: store.storeName,
              storeIdentifier: store.storeIdentifier,
              rateLimits: rateLimitStatus,
              status: 'active'
            };
          } catch (error) {
            return {
              storeId: store.id,
              storeName: store.storeName,
              storeIdentifier: store.storeIdentifier,
              rateLimits: null,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      res.json({
        success: true,
        data: rateLimitStatuses,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get rate limit status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get rate limit status for a specific store
   */
  static async getStoreRateLimitStatus(req: Request, res: Response) {
    try {
      const { storeIdentifier } = req.params;

      const store = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier },
        select: {
          id: true,
          storeName: true,
          storeIdentifier: true,
          apiToken: true,
          baseUrl: true,
          isActive: true
        }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      if (!store.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Store is not active'
        });
      }

      if (!store.baseUrl) {
        throw new Error(`Base URL is missing for store ${store.storeName}`);
      }

      const ecoService = new EcoManagerService({
        storeName: store.storeName,
        storeIdentifier: store.storeIdentifier,
        apiToken: store.apiToken,
        baseUrl: store.baseUrl
      }, redis);

      const rateLimitStatus = await ecoService.getRateLimitStatus();

      res.json({
        success: true,
        data: {
          storeId: store.id,
          storeName: store.storeName,
          storeIdentifier: store.storeIdentifier,
          rateLimits: rateLimitStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting store rate limit status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get store rate limit status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sync orders for a specific store
   */
  static async syncStoreOrders(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fullSync = false } = req.body;

      // Get store configuration
      const store = await prisma.apiConfiguration.findUnique({
        where: { id }
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store configuration not found'
        });
      }

      if (!store.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Store is not active. Please activate the store before syncing.'
        });
      }

      // Validate required configuration
      if (!store.baseUrl) {
        return res.status(400).json({
          success: false,
          message: `Base URL is missing for store ${store.storeName}. Please update the store configuration.`
        });
      }

      if (!store.apiToken) {
        return res.status(400).json({
          success: false,
          message: `API token is missing for store ${store.storeName}. Please update the store configuration.`
        });
      }

      console.log(`🔄 Starting manual sync for store: ${store.storeName} (${store.storeIdentifier})`);
      console.log(`   - Sync Type: ${fullSync ? 'Full Sync' : 'Incremental Sync'}`);
      console.log(`   - Requested by: ${(req as any).user?.name || 'Unknown'}`);

      // Import SyncService dynamically to avoid circular dependencies
      const { SyncService } = await import('../../services/sync.service');
      const syncService = new SyncService(redis);

      // Perform the sync
      const syncStartTime = Date.now();
      const result = await syncService.manualSync(store.storeIdentifier, fullSync);
      const syncDuration = Date.now() - syncStartTime;

      console.log(`✅ Manual sync completed for ${store.storeName}:`);
      console.log(`   - Duration: ${(syncDuration / 1000).toFixed(1)}s`);
      console.log(`   - Orders Synced: ${result.syncedCount || 0}`);
      console.log(`   - Errors: ${result.errorCount || 0}`);

      // Update last used time
      await prisma.apiConfiguration.update({
        where: { id },
        data: { lastUsed: new Date() }
      });

      res.json({
        success: true,
        message: `Store sync completed successfully for ${store.storeName}`,
        data: {
          storeName: store.storeName,
          storeIdentifier: store.storeIdentifier,
          syncType: fullSync ? 'full' : 'incremental',
          syncedCount: result.syncedCount || 0,
          errorCount: result.errorCount || 0,
          totalFetched: result.totalFetched || 0,
          duration: syncDuration,
          timestamp: new Date().toISOString(),
          ...result
        }
      });
    } catch (error) {
      console.error('Error syncing store orders:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to sync store orders';
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'API access forbidden. Please check your API token.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please check your network connection.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
