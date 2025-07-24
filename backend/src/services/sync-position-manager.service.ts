import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../config/database';

export interface SyncPosition {
  storeIdentifier: string;
  lastPage: number;
  lastOrderId: number;
  firstId: number;
  lastId: number;
  timestamp: string;
  source: 'redis' | 'json' | 'database' | 'calculated';
}

export interface StoreSyncPosition {
  storeIdentifier: string;
  storeName: string;
  lastPage: number;
  lastOrderId: number;
  firstId: number;
  lastId: number;
  timestamp: string;
  source: 'redis' | 'json' | 'database' | 'calculated';
}

export interface SyncPositionBackup {
  version: string;
  timestamp: string;
  stores: { [storeIdentifier: string]: StoreSyncPosition };
}

export class SyncPositionManager {
  private redis: Redis;
  private backupDir: string;
  private backupFile: string;

  constructor(redis: Redis) {
    this.redis = redis;
    this.backupDir = path.join(process.cwd(), 'data', 'sync-positions');
    this.backupFile = path.join(this.backupDir, 'sync-positions.json');
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Get sync position from Redis
   */
  private async getSyncPositionFromRedis(storeIdentifier: string): Promise<StoreSyncPosition | null> {
    try {
      const pageInfoKey = `ecomanager:pageinfo:${storeIdentifier}`;
      const pageData = await this.redis.get(pageInfoKey);
      
      if (!pageData) {
        return null;
      }

      const pageInfo = JSON.parse(pageData);
      
      // Get store name from database
      const store = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier },
        select: { storeName: true }
      });

      return {
        storeIdentifier,
        storeName: store?.storeName || storeIdentifier,
        lastPage: pageInfo.lastPage || 1,
        lastOrderId: pageInfo.lastId || 0,
        firstId: pageInfo.firstId || 0,
        lastId: pageInfo.lastId || 0,
        timestamp: pageInfo.timestamp || new Date().toISOString(),
        source: 'redis'
      };
    } catch (error) {
      console.error(`Error getting sync position from Redis for ${storeIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Get last order ID from database
   */
  private async getLastOrderIdFromDatabase(storeIdentifier: string): Promise<number> {
    try {
      const lastOrder = await prisma.order.findFirst({
        where: {
          storeIdentifier: storeIdentifier,
          source: 'ECOMANAGER',
          ecoManagerId: { not: null }
        },
        orderBy: {
          ecoManagerId: 'desc'
        },
        select: {
          ecoManagerId: true
        }
      });

      if (!lastOrder || !lastOrder.ecoManagerId) {
        return 0;
      }

      return parseInt(lastOrder.ecoManagerId);
    } catch (error) {
      console.error(`Error getting last order ID for ${storeIdentifier}:`, error);
      return 0;
    }
  }

  /**
   * Calculate optimal page based on order ID
   */
  private async calculateOptimalPage(storeIdentifier: string, lastOrderId: number): Promise<number> {
    if (lastOrderId === 0) {
      return 1;
    }

    // 🚀 IMPROVED: Calculate page based on EcoManager API structure
    // EcoManager API returns orders in descending order (newest first)
    // We need to find which page contains our last order ID
    
    let estimatedPage: number;
    
    if (lastOrderId > 100000) {
      // For high order IDs (like JWLR: 114001), estimate based on total orders
      estimatedPage = Math.max(1, Math.floor(lastOrderId / 20));
    } else if (lastOrderId > 10000) {
      // For medium order IDs, use a different calculation
      estimatedPage = Math.max(1, Math.floor(lastOrderId / 15));
    } else {
      // For lower order IDs, use standard calculation
      estimatedPage = Math.max(1, Math.ceil(lastOrderId / 20));
    }
    
    console.log(`📊 [CALCULATION] Calculated position for ${storeIdentifier}:`);
    console.log(`   - Last Order ID: ${lastOrderId}`);
    console.log(`   - Estimated Page: ${estimatedPage}`);
    console.log(`   - Calculation method: ${lastOrderId > 100000 ? 'high-volume' : lastOrderId > 10000 ? 'medium-volume' : 'standard'}`);

    return estimatedPage;
  }

  /**
   * Save sync position to Redis
   */
  private async saveSyncPositionToRedis(position: StoreSyncPosition): Promise<void> {
    try {
      const pageInfoKey = `ecomanager:pageinfo:${position.storeIdentifier}`;
      const pageInfo = {
        lastPage: position.lastPage,
        firstId: position.firstId,
        lastId: position.lastId,
        timestamp: position.timestamp,
        storeName: position.storeName
      };

      await this.redis.set(pageInfoKey, JSON.stringify(pageInfo), 'EX', 86400 * 7); // 7 days
      console.log(`Saved sync position to Redis for ${position.storeIdentifier}:`, pageInfo);
    } catch (error) {
      console.error(`Error saving sync position to Redis for ${position.storeIdentifier}:`, error);
    }
  }

  /**
   * Load sync positions from JSON backup file
   */
  private async loadSyncPositionsFromJson(): Promise<SyncPositionBackup | null> {
    try {
      await this.ensureBackupDirectory();
      const data = await fs.readFile(this.backupFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('Error loading sync positions from JSON:', error);
      }
      return null;
    }
  }

  /**
   * Save sync positions to JSON backup file
   */
  private async saveSyncPositionsToJson(backup: SyncPositionBackup): Promise<void> {
    try {
      await this.ensureBackupDirectory();
      await fs.writeFile(this.backupFile, JSON.stringify(backup, null, 2), 'utf-8');
      console.log(`Saved sync positions to JSON backup: ${this.backupFile}`);
    } catch (error) {
      console.error('Error saving sync positions to JSON:', error);
    }
  }

  /**
   * Get sync position for a specific store (with fallback chain)
   */
  async getSyncPosition(storeIdentifier: string): Promise<SyncPosition> {
    // Try Redis first
    let position = await this.getSyncPositionFromRedis(storeIdentifier);
    if (position) {
      return {
        storeIdentifier: position.storeIdentifier,
        lastPage: position.lastPage,
        lastOrderId: position.lastOrderId,
        firstId: position.firstId,
        lastId: position.lastId,
        timestamp: position.timestamp,
        source: position.source
      };
    }

    // Try JSON backup
    const backup = await this.loadSyncPositionsFromJson();
    if (backup?.stores[storeIdentifier]) {
      const backupPosition = backup.stores[storeIdentifier];
      
      // Restore to Redis
      await this.saveSyncPositionToRedis(backupPosition);
      console.log(`Restored sync position from JSON backup for ${storeIdentifier}`);
      
      return {
        storeIdentifier: backupPosition.storeIdentifier,
        lastPage: backupPosition.lastPage,
        lastOrderId: backupPosition.lastOrderId,
        firstId: backupPosition.firstId,
        lastId: backupPosition.lastId,
        timestamp: backupPosition.timestamp,
        source: 'json'
      };
    }

    // Calculate from database
    const lastOrderId = await this.getLastOrderIdFromDatabase(storeIdentifier);
    const optimalPage = await this.calculateOptimalPage(storeIdentifier, lastOrderId);

    // Get store name from database
    const store = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier },
      select: { storeName: true }
    });

    const calculatedPosition: StoreSyncPosition = {
      storeIdentifier,
      storeName: store?.storeName || storeIdentifier,
      lastPage: optimalPage,
      lastOrderId,
      firstId: lastOrderId,
      lastId: lastOrderId,
      timestamp: new Date().toISOString(),
      source: 'calculated'
    };

    // Save to both Redis and JSON
    await this.saveSyncPositionToRedis(calculatedPosition);
    await this.backupSyncPosition(calculatedPosition);

    console.log(`Calculated new sync position for ${storeIdentifier}:`, calculatedPosition);
    
    return {
      storeIdentifier: calculatedPosition.storeIdentifier,
      lastPage: calculatedPosition.lastPage,
      lastOrderId: calculatedPosition.lastOrderId,
      firstId: calculatedPosition.firstId,
      lastId: calculatedPosition.lastId,
      timestamp: calculatedPosition.timestamp,
      source: calculatedPosition.source
    };
  }

  /**
   * Update sync position for a store
   */
  async updateSyncPosition(
    storeIdentifier: string,
    lastPage: number,
    firstId: number,
    lastId: number
  ): Promise<void> {
    const store = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier },
      select: { storeName: true }
    });

    const position: StoreSyncPosition = {
      storeIdentifier,
      storeName: store?.storeName || storeIdentifier,
      lastPage,
      lastOrderId: lastId,
      firstId,
      lastId,
      timestamp: new Date().toISOString(),
      source: 'redis'
    };

    // Save to Redis
    await this.saveSyncPositionToRedis(position);
    
    // Backup to JSON
    await this.backupSyncPosition(position);
  }

  /**
   * Backup a single sync position to JSON file
   */
  async backupSyncPosition(position: StoreSyncPosition): Promise<void> {
    let backup = await this.loadSyncPositionsFromJson();
    
    if (!backup) {
      backup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        stores: {}
      };
    }

    backup.stores[position.storeIdentifier] = position;
    backup.timestamp = new Date().toISOString();

    await this.saveSyncPositionsToJson(backup);
  }

  /**
   * Get all sync positions for all active stores
   */
  async getAllSyncPositions(): Promise<StoreSyncPosition[]> {
    const activeStores = await prisma.apiConfiguration.findMany({
      where: { isActive: true },
      select: { storeIdentifier: true, storeName: true }
    });

    const positions: StoreSyncPosition[] = [];

    for (const store of activeStores) {
      const position = await this.getSyncPosition(store.storeIdentifier);
      
      positions.push({
        storeIdentifier: position.storeIdentifier,
        storeName: store.storeName,
        lastPage: position.lastPage,
        lastOrderId: position.lastOrderId,
        firstId: position.firstId,
        lastId: position.lastId,
        timestamp: position.timestamp,
        source: position.source
      });
    }

    return positions;
  }

  /**
   * Restore all sync positions from JSON backup to Redis
   */
  async restoreAllSyncPositions(): Promise<{
    restored: number;
    failed: number;
    details: Array<{ storeIdentifier: string; status: 'restored' | 'failed'; error?: string }>;
  }> {
    const backup = await this.loadSyncPositionsFromJson();
    const results = {
      restored: 0,
      failed: 0,
      details: [] as Array<{ storeIdentifier: string; status: 'restored' | 'failed'; error?: string }>
    };

    if (!backup) {
      console.log('No JSON backup found, calculating positions from database...');
      
      // Get all active stores and calculate positions
      const activeStores = await prisma.apiConfiguration.findMany({
        where: { isActive: true },
        select: { storeIdentifier: true, storeName: true }
      });

      for (const store of activeStores) {
        try {
          await this.getSyncPosition(store.storeIdentifier);
          results.restored++;
          results.details.push({
            storeIdentifier: store.storeIdentifier,
            status: 'restored'
          });
          console.log(`Calculated and restored position for ${store.storeIdentifier}`);
        } catch (error) {
          results.failed++;
          results.details.push({
            storeIdentifier: store.storeIdentifier,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    }

    // Restore from JSON backup
    for (const [storeIdentifier, position] of Object.entries(backup.stores)) {
      try {
        await this.saveSyncPositionToRedis(position);
        results.restored++;
        results.details.push({
          storeIdentifier,
          status: 'restored'
        });
        console.log(`Restored sync position for ${storeIdentifier} from JSON backup`);
      } catch (error) {
        results.failed++;
        results.details.push({
          storeIdentifier,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Check if Redis cache has been cleared (all sync positions are missing or reset)
   */
  async detectCacheLoss(): Promise<{
    cacheCleared: boolean;
    missingStores: string[];
    resetStores: string[];
  }> {
    const activeStores = await prisma.apiConfiguration.findMany({
      where: { isActive: true },
      select: { storeIdentifier: true }
    });

    const missingStores: string[] = [];
    const resetStores: string[] = [];

    for (const store of activeStores) {
      const position = await this.getSyncPositionFromRedis(store.storeIdentifier);
      
      if (!position) {
        missingStores.push(store.storeIdentifier);
      } else if (position.lastPage <= 1 && position.lastOrderId === 0) {
        resetStores.push(store.storeIdentifier);
      }
    }

    const cacheCleared = missingStores.length > 0 || resetStores.length > 0;

    return {
      cacheCleared,
      missingStores,
      resetStores
    };
  }

  /**
   * Auto-recovery: detect cache loss and restore positions
   */
  async autoRecover(): Promise<boolean> {
    const detection = await this.detectCacheLoss();
    
    if (detection.cacheCleared) {
      console.log('🔄 Cache loss detected, initiating auto-recovery...');
      console.log(`   - Missing stores: ${detection.missingStores.length}`);
      console.log(`   - Reset stores: ${detection.resetStores.length}`);
      
      const restoration = await this.restoreAllSyncPositions();
      
      console.log(`✅ Auto-recovery completed: ${restoration.restored} restored, ${restoration.failed} failed`);
      return restoration.restored > 0;
    }

    return false;
  }

  /**
   * Get sync position status for admin dashboard
   */
  async getSyncPositionStatus(): Promise<{
    totalStores: number;
    healthyStores: number;
    problematicStores: number;
    stores: Array<{
      storeIdentifier: string;
      storeName: string;
      status: 'healthy' | 'missing' | 'reset' | 'calculated';
      lastPage: number;
      lastOrderId: number;
      source: string;
      timestamp: string;
    }>;
  }> {
    const positions = await this.getAllSyncPositions();
    
    let healthyStores = 0;
    let problematicStores = 0;

    const stores = positions.map(pos => {
      let status: 'healthy' | 'missing' | 'reset' | 'calculated' = 'healthy';
      
      if (pos.source === 'calculated') {
        status = 'calculated';
        problematicStores++;
      } else if (pos.lastPage <= 1 && pos.lastOrderId === 0) {
        status = 'reset';
        problematicStores++;
      } else {
        healthyStores++;
      }

      return {
        storeIdentifier: pos.storeIdentifier,
        storeName: pos.storeName,
        status,
        lastPage: pos.lastPage,
        lastOrderId: pos.lastOrderId,
        source: pos.source,
        timestamp: pos.timestamp
      };
    });

    return {
      totalStores: positions.length,
      healthyStores,
      problematicStores,
      stores
    };
  }
}
