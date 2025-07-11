import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import redis from '@/config/redis';

export class WilayaSettingsController {
  /**
   * Get all wilaya delivery settings
   */
  async getWilayaSettings(req: Request, res: Response) {
    try {
      const cacheKey = 'wilaya:settings:all';
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }

      const settings = await prisma.wilayaDeliverySettings.findMany({
        where: { isActive: true },
        orderBy: { wilayaName: 'asc' }
      });

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(settings));

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching wilaya settings:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch wilaya settings',
          code: 'WILAYA_SETTINGS_FETCH_ERROR'
        }
      });
    }
  }

  /**
   * Get unique wilayas from existing orders
   */
  async getUniqueWilayas(req: Request, res: Response) {
    try {
      const cacheKey = 'wilaya:unique:orders';
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }

      // Get unique wilayas from customers who have orders
      const uniqueWilayas = await prisma.customer.findMany({
        select: { wilaya: true },
        distinct: ['wilaya'],
        where: {
          orders: {
            some: {}
          }
        },
        orderBy: { wilaya: 'asc' }
      });

      const wilayaList = uniqueWilayas.map(customer => customer.wilaya);

      // Cache for 30 minutes
      await redis.setex(cacheKey, 1800, JSON.stringify(wilayaList));

      res.json({
        success: true,
        data: wilayaList
      });
    } catch (error) {
      console.error('Error fetching unique wilayas:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch unique wilayas',
          code: 'UNIQUE_WILAYAS_FETCH_ERROR'
        }
      });
    }
  }

  /**
   * Create or update wilaya delivery settings
   */
  async upsertWilayaSettings(req: Request, res: Response) {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Settings must be an array',
            code: 'INVALID_SETTINGS_FORMAT'
          }
        });
      }

      const results = [];

      for (const setting of settings) {
        const { wilayaName, maxDeliveryDays } = setting;

        if (!wilayaName || typeof maxDeliveryDays !== 'number') {
          continue;
        }

        const upserted = await prisma.wilayaDeliverySettings.upsert({
          where: { wilayaName },
          update: { 
            maxDeliveryDays,
            updatedAt: new Date()
          },
          create: {
            wilayaName,
            maxDeliveryDays
          }
        });

        results.push(upserted);
      }

      // Clear cache
      await redis.del('wilaya:settings:all');
      await redis.del('wilaya:unique:orders');

      res.json({
        success: true,
        data: results,
        message: `Updated ${results.length} wilaya settings`
      });
    } catch (error) {
      console.error('Error upserting wilaya settings:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update wilaya settings',
          code: 'WILAYA_SETTINGS_UPSERT_ERROR'
        }
      });
    }
  }

  /**
   * Update specific wilaya setting
   */
  async updateWilayaSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { maxDeliveryDays, isActive } = req.body;

      const updated = await prisma.wilayaDeliverySettings.update({
        where: { id },
        data: {
          ...(typeof maxDeliveryDays === 'number' && { maxDeliveryDays }),
          ...(typeof isActive === 'boolean' && { isActive }),
          updatedAt: new Date()
        }
      });

      // Clear cache
      await redis.del('wilaya:settings:all');

      res.json({
        success: true,
        data: updated,
        message: 'Wilaya setting updated successfully'
      });
    } catch (error) {
      console.error('Error updating wilaya setting:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update wilaya setting',
          code: 'WILAYA_SETTING_UPDATE_ERROR'
        }
      });
    }
  }

  /**
   * Initialize wilaya settings from existing orders
   */
  async initializeWilayaSettings(req: Request, res: Response) {
    try {
      // Get unique wilayas from orders
      const uniqueWilayas = await prisma.customer.findMany({
        select: { wilaya: true },
        distinct: ['wilaya'],
        where: {
          orders: {
            some: {}
          }
        }
      });

      const results = [];

      for (const customer of uniqueWilayas) {
        const existing = await prisma.wilayaDeliverySettings.findUnique({
          where: { wilayaName: customer.wilaya }
        });

        if (!existing) {
          const created = await prisma.wilayaDeliverySettings.create({
            data: {
              wilayaName: customer.wilaya,
              maxDeliveryDays: 2 // Default 2 days
            }
          });
          results.push(created);
        }
      }

      // Clear cache
      await redis.del('wilaya:settings:all');
      await redis.del('wilaya:unique:orders');

      res.json({
        success: true,
        data: results,
        message: `Initialized ${results.length} new wilaya settings`
      });
    } catch (error) {
      console.error('Error initializing wilaya settings:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to initialize wilaya settings',
          code: 'WILAYA_SETTINGS_INIT_ERROR'
        }
      });
    }
  }
}

export const wilayaSettingsController = new WilayaSettingsController();