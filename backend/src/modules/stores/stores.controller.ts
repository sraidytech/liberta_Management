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

      // Set default baseUrl if not provided
      const finalBaseUrl = baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';

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

      const finalBaseUrl = baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';

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
}