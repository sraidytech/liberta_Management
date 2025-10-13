import { Redis } from 'ioredis';

export interface MaystroApiKeyConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
  isPrimary: boolean;
  storeIdentifiers?: string[]; // NEW: Store identifiers that use this API key
  requestCount: number;
  successCount: number;
  errorCount: number;
  lastUsed?: Date;
  lastTestAt?: Date;
  lastTestStatus?: 'success' | 'error';
  lastTestError?: string;
}

export class MaystroConfigService {
  private redis: Redis;
  private apiKeys: Map<string, MaystroApiKeyConfig> = new Map();
  private storeToApiKeyMap: Map<string, string> = new Map(); // NEW: Store -> API Key ID mapping

  constructor(redis: Redis) {
    this.redis = redis;
    this.loadApiKeysFromEnv();
    this.buildStoreToApiKeyMap();
  }

  /**
   * Load Maystro API keys from environment variables
   * Supports pattern: MAYSTRO_API_KEY_1, MAYSTRO_API_KEY_1_NAME, MAYSTRO_API_KEY_1_STORES, etc.
   */
  private loadApiKeysFromEnv(): void {
    const apiKeys: MaystroApiKeyConfig[] = [];
    
    // Check for single API key (backward compatibility)
    if (process.env.MAYSTRO_API_KEY) {
      const stores = process.env.MAYSTRO_API_KEY_STORES 
        ? process.env.MAYSTRO_API_KEY_STORES.split(',').map(s => s.trim())
        : undefined;

      apiKeys.push({
        id: 'primary',
        name: 'Primary API Key',
        apiKey: process.env.MAYSTRO_API_KEY,
        baseUrl: process.env.MAYSTRO_BASE_URL || 'https://backend.maystro-delivery.com',
        isActive: true,
        isPrimary: true,
        storeIdentifiers: stores,
        requestCount: 0,
        successCount: 0,
        errorCount: 0
      });
    }

    // Check for multiple API keys
    let keyIndex = 1;
    while (process.env[`MAYSTRO_API_KEY_${keyIndex}`]) {
      const apiKey = process.env[`MAYSTRO_API_KEY_${keyIndex}`];
      if (!apiKey) break; // Skip if undefined
      
      const name = process.env[`MAYSTRO_API_KEY_${keyIndex}_NAME`] || `Maystro API ${keyIndex}`;
      const baseUrl = process.env.MAYSTRO_BASE_URL || 'https://backend.maystro-delivery.com';
      const storesEnv = process.env[`MAYSTRO_API_KEY_${keyIndex}_STORES`];
      const stores = storesEnv ? storesEnv.split(',').map(s => s.trim()) : undefined;

      apiKeys.push({
        id: `key_${keyIndex}`,
        name,
        apiKey,
        baseUrl,
        isActive: true,
        isPrimary: keyIndex === 1 && !process.env.MAYSTRO_API_KEY, // First multi-key is primary if no single key
        storeIdentifiers: stores,
        requestCount: 0,
        successCount: 0,
        errorCount: 0
      });

      keyIndex++;
    }

    // Store in memory map
    apiKeys.forEach(key => {
      this.apiKeys.set(key.id, key);
    });

    console.log(`🔑 Loaded ${apiKeys.length} Maystro API key(s)`);
    apiKeys.forEach(key => {
      const storesInfo = key.storeIdentifiers 
        ? ` [Stores: ${key.storeIdentifiers.join(', ')}]`
        : ' [All stores]';
      console.log(`   - ${key.name} (${key.isPrimary ? 'Primary' : 'Secondary'})${storesInfo}`);
    });
  }

  /**
   * Build store-to-API-key mapping from configured API keys
   */
  private buildStoreToApiKeyMap(): void {
    this.storeToApiKeyMap.clear();
    
    this.apiKeys.forEach((config, keyId) => {
      if (config.storeIdentifiers && config.storeIdentifiers.length > 0) {
        config.storeIdentifiers.forEach(store => {
          this.storeToApiKeyMap.set(store, keyId);
          console.log(`   📍 Mapped store ${store} -> ${config.name}`);
        });
      }
    });

    console.log(`📍 Store-to-API-key mapping complete: ${this.storeToApiKeyMap.size} store(s) mapped`);
  }

  /**
   * Get API key for a specific store
   */
  public getApiKeyForStore(storeIdentifier: string): MaystroApiKeyConfig | null {
    const apiKeyId = this.storeToApiKeyMap.get(storeIdentifier);
    
    if (apiKeyId) {
      const apiKey = this.apiKeys.get(apiKeyId);
      if (apiKey && apiKey.isActive) {
        return apiKey;
      }
    }
    
    // Fallback to primary API key if no specific mapping found
    return this.getPrimaryApiKey();
  }

  /**
   * Get all configured API keys
   */
  public getAllApiKeys(): MaystroApiKeyConfig[] {
    return Array.from(this.apiKeys.values());
  }

  /**
   * Get primary API key
   */
  public getPrimaryApiKey(): MaystroApiKeyConfig | null {
    const primaryKey = Array.from(this.apiKeys.values()).find(key => key.isPrimary && key.isActive);
    return primaryKey || null;
  }

  /**
   * Get API key by ID
   */
  public getApiKeyById(id: string): MaystroApiKeyConfig | null {
    return this.apiKeys.get(id) || null;
  }

  /**
   * Get next available API key (load balancing)
   */
  public getNextAvailableApiKey(): MaystroApiKeyConfig | null {
    const activeKeys = Array.from(this.apiKeys.values()).filter(key => key.isActive);
    
    if (activeKeys.length === 0) {
      return null;
    }

    // Simple round-robin: find key with lowest request count
    const sortedKeys = activeKeys.sort((a, b) => a.requestCount - b.requestCount);
    return sortedKeys[0];
  }

  /**
   * Update API key statistics
   */
  public async updateApiKeyStats(keyId: string, success: boolean): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    apiKey.requestCount++;
    apiKey.lastUsed = new Date();
    
    if (success) {
      apiKey.successCount++;
    } else {
      apiKey.errorCount++;
    }

    // Store updated stats in Redis for persistence
    await this.redis.hset(`maystro:api_key:${keyId}`, {
      requestCount: apiKey.requestCount,
      successCount: apiKey.successCount,
      errorCount: apiKey.errorCount,
      lastUsed: apiKey.lastUsed.toISOString()
    });
  }

  /**
   * Update API key test results
   */
  public async updateApiKeyTestResult(keyId: string, success: boolean, error?: string): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return;

    apiKey.lastTestAt = new Date();
    apiKey.lastTestStatus = success ? 'success' : 'error';
    apiKey.lastTestError = error;

    // Store test results in Redis
    await this.redis.hset(`maystro:api_key:${keyId}`, {
      lastTestAt: apiKey.lastTestAt.toISOString(),
      lastTestStatus: apiKey.lastTestStatus,
      lastTestError: error || ''
    });
  }

  /**
   * Load API key statistics from Redis
   */
  public async loadApiKeyStatsFromRedis(): Promise<void> {
    for (const [keyId, apiKey] of this.apiKeys) {
      try {
        const stats = await this.redis.hgetall(`maystro:api_key:${keyId}`);
        
        if (stats.requestCount) {
          apiKey.requestCount = parseInt(stats.requestCount) || 0;
          apiKey.successCount = parseInt(stats.successCount) || 0;
          apiKey.errorCount = parseInt(stats.errorCount) || 0;
        }
        
        if (stats.lastUsed) {
          apiKey.lastUsed = new Date(stats.lastUsed);
        }
        
        if (stats.lastTestAt) {
          apiKey.lastTestAt = new Date(stats.lastTestAt);
          apiKey.lastTestStatus = stats.lastTestStatus as 'success' | 'error';
          apiKey.lastTestError = stats.lastTestError || undefined;
        }
      } catch (error) {
        console.error(`Error loading stats for API key ${keyId}:`, error);
      }
    }
  }

  /**
   * Test connection for a specific API key
   */
  public async testApiKeyConnection(keyId: string): Promise<{ success: boolean; error?: string }> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      return { success: false, error: 'API key not found' };
    }

    try {
      // Import axios here to avoid circular dependencies
      const axios = (await import('axios')).default;
      
      const response = await axios.get(`${apiKey.baseUrl}/api/stores/orders/?limit=1`, {
        headers: {
          'Authorization': `Token ${apiKey.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const success = response.status === 200;
      await this.updateApiKeyTestResult(keyId, success);
      
      return { success };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Connection failed';
      await this.updateApiKeyTestResult(keyId, false, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get API key statistics for admin dashboard
   */
  public getApiKeyStats(): any[] {
    return Array.from(this.apiKeys.values()).map(key => ({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      isPrimary: key.isPrimary,
      storeIdentifiers: key.storeIdentifiers,
      requestCount: key.requestCount,
      successCount: key.successCount,
      errorCount: key.errorCount,
      successRate: key.requestCount > 0 ? Math.round((key.successCount / key.requestCount) * 100) : 0,
      lastUsed: key.lastUsed?.toISOString(),
      lastTestAt: key.lastTestAt?.toISOString(),
      lastTestStatus: key.lastTestStatus,
      lastTestError: key.lastTestError,
      // Don't expose the actual API key for security
      apiKeyPreview: `${key.apiKey.substring(0, 8)}...${key.apiKey.substring(key.apiKey.length - 8)}`
    }));
  }
}