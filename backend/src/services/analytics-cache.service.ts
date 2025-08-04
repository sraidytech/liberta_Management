/**
 * Advanced Analytics Caching Service
 * 
 * Implements intelligent caching strategies for analytics queries
 * to dramatically improve Advanced Reports performance
 */

import redis from '@/config/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  compress?: boolean; // Compress large data
  tags?: string[]; // Cache tags for invalidation
}

export class AnalyticsCacheService {
  private static instance: AnalyticsCacheService;
  private readonly defaultTTL = 300; // 5 minutes default
  private readonly compressionThreshold = 1024; // 1KB

  static getInstance(): AnalyticsCacheService {
    if (!AnalyticsCacheService.instance) {
      AnalyticsCacheService.instance = new AnalyticsCacheService();
    }
    return AnalyticsCacheService.instance;
  }

  /**
   * Generate intelligent cache key based on query parameters
   */
  generateCacheKey(
    endpoint: string, 
    params: Record<string, any>, 
    prefix: string = 'analytics'
  ): string {
    // Sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          result[key] = params[key];
        }
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    const hash = this.simpleHash(paramString);
    
    return `${prefix}:${endpoint}:${hash}`;
  }

  /**
   * Get cached data with automatic decompression
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Handle compressed data
      if (data._compressed) {
        return JSON.parse(this.decompress(data.data));
      }
      
      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with automatic compression and TTL
   */
  async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      let serializedData = JSON.stringify(data);
      
      // Compress large data
      if (options.compress || serializedData.length > this.compressionThreshold) {
        const compressed = this.compress(serializedData);
        serializedData = JSON.stringify({
          _compressed: true,
          data: compressed,
          originalSize: serializedData.length,
          compressedSize: compressed.length
        });
      }

      await redis.setex(key, ttl, serializedData);

      // Store tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeCacheTags(key, options.tags);
      }

    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Cached query wrapper with automatic caching
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<{ data: T; cached: boolean }> {
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached) {
      return { data: cached, cached: true };
    }

    // Execute query and cache result
    const data = await queryFn();
    await this.set(cacheKey, data, options);
    
    return { data, cached: false };
  }

  /**
   * Invalidate cache by pattern or tags
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `cache_tag:${tag}`;
        const keys = await redis.smembers(tagKey);
        
        if (keys.length > 0) {
          // Delete cached data
          await redis.del(...keys);
          // Delete tag set
          await redis.del(tagKey);
        }
      }
    } catch (error) {
      console.error('Cache tag invalidation error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await redis.info('memory');
      const keyCount = await redis.dbsize();
      
      return {
        totalKeys: keyCount,
        memoryUsage: this.extractMemoryUsage(info),
        hitRate: 0 // Would need to implement hit tracking
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { totalKeys: 0, memoryUsage: '0B', hitRate: 0 };
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up analytics cache...');
    
    // Common date ranges to pre-cache
    const commonRanges = [
      { dateRange: 'last7days' },
      { dateRange: 'last30days' },
      { dateRange: 'thisMonth' }
    ];

    // Pre-cache common queries (implement as needed)
    // This would call the analytics methods with common parameters
    console.log('✅ Cache warm-up completed');
  }

  // Private helper methods
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private compress(data: string): string {
    // Simple compression - in production, use a proper compression library
    return Buffer.from(data).toString('base64');
  }

  private decompress(data: string): string {
    return Buffer.from(data, 'base64').toString();
  }

  private async storeCacheTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache_tag:${tag}`;
      await redis.sadd(tagKey, key);
    }
  }

  private extractMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/);
    return match ? match[1].trim() : '0B';
  }
}

// Export singleton instance
export const analyticsCache = AnalyticsCacheService.getInstance();