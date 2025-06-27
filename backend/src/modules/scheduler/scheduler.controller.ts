import { Request, Response } from 'express';
import { SchedulerService } from '@/services/scheduler.service';
import { MaystroConfigService } from '@/services/maystro-config.service';
import redis from '@/config/redis';

export class SchedulerController {
  private static schedulerService: SchedulerService;
  private static maystroConfigService: MaystroConfigService;

  private static getSchedulerService(): SchedulerService {
    if (!this.schedulerService) {
      this.schedulerService = new SchedulerService(redis);
    }
    return this.schedulerService;
  }

  private static getMaystroConfigService(): MaystroConfigService {
    if (!this.maystroConfigService) {
      this.maystroConfigService = new MaystroConfigService(redis);
    }
    return this.maystroConfigService;
  }

  /**
   * Get scheduler status and statistics
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = this.getSchedulerService();
      const status = await schedulerService.getSchedulerStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduler status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start the scheduler
   */
  static async startScheduler(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = this.getSchedulerService();
      await schedulerService.startScheduler();

      res.json({
        success: true,
        message: 'Scheduler started successfully'
      });
    } catch (error) {
      console.error('Error starting scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start scheduler',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Stop the scheduler
   */
  static async stopScheduler(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = this.getSchedulerService();
      await schedulerService.stopScheduler();

      res.json({
        success: true,
        message: 'Scheduler stopped successfully'
      });
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop scheduler',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger EcoManager sync
   */
  static async triggerEcoManagerSync(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = this.getSchedulerService();
      const result = await schedulerService.triggerEcoManagerSync();

      res.json({
        success: true,
        message: 'EcoManager sync triggered successfully',
        data: result
      });
    } catch (error) {
      console.error('Error triggering EcoManager sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger EcoManager sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger Shipping Status sync
   */
  static async triggerShippingStatusSync(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = this.getSchedulerService();
      const result = await schedulerService.triggerShippingStatusSync();

      res.json({
        success: true,
        message: 'Shipping Status sync triggered successfully',
        data: result
      });
    } catch (error) {
      console.error('Error triggering Shipping Status sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger Shipping Status sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get sync history and logs
   */
  static async getSyncHistory(req: Request, res: Response): Promise<void> {
    try {
      const { type, limit = 10 } = req.query;
      
      // Get sync history from Redis
      const keys = await redis.keys(`scheduler:*${type || ''}*`);
      const history: any = {};

      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          try {
            history[key] = JSON.parse(value);
          } catch {
            history[key] = value;
          }
        }
      }

      res.json({
        success: true,
        data: {
          history,
          keys: keys.slice(0, Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting sync history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sync history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get next scheduled sync times
   */
  static async getNextSyncTimes(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Calculate next EcoManager sync
      let nextEcoSyncHour: number;
      let nextEcoSyncDate = new Date(now);
      
      if (currentHour < 8) {
        nextEcoSyncHour = 8;
      } else if (currentHour >= 8 && currentHour < 20) {
        nextEcoSyncHour = currentHour + 1;
        if (nextEcoSyncHour > 20) {
          nextEcoSyncHour = 8;
          nextEcoSyncDate.setDate(nextEcoSyncDate.getDate() + 1);
        }
      } else {
        nextEcoSyncHour = 8;
        nextEcoSyncDate.setDate(nextEcoSyncDate.getDate() + 1);
      }
      
      nextEcoSyncDate.setHours(nextEcoSyncHour, 0, 0, 0);

      // Calculate next Shipping Status sync
      const syncHours = [0, 6, 12, 18];
      let nextShippingSyncHour = syncHours.find(hour => hour > currentHour);
      let nextShippingSyncDate = new Date(now);
      
      if (!nextShippingSyncHour) {
        nextShippingSyncHour = 0;
        nextShippingSyncDate.setDate(nextShippingSyncDate.getDate() + 1);
      }
      
      nextShippingSyncDate.setHours(nextShippingSyncHour, 0, 0, 0);

      // Calculate next cleanup
      let nextCleanupDate = new Date(now);
      nextCleanupDate.setHours(2, 0, 0, 0);
      if (nextCleanupDate <= now) {
        nextCleanupDate.setDate(nextCleanupDate.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          nextEcoManagerSync: nextEcoSyncDate.toISOString(),
          nextShippingStatusSync: nextShippingSyncDate.toISOString(),
          nextDailyCleanup: nextCleanupDate.toISOString(),
          currentTime: now.toISOString()
        }
      });
    } catch (error) {
      console.error('Error calculating next sync times:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate next sync times',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get Maystro API keys information
   */
  static async getMaystroApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const maystroConfigService = this.getMaystroConfigService();
      const apiKeyStats = maystroConfigService.getApiKeyStats();

      res.json({
        success: true,
        data: apiKeyStats
      });
    } catch (error) {
      console.error('Error getting Maystro API keys:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get Maystro API keys',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test Maystro API key connection
   */
  static async testMaystroApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const maystroConfigService = this.getMaystroConfigService();
      
      const result = await maystroConfigService.testApiKeyConnection(keyId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error testing Maystro API key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test API key',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get real system information
   */
  static async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const os = require('os');
      const process = require('process');
      
      // Get real system information
      const systemInfo = {
        nodeEnv: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        memoryUsage: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        platform: os.platform(),
        nodeVersion: process.version,
        cpuUsage: process.cpuUsage(),
        loadAverage: os.loadavg()
      };

      // Test database connection
      let databaseStatus = 'connected';
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
      } catch (error) {
        databaseStatus = 'disconnected';
      }

      // Test Redis connection
      let redisStatus = 'connected';
      try {
        await redis.ping();
      } catch (error) {
        redisStatus = 'disconnected';
      }

      res.json({
        success: true,
        data: {
          ...systemInfo,
          databaseStatus,
          redisStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting system info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}