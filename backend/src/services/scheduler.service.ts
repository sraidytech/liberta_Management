import { SyncService } from './sync.service';
import { MaystroService } from './maystro.service';
import { MaystroConfigService } from './maystro-config.service';
import { deadlineNotificationService } from './deadline-notification.service';
import { EcoManagerService } from './ecomanager.service';
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
    
    // Initialize Maystro service with all configured API keys
    const allApiKeys = this.maystroConfigService.getAllApiKeys();
    if (allApiKeys.length > 0) {
      this.maystroService = new MaystroService(allApiKeys, redis);
      console.log(`🔑 Initialized MaystroService with ${allApiKeys.length} API key(s) for dual API support`);
    } else {
      console.warn('⚠️ No Maystro API keys configured. Shipping status sync will be disabled.');
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

    // Schedule EcoManager sync: At 08:00, 14:00, 17:00, 18:00, 20:00
    this.scheduleEcoManagerSync();

    // Schedule Shipping Status sync: Every 6 hours at 00:00, 06:00, 12:00, 18:00
    this.scheduleShippingStatusSync();

    // Schedule deadline notifications: Every 4 hours at 06:00, 10:00, 14:00, 18:00
    this.scheduleDeadlineNotifications();

    // Schedule daily cleanup jobs
    this.scheduleDailyCleanup();

    // Store scheduler status in Redis
    await this.redis.set('scheduler:status', 'running');
    await this.redis.set('scheduler:started_at', new Date().toISOString());

    console.log('✅ All background jobs scheduled successfully!');
    console.log('📋 Schedule Summary:');
    console.log('   🔄 EcoManager Sync: At 08:00, 14:00, 17:00, 18:00, 20:00 (5 times/day)');
    console.log('   🚚 Shipping Status Sync: Every 6 hours at 00:00, 06:00, 12:00, 18:00');
    console.log('   🚨 Deadline Notifications: Every 4 hours at 06:00, 10:00, 14:00, 18:00');
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
   * Schedule EcoManager sync at 08:00, 14:00, 17:00, 18:00, 20:00
   */
  private scheduleEcoManagerSync(): void {
    const syncHours = [8, 14, 17, 18, 20]; // 08:00, 14:00, 17:00, 18:00, 20:00

    const scheduleNextEcoSync = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Find next sync hour
      let nextSyncHour = syncHours.find(hour => hour > currentHour);
      let nextSyncDate = new Date(now);
      
      if (!nextSyncHour) {
        // No more sync hours today, schedule for 08:00 tomorrow
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
   * Schedule deadline notifications every 4 hours at 06:00, 10:00, 14:00, 18:00
   */
  private scheduleDeadlineNotifications(): void {
    const notificationHours = [6, 10, 14, 18]; // 06:00, 10:00, 14:00, 18:00

    const scheduleNextDeadlineCheck = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Find next notification hour
      let nextNotificationHour = notificationHours.find(hour => hour > currentHour);
      let nextNotificationDate = new Date(now);
      
      if (!nextNotificationHour) {
        // No more notification hours today, schedule for 06:00 tomorrow
        nextNotificationHour = 6;
        nextNotificationDate.setDate(nextNotificationDate.getDate() + 1);
      }

      nextNotificationDate.setHours(nextNotificationHour, 0, 0, 0);
      const timeUntilNext = nextNotificationDate.getTime() - now.getTime();

      console.log(`⏰ Next deadline notification check scheduled for: ${nextNotificationDate.toLocaleString()}`);

      const timeout = setTimeout(async () => {
        await this.runDeadlineNotifications();
        scheduleNextDeadlineCheck(); // Schedule the next one
      }, timeUntilNext);

      this.scheduledJobs.set('deadline_notifications', timeout);
    };

    scheduleNextDeadlineCheck();
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
   * Check global rate limit status across all stores
   */
  private async checkGlobalRateLimitStatus(): Promise<{
    isRateLimited: boolean;
    affectedStores: string[];
    maxWaitTime: number;
  }> {
    try {
      const storeConfigs = await prisma.apiConfiguration.findMany({
        where: { isActive: true },
        select: { storeIdentifier: true, storeName: true }
      });

      const affectedStores: string[] = [];
      let maxWaitTime = 0;

      for (const config of storeConfigs) {
        // Check if store has active rate limit wait
        const rateLimitKey = `ecomanager:rate_limit_wait:${config.storeIdentifier}`;
        const waitTimeStr = await this.redis.get(rateLimitKey);
        
        if (waitTimeStr) {
          const waitTime = parseInt(waitTimeStr);
          if (waitTime > Date.now()) {
            affectedStores.push(config.storeIdentifier);
            const remainingWait = waitTime - Date.now();
            if (remainingWait > maxWaitTime) {
              maxWaitTime = remainingWait;
            }
          }
        }
      }

      return {
        isRateLimited: affectedStores.length > 0,
        affectedStores,
        maxWaitTime
      };
    } catch (error) {
      console.error('Error checking global rate limit status:', error);
      return { isRateLimited: false, affectedStores: [], maxWaitTime: 0 };
    }
  }

  /**
   * Get count of active stores for logging
   */
  private async getActiveStoreCount(): Promise<number> {
    try {
      const count = await prisma.apiConfiguration.count({
        where: { isActive: true }
      });
      return count;
    } catch (error) {
      console.error('Error getting active store count:', error);
      return 0;
    }
  }

  /**
   * Calculate next sync time for display (6-hour intervals)
   */
  private calculateNextSyncTime(): string {
    const now = new Date();
    const currentHour = now.getHours();
    const syncHours = [8, 14, 17, 18, 20]; // 08:00, 14:00, 17:00, 18:00, 20:00
    
    let nextSyncHour = syncHours.find(hour => hour > currentHour);
    let nextSyncDate = new Date(now);
    
    if (!nextSyncHour) {
      // No more sync hours today, schedule for 08:00 tomorrow
      nextSyncHour = 8;
      nextSyncDate.setDate(nextSyncDate.getDate() + 1);
    }

    nextSyncDate.setHours(nextSyncHour, 0, 0, 0);
    return nextSyncDate.toLocaleString();
  }

  /**
   * Analyze store errors and provide categorized insights
   */
  private analyzeStoreErrors(results: { [storeIdentifier: string]: any }): {
    errorCategories: { [category: string]: string[] };
    suggestions: string[];
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    const errorCategories: { [category: string]: string[] } = {};
    const suggestions: string[] = [];
    
    const storeResults = Object.entries(results);
    const failedStores = storeResults.filter(([_, result]: [string, any]) => !result.success);
    
    if (failedStores.length === 0) {
      return { errorCategories: {}, suggestions: [], severity: 'LOW' };
    }

    // Categorize errors
    failedStores.forEach(([storeId, result]: [string, any]) => {
      const error = result.error || 'Unknown error';
      
      if (error.includes('403') || error.includes('Forbidden') || error.includes('API access forbidden')) {
        if (!errorCategories['API_AUTHENTICATION']) errorCategories['API_AUTHENTICATION'] = [];
        errorCategories['API_AUTHENTICATION'].push(storeId);
      } else if (error.includes('401') || error.includes('Unauthorized')) {
        if (!errorCategories['API_TOKEN_INVALID']) errorCategories['API_TOKEN_INVALID'] = [];
        errorCategories['API_TOKEN_INVALID'].push(storeId);
      } else if (error.includes('429') || error.includes('rate limit')) {
        if (!errorCategories['RATE_LIMIT']) errorCategories['RATE_LIMIT'] = [];
        errorCategories['RATE_LIMIT'].push(storeId);
      } else if (error.includes('timeout') || error.includes('ECONNRESET')) {
        if (!errorCategories['NETWORK_CONNECTIVITY']) errorCategories['NETWORK_CONNECTIVITY'] = [];
        errorCategories['NETWORK_CONNECTIVITY'].push(storeId);
      } else {
        if (!errorCategories['OTHER']) errorCategories['OTHER'] = [];
        errorCategories['OTHER'].push(storeId);
      }
    });

    // Generate suggestions based on error categories
    if (errorCategories['API_AUTHENTICATION']) {
      suggestions.push('Update API tokens in admin panel for affected stores');
      suggestions.push('Check EcoManager dashboard for token expiration status');
      suggestions.push('Verify API permissions for each store');
    }
    
    if (errorCategories['RATE_LIMIT']) {
      suggestions.push('Reduce sync frequency or implement better rate limiting');
      suggestions.push('Check EcoManager API rate limit quotas');
    }
    
    if (errorCategories['NETWORK_CONNECTIVITY']) {
      suggestions.push('Check server network connectivity');
      suggestions.push('Verify EcoManager API endpoints are accessible');
    }

    // Determine severity
    const failurePercentage = (failedStores.length / storeResults.length) * 100;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    
    if (failurePercentage === 100) {
      severity = 'CRITICAL';
    } else if (failurePercentage >= 75) {
      severity = 'HIGH';
    } else if (failurePercentage >= 25) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    return { errorCategories, suggestions, severity };
  }

  /**
   * Format comprehensive sync summary
   */
  private formatSyncSummary(
    results: { [storeIdentifier: string]: any },
    duration: number,
    storeCount: number
  ): string {
    const storeResults = Object.entries(results);
    const successfulStores = storeResults.filter(([_, result]: [string, any]) => result.success);
    const failedStores = storeResults.filter(([_, result]: [string, any]) => !result.success);
    const totalSynced = storeResults.reduce((total: number, [_, result]: [string, any]) =>
      total + (result.syncedCount || 0), 0);

    const durationSeconds = (duration / 1000).toFixed(1);
    const successPercentage = storeResults.length > 0 ? ((successfulStores.length / storeResults.length) * 100).toFixed(1) : '0';
    const failurePercentage = storeResults.length > 0 ? ((failedStores.length / storeResults.length) * 100).toFixed(1) : '0';

    let summary = `📊 Final Results:\n`;
    summary += `   - Duration: ${durationSeconds}s (${duration}ms)\n`;
    summary += `   - Stores Processed: ${storeResults.length}/${storeCount}\n`;
    summary += `   - Successful Syncs: ${successfulStores.length}/${storeResults.length} (${successPercentage}%)\n`;
    summary += `   - Failed Syncs: ${failedStores.length}/${storeResults.length} (${failurePercentage}%)\n`;
    summary += `   - New Orders Synced: ${totalSynced}\n`;

    // Add successful stores details
    if (successfulStores.length > 0) {
      summary += `\n✅ Successful Stores:\n`;
      successfulStores.forEach(([storeId, result]: [string, any]) => {
        const orders = result.syncedCount || 0;
        const maystroInfo = result.maystroSync ? ` (Maystro: ${result.maystroSync.updated || 0} updated)` : '';
        summary += `   - ${storeId}: ${orders} orders synced${maystroInfo}\n`;
      });
    }

    // Add failed stores details
    if (failedStores.length > 0) {
      summary += `\n❌ Failed Stores:\n`;
      failedStores.forEach(([storeId, result]: [string, any]) => {
        const error = result.error || 'Unknown error';
        const shortError = error.length > 60 ? error.substring(0, 60) + '...' : error;
        summary += `   - ${storeId}: ${shortError}\n`;
      });
    }

    return summary;
  }

  /**
   * Execute EcoManager sync with comprehensive logging and rate limit protection
   */
  private async runEcoManagerSync(): Promise<void> {
    const startTime = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log(`🚀 [${startTime.toLocaleString()} ${timezone}] SCHEDULED EcoManager Sync Started`);
    console.log(`📅 Sync Type: Scheduled Sync`);
    console.log(`⏰ Started At: ${startTime.toISOString()}`);

    try {
      // Check if any store is currently rate limited
      const rateLimitCheck = await this.checkGlobalRateLimitStatus();
      if (rateLimitCheck.isRateLimited) {
        console.log(`⚠️ SYNC SKIPPED: Rate limit protection active`);
        console.log(`   - Affected stores: ${rateLimitCheck.affectedStores.join(', ')}`);
        console.log(`   - Estimated wait time: ${rateLimitCheck.maxWaitTime}ms`);
        console.log(`   - Next sync will proceed as scheduled at next sync time`);
        
        // Store skip reason in Redis
        await this.redis.set('scheduler:last_ecomanager_sync_skipped', JSON.stringify({
          timestamp: startTime.toISOString(),
          reason: 'RATE_LIMITED',
          affectedStores: rateLimitCheck.affectedStores,
          waitTime: rateLimitCheck.maxWaitTime
        }));
        
        return;
      }
      // Log sync start
      await this.redis.set('scheduler:last_ecomanager_sync_start', startTime.toISOString());

      // Get store count and configuration info
      const storeCount = await this.getActiveStoreCount();
      const storeConfigs = await prisma.apiConfiguration.findMany({
        where: { isActive: true },
        select: { storeIdentifier: true, storeName: true }
      });
      
      const storeList = storeConfigs.map(config => config.storeIdentifier).join(', ');
      
      console.log(`📊 Sync Configuration:`);
      console.log(`   - Total Active Stores: ${storeCount}`);
      console.log(`   - Store List: ${storeList}`);
      console.log(`   - Expected Duration: 30-90 seconds`);
      console.log(`   - Sync Strategy: Connection test → Order fetch → Assignment`);
      console.log(`   - Rate Limits: 4 req/sec per store`);
      console.log(`─────────────────────────────────────────────────────────────`);

      // Run the sync using the same logic as admin button (OrdersController.syncAllStores)
      const results = await this.runOrdersControllerSync();
      
      // Log results
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      await this.redis.set('scheduler:last_ecomanager_sync_end', endTime.toISOString());
      await this.redis.set('scheduler:last_ecomanager_sync_results', JSON.stringify(results));

      console.log(`─────────────────────────────────────────────────────────────`);
      console.log(`✅ [${endTime.toLocaleString()} ${timezone}] EcoManager Sync Completed`);
      console.log(this.formatSyncSummary(results, duration, storeCount));

      // Analyze errors and provide insights
      const errorAnalysis = this.analyzeStoreErrors(results);
      if (Object.keys(errorAnalysis.errorCategories).length > 0) {
        console.log(`\n🚨 [Error Analysis] Sync Issues Detected (Severity: ${errorAnalysis.severity})`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        Object.entries(errorAnalysis.errorCategories).forEach(([category, stores]) => {
          console.log(`❌ ${category}: ${stores.join(', ')}`);
        });
        
        if (errorAnalysis.suggestions.length > 0) {
          console.log(`\n💡 Recommended Actions:`);
          errorAnalysis.suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`);
          });
        }
        
        console.log(`\n📞 Support Resources:`);
        console.log(`   - EcoManager Dashboard: https://dashboard.ecomanager.com`);
        console.log(`   - LibertaPhonix Admin: https://app.libertadz.shop/admin/stores`);
        console.log(`   - API Documentation: Check store-specific API docs`);
      }

      // Display next sync information
      const nextSyncTime = this.calculateNextSyncTime();
      console.log(`\n⏰ Next Sync Information:`);
      console.log(`   - Next Scheduled Sync: ${nextSyncTime}`);
      console.log(`   - Sync Frequency: Every hour (8AM-8PM)`);
      console.log(`   - Manual Sync Available: /api/v1/scheduler/trigger/ecomanager`);

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('sync_completed', {
          type: 'ecomanager',
          results,
          duration,
          timestamp: endTime.toISOString(),
          errorAnalysis
        });
      }

    } catch (error) {
      const endTime = new Date();
      console.error(`❌ [${endTime.toLocaleString()} ${timezone}] EcoManager sync failed:`, error);
      
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
   * Execute deadline notification processing
   */
  private async runDeadlineNotifications(): Promise<void> {
    const startTime = Date.now();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log(`🚨 [${new Date().toLocaleString()} ${timezone}] SCHEDULED Deadline Notification Processing Started`);
    console.log(`📅 Processing Type: 4-Hour Scheduled Check`);
    console.log(`⏰ Started At: ${new Date().toISOString()}`);

    try {
      // Log processing start
      await this.redis.set('scheduler:last_deadline_check_start', new Date().toISOString());

      console.log(`📊 Deadline Check Configuration:`);
      console.log(`   - Check Frequency: Every 4 hours (6AM, 10AM, 2PM, 6PM)`);
      console.log(`   - Rate Limit: Max 10 notifications per 15 minutes per agent`);
      console.log(`   - Notification Strategy: Batched aggregation`);
      console.log(`   - Processing Strategy: Intelligent filtering and grouping`);
      console.log(`─────────────────────────────────────────────────────────────`);

      // Run the deadline notification processing
      const results = await deadlineNotificationService.processAllAgentDeadlines();
      
      // Log results
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      await this.redis.set('scheduler:last_deadline_check_end', new Date().toISOString());
      await this.redis.set('scheduler:last_deadline_check_results', JSON.stringify(results));

      console.log(`─────────────────────────────────────────────────────────────`);
      console.log(`✅ [${new Date().toLocaleString()} ${timezone}] Deadline Notification Processing Completed`);
      console.log(`📊 Final Results:`);
      console.log(`   - Duration: ${(duration / 1000).toFixed(1)}s (${duration}ms)`);
      console.log(`   - Agents Processed: ${results.processedAgents}`);
      console.log(`   - Notifications Sent: ${results.notificationsSent}`);
      console.log(`   - Rate Limited Agents: ${results.rateLimitedAgents}`);
      console.log(`   - Total Orders Processed: ${results.totalOrdersProcessed}`);

      // Calculate next check time
      const nextCheckTime = this.calculateNextDeadlineCheckTime();
      console.log(`\n⏰ Next Deadline Check Information:`);
      console.log(`   - Next Scheduled Check: ${nextCheckTime}`);
      console.log(`   - Check Frequency: Every 4 hours`);
      console.log(`   - Manual Check Available: /api/v1/scheduler/trigger/deadline-notifications`);

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('deadline_check_completed', {
          type: 'deadline_notifications',
          results,
          duration,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`❌ [${new Date().toLocaleString()} ${timezone}] Deadline Notification Processing Failed`);
      console.error(`💥 Error Details:`, error);
      console.error(`⏱️ Failed after: ${(duration / 1000).toFixed(1)}s`);
      
      // Store error information
      await this.redis.set('scheduler:last_deadline_check_error', JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration
      }));

      // Notify via global io if available
      if ((global as any).io) {
        (global as any).io.emit('deadline_check_failed', {
          type: 'deadline_notifications',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          duration
        });
      }
    }
  }

  /**
   * Calculate next deadline check time for display (4-hour intervals)
   */
  private calculateNextDeadlineCheckTime(): string {
    const now = new Date();
    const currentHour = now.getHours();
    const checkHours = [6, 10, 14, 18]; // 06:00, 10:00, 14:00, 18:00
    
    let nextCheckHour = checkHours.find(hour => hour > currentHour);
    let nextCheckDate = new Date(now);
    
    if (!nextCheckHour) {
      // No more check hours today, schedule for 06:00 tomorrow
      nextCheckHour = 6;
      nextCheckDate.setDate(nextCheckDate.getDate() + 1);
    }

    nextCheckDate.setHours(nextCheckHour, 0, 0, 0);
    return nextCheckDate.toLocaleString();
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

  /**
   * Manually trigger deadline notification processing
   */
  public async triggerDeadlineNotifications(): Promise<any> {
    console.log('🚨 Manual deadline notification processing triggered');
    await this.runDeadlineNotifications();
    return {
      success: true,
      message: 'Deadline notification processing completed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run the same sync logic as OrdersController.syncAllStores (admin button)
   * This ensures scheduler uses identical logic to the manual sync button
   */
  private async runOrdersControllerSync(): Promise<{ [storeIdentifier: string]: any }> {
    const fullSync = false; // Use incremental sync for scheduled runs
    
    // Get all active API configurations
    const activeConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (activeConfigs.length === 0) {
      console.log('❌ No active store configurations found');
      return {};
    }

    console.log(`Starting sync for ${activeConfigs.length} active stores...`);

    const results: { [storeIdentifier: string]: any } = {};
    let totalSyncedCount = 0;
    let totalFetchedCount = 0;

    // Process each store sequentially to avoid overwhelming the APIs
    for (const apiConfig of activeConfigs) {
      try {
        console.log(`\n🏪 Processing store: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);

        // Initialize EcoManager service for this store
        if (!apiConfig.baseUrl) {
          throw new Error(`Base URL is missing for store ${apiConfig.storeName}`);
        }

        const ecoService = new EcoManagerService({
          storeName: apiConfig.storeName,
          storeIdentifier: apiConfig.storeIdentifier,
          apiToken: apiConfig.apiToken,
          baseUrl: apiConfig.baseUrl
        }, this.redis);

        // Test connection first
        const connectionTest = await ecoService.testConnection();
        if (!connectionTest) {
          console.log(`❌ Failed to connect to ${apiConfig.storeName} API`);
          results[apiConfig.storeIdentifier] = {
            storeIdentifier: apiConfig.storeIdentifier,
            storeName: apiConfig.storeName,
            success: false,
            error: 'Failed to connect to EcoManager API',
            syncedCount: 0,
            totalFetched: 0
          };
          continue;
        }

        let syncedCount = 0;
        let ecoOrders: any[] = [];

        if (fullSync) {
          // Full sync - fetch all orders
          ecoOrders = await ecoService.fetchAllOrders();
        } else {
          // Incremental sync - fetch new orders only
          // Get the highest EcoManager ID by converting to integer for proper sorting
          const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
            SELECT "ecoManagerId"
            FROM "orders"
            WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
              AND "source" = 'ECOMANAGER'
              AND "ecoManagerId" IS NOT NULL
            ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
            LIMIT 1
          `;

          const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
          console.log(`Last synced EcoManager order ID for ${apiConfig.storeName}: ${lastOrderId}`);
          
          ecoOrders = await ecoService.fetchNewOrders(lastOrderId);
        }

        console.log(`Processing ${ecoOrders.length} orders for ${apiConfig.storeName}...`);

        // Process orders in smaller batches
        const batchSize = 10;
        for (let i = 0; i < ecoOrders.length; i += batchSize) {
          const batch = ecoOrders.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ecoOrders.length/batchSize)} for ${apiConfig.storeName} (${batch.length} orders)`);
          
          for (const ecoOrder of batch) {
            try {
              // Check if order already exists
              const existingOrder = await prisma.order.findUnique({
                where: { ecoManagerId: ecoOrder.id.toString() }
              });

              if (!existingOrder) {
                // Create new order
                const orderData = ecoService.mapOrderToDatabase(ecoOrder);
                
                // Handle customer creation separately
                let customer = await prisma.customer.findFirst({
                  where: { telephone: orderData.customerData.telephone }
                });

                if (!customer) {
                  customer = await prisma.customer.create({
                    data: {
                      fullName: orderData.customerData.fullName,
                      telephone: orderData.customerData.telephone,
                      wilaya: orderData.customerData.wilaya,
                      commune: orderData.customerData.commune,
                      totalOrders: 1
                    }
                  });
                } else {
                  // Update total orders count
                  await prisma.customer.update({
                    where: { id: customer.id },
                    data: { totalOrders: { increment: 1 } }
                  });
                }

                // Remove customerData and add customerId
                const { customerData, ...finalOrderData } = orderData;
                finalOrderData.customerId = customer.id;

                await prisma.order.create({
                  data: finalOrderData
                });
                syncedCount++;
                
                if (syncedCount % 10 === 0) {
                  console.log(`Synced ${syncedCount} orders for ${apiConfig.storeName} so far...`);
                }
              }
            } catch (orderError) {
              console.error(`Error processing order ${ecoOrder.id} for ${apiConfig.storeName}:`, orderError);
              // Continue with next order
            }
          }
        }

        // Update API configuration usage
        await prisma.apiConfiguration.update({
          where: { id: apiConfig.id },
          data: {
            requestCount: {
              increment: Math.ceil(ecoOrders.length / 100) // Approximate API calls made
            },
            lastUsed: new Date()
          }
        });

        // Save sync status
        if (ecoOrders.length > 0) {
          const lastOrderId = Math.max(...ecoOrders.map(o => o.id));
          await ecoService.saveSyncStatus(lastOrderId, syncedCount);
        }

        results[apiConfig.storeIdentifier] = {
          storeIdentifier: apiConfig.storeIdentifier,
          storeName: apiConfig.storeName,
          success: true,
          syncedCount,
          totalFetched: ecoOrders.length,
          syncType: fullSync ? 'full' : 'incremental'
        };

        totalSyncedCount += syncedCount;
        totalFetchedCount += ecoOrders.length;

        console.log(`✅ Completed sync for ${apiConfig.storeName}: ${syncedCount} orders synced`);

      } catch (storeError) {
        console.error(`Error syncing store ${apiConfig.storeName}:`, storeError);
        results[apiConfig.storeIdentifier] = {
          storeIdentifier: apiConfig.storeIdentifier,
          storeName: apiConfig.storeName,
          success: false,
          error: storeError instanceof Error ? storeError.message : 'Unknown error',
          syncedCount: 0,
          totalFetched: 0
        };
      }
    }

    console.log(`\n🎉 All stores sync completed. Total synced: ${totalSyncedCount} orders`);
    return results;
  }
}