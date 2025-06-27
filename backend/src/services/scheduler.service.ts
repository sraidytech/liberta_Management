import { SyncService } from './sync.service';
import { MaystroService } from './maystro.service';
import { MaystroConfigService } from './maystro-config.service';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SchedulerService {
  private syncService: SyncService;
  private maystroService: MaystroService | null = null;
  private maystroConfigService: MaystroConfigService;
  private redis: Redis;
  private isRunning: boolean = false;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
    this.syncService = new SyncService(redis);
    this.maystroConfigService = new MaystroConfigService(redis);
    
    // Initialize Maystro service with primary API key
    const primaryApiKey = this.maystroConfigService.getPrimaryApiKey();
    if (primaryApiKey) {
      this.maystroService = new MaystroService({
        apiKey: primaryApiKey.apiKey,
        baseUrl: primaryApiKey.baseUrl
      }, redis);
    } else {
      console.warn('⚠️ No Maystro API key configured. Shipping status sync will be disabled.');
    }
    
    // Load API key statistics from Redis
    this.maystroConfigService.loadApiKeyStatsFromRedis();
  }

  /**
   * Start all scheduled background jobs for production
   */
  public async startScheduler(): Promise<void> {
    if (this.isRunning) {
      console.log('📅 Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Production Background Job Scheduler...');

    // Schedule EcoManager sync: Every hour from 8 AM to 8 PM
    this.scheduleEcoManagerSync();

    // Schedule Shipping Status sync: Every 6 hours at 00:00, 06:00, 12:00, 18:00
    this.scheduleShippingStatusSync();

    // Schedule daily cleanup jobs
    this.scheduleDailyCleanup();

    // Store scheduler status in Redis
    await this.redis.set('scheduler:status', 'running');
    await this.redis.set('scheduler:started_at', new Date().toISOString());

    console.log('✅ All background jobs scheduled successfully!');
    console.log('📋 Schedule Summary:');
    console.log('   🔄 EcoManager Sync: Every hour from 8 AM to 8 PM (12 times/day)');
    console.log('   🚚 Shipping Status Sync: Every 6 hours at 00:00, 06:00, 12:00, 18:00');
    console.log('   🧹 Daily Cleanup: Every day at 2 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  public async stopScheduler(): Promise<void> {
    console.log('🛑 Stopping scheduler...');
    
    // Clear all scheduled jobs
    this.scheduledJobs.forEach((timeout, jobName) => {
      clearTimeout(timeout);
      console.log(`   ❌ Stopped job: ${jobName}`);
    });
    
    this.scheduledJobs.clear();
    this.isRunning = false;

    // Update Redis status
    await this.redis.set('scheduler:status', 'stopped');
    await this.redis.set('scheduler:stopped_at', new Date().toISOString());

    console.log('✅ Scheduler stopped successfully');
  }

  /**
   * Schedule EcoManager sync every hour from 8 AM to 8 PM
   */
  private scheduleEcoManagerSync(): void {
    const scheduleNextEcoSync = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Calculate next sync time
      let nextSyncHour: number;
      let nextSyncDate = new Date(now);
      
      if (currentHour < 8) {
        // Before 8 AM - schedule for 8 AM today
        nextSyncHour = 8;
      } else if (currentHour >= 8 && currentHour < 20) {
        // Between 8 AM and 8 PM - schedule for next hour
        nextSyncHour = currentHour + 1;
        if (nextSyncHour > 20) {
          // If next hour would be after 8 PM, schedule for 8 AM tomorrow
          nextSyncHour = 8;
          nextSyncDate.setDate(nextSyncDate.getDate() + 1);
        }
      } else {
        // After 8 PM - schedule for 8 AM tomorrow
        nextSyncHour = 8;
        nextSyncDate.setDate(nextSyncDate.getDate() + 1);
      }

      nextSyncDate.setHours(nextSyncHour, 0, 0, 0);
      const timeUntilNext = nextSyncDate.getTime() - now.getTime();

      console.log(`⏰ Next EcoManager sync scheduled for: ${nextSyncDate.toLocaleString()}`);

      const timeout = setTimeout(async () => {
        await this.runEcoManagerSync();
        scheduleNextEcoSync(); // Schedule the next one
      }, timeUntilNext);

      this.scheduledJobs.set('ecomanager_sync', timeout);
    };

    scheduleNextEcoSync();
  }

  /**
   * Schedule Shipping Status sync every 6 hours at 00:00, 06:00, 12:00, 18:00
   */
  private scheduleShippingStatusSync(): void {
    const syncHours = [0, 6, 12, 18]; // 00:00, 06:00, 12:00, 18:00

    const scheduleNextShippingSync = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Find next sync hour
      let nextSyncHour = syncHours.find(hour => hour > currentHour);
      let nextSyncDate = new Date(now);
      
      if (!nextSyncHour) {
        // No more sync hours today, schedule for 00:00 tomorrow
        nextSyncHour = 0;
        nextSyncDate.setDate(nextSyncDate.getDate() + 1);
      }

      nextSyncDate.setHours(nextSyncHour, 0, 0, 0);
      const timeUntilNext = nextSyncDate.getTime() - now.getTime();

      console.log(`⏰ Next Shipping Status sync scheduled for: ${nextSyncDate.toLocaleString()}`);

      const timeout = setTimeout(async () => {
        await this.runShippingStatusSync();
        scheduleNextShippingSync(); // Schedule the next one
      }, timeUntilNext);

      this.scheduledJobs.set('shipping_status_sync', timeout);
    };

    scheduleNextShippingSync();
  }

  /**
   * Schedule daily cleanup at 2 AM
   */
  private scheduleDailyCleanup(): void {
    const scheduleNextCleanup = () => {
      const now = new Date();
      let nextCleanup = new Date(now);
      
      // Set to 2 AM
      nextCleanup.setHours(2, 0, 0, 0);
      
      // If 2 AM has already passed today, schedule for tomorrow
      if (nextCleanup <= now) {
        nextCleanup.setDate(nextCleanup.getDate() + 1);
      }

      const timeUntilNext = nextCleanup.getTime() - now.getTime();

      console.log(`⏰ Next daily cleanup scheduled for: ${nextCleanup.toLocaleString()}`);

      const timeout = setTimeout(async () => {
        await this.runDailyCleanup();
        scheduleNextCleanup(); // Schedule the next one
      }, timeUntilNext);

      this.scheduledJobs.set('daily_cleanup', timeout);
    };

    scheduleNextCleanup();
  }

  /**
   * Execute EcoManager sync
   */
  private async runEcoManagerSync(): Promise<void> {
    const startTime = new Date();
    console.log(`🔄 [${startTime.toLocaleString()}] Starting scheduled EcoManager sync...`);

    try {
      // Log sync start
      await this.redis.set('scheduler:last_ecomanager_sync_start', startTime.toISOString());

      // Run the sync
      const results = await this.syncService.syncAllStores();
      
      // Log results
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      await this.redis.set('scheduler:last_ecomanager_sync_end', endTime.toISOString());
      await this.redis.set('scheduler:last_ecomanager_sync_results', JSON.stringify(results));

      // Count successful syncs
      const successfulStores = Object.values(results).filter((result: any) => result.success).length;
      const totalSynced = Object.values(results).reduce((total: number, result: any) => 
        total + (result.syncedCount || 0), 0);

      console.log(`✅ [${endTime.toLocaleString()}] EcoManager sync completed in ${duration}ms`);
      console.log(`   📊 Stores synced: ${successfulStores}/${Object.keys(results).length}`);
      console.log(`   📦 New orders synced: ${totalSynced}`);

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('sync_completed', {
          type: 'ecomanager',
          results,
          duration,
          timestamp: endTime.toISOString()
        });
      }

    } catch (error) {
      const endTime = new Date();
      console.error(`❌ [${endTime.toLocaleString()}] EcoManager sync failed:`, error);
      
      await this.redis.set('scheduler:last_ecomanager_sync_error', JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: endTime.toISOString()
      }));

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('sync_error', {
          type: 'ecomanager',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: endTime.toISOString()
        });
      }
    }
  }

  /**
   * Execute Shipping Status sync
   */
  private async runShippingStatusSync(): Promise<void> {
    const startTime = new Date();
    console.log(`🚚 [${startTime.toLocaleString()}] Starting scheduled Shipping Status sync...`);

    try {
      // Log sync start
      await this.redis.set('scheduler:last_shipping_sync_start', startTime.toISOString());

      // Check if Maystro service is available
      if (!this.maystroService) {
        throw new Error('Maystro service not configured - no API keys available');
      }

      // Run the sync
      const results = await this.maystroService.syncShippingStatus();
      
      // Log results
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      await this.redis.set('scheduler:last_shipping_sync_end', endTime.toISOString());
      await this.redis.set('scheduler:last_shipping_sync_results', JSON.stringify(results));

      console.log(`✅ [${endTime.toLocaleString()}] Shipping Status sync completed in ${duration}ms`);
      console.log(`   📊 Orders updated: ${results.updated}`);
      console.log(`   ❌ Errors: ${results.errors}`);

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('sync_completed', {
          type: 'shipping_status',
          results,
          duration,
          timestamp: endTime.toISOString()
        });
      }

    } catch (error) {
      const endTime = new Date();
      console.error(`❌ [${endTime.toLocaleString()}] Shipping Status sync failed:`, error);
      
      await this.redis.set('scheduler:last_shipping_sync_error', JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: endTime.toISOString()
      }));

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('sync_error', {
          type: 'shipping_status',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: endTime.toISOString()
        });
      }
    }
  }

  /**
   * Execute daily cleanup tasks
   */
  private async runDailyCleanup(): Promise<void> {
    const startTime = new Date();
    console.log(`🧹 [${startTime.toLocaleString()}] Starting daily cleanup...`);

    try {
      // Clean up old activity logs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedLogs = await prisma.activityLog.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Clean up old Redis keys
      const oldKeys = await this.redis.keys('sync:*');
      const keysToDelete = [];
      
      for (const key of oldKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // Keys without expiration
          keysToDelete.push(key);
        }
      }

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`✅ [${endTime.toLocaleString()}] Daily cleanup completed in ${duration}ms`);
      console.log(`   🗑️ Activity logs deleted: ${deletedLogs.count}`);
      console.log(`   🗑️ Redis keys cleaned: ${keysToDelete.length}`);

      await this.redis.set('scheduler:last_cleanup', endTime.toISOString());

    } catch (error) {
      const endTime = new Date();
      console.error(`❌ [${endTime.toLocaleString()}] Daily cleanup failed:`, error);
      
      await this.redis.set('scheduler:last_cleanup_error', JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: endTime.toISOString()
      }));
    }
  }

  /**
   * Get scheduler status and statistics
   */
  public async getSchedulerStatus(): Promise<any> {
    const status = await this.redis.get('scheduler:status');
    const startedAt = await this.redis.get('scheduler:started_at');
    const stoppedAt = await this.redis.get('scheduler:stopped_at');
    
    // Get last sync information
    const lastEcoSyncStart = await this.redis.get('scheduler:last_ecomanager_sync_start');
    const lastEcoSyncEnd = await this.redis.get('scheduler:last_ecomanager_sync_end');
    const lastEcoSyncResults = await this.redis.get('scheduler:last_ecomanager_sync_results');
    const lastEcoSyncError = await this.redis.get('scheduler:last_ecomanager_sync_error');
    
    const lastShippingSyncStart = await this.redis.get('scheduler:last_shipping_sync_start');
    const lastShippingSyncEnd = await this.redis.get('scheduler:last_shipping_sync_end');
    const lastShippingSyncResults = await this.redis.get('scheduler:last_shipping_sync_results');
    const lastShippingSyncError = await this.redis.get('scheduler:last_shipping_sync_error');
    
    const lastCleanup = await this.redis.get('scheduler:last_cleanup');
    const lastCleanupError = await this.redis.get('scheduler:last_cleanup_error');

    return {
      status: status || 'stopped',
      isRunning: this.isRunning,
      startedAt,
      stoppedAt,
      activeJobs: Array.from(this.scheduledJobs.keys()),
      lastSyncs: {
        ecomanager: {
          lastStart: lastEcoSyncStart,
          lastEnd: lastEcoSyncEnd,
          lastResults: lastEcoSyncResults ? JSON.parse(lastEcoSyncResults) : null,
          lastError: lastEcoSyncError ? JSON.parse(lastEcoSyncError) : null
        },
        shippingStatus: {
          lastStart: lastShippingSyncStart,
          lastEnd: lastShippingSyncEnd,
          lastResults: lastShippingSyncResults ? JSON.parse(lastShippingSyncResults) : null,
          lastError: lastShippingSyncError ? JSON.parse(lastShippingSyncError) : null
        },
        cleanup: {
          lastRun: lastCleanup,
          lastError: lastCleanupError ? JSON.parse(lastCleanupError) : null
        }
      }
    };
  }

  /**
   * Manually trigger EcoManager sync
   */
  public async triggerEcoManagerSync(): Promise<any> {
    console.log('🔄 Manual EcoManager sync triggered');
    await this.runEcoManagerSync();
    return { success: true, message: 'EcoManager sync completed' };
  }

  /**
   * Manually trigger Shipping Status sync
   */
  public async triggerShippingStatusSync(): Promise<any> {
    console.log('🚚 Manual Shipping Status sync triggered');
    
    if (!this.maystroService) {
      return {
        success: false,
        message: 'Maystro service not configured - no API keys available'
      };
    }
    
    await this.runShippingStatusSync();
    return { success: true, message: 'Shipping Status sync completed' };
  }
}