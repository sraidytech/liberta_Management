import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

import { prisma } from '../config/database';

export interface EcoManagerOrder {
  id: number;
  reference: string;
  code?: string;
  name?: string;
  order_state_name: string;
  confirmation_state_name?: string;
  confirmation_history?: Array<{
    state_name: string;
    created_at: string;
  }>;
  full_name: string;
  telephone: string;
  wilaya: string;
  commune: string;
  items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    sku?: string;
    unit_price?: number;
    total_price?: number;
  }>;
  total_products: number;
  total: number;
  api_source?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EcoManagerConfig {
  storeName: string;
  storeIdentifier: string;
  apiToken: string;
  baseUrl: string;
}

export class EcoManagerService {
  private axiosInstance: any;
  private redis: Redis;
  private config: EcoManagerConfig;
  private readonly RATE_LIMIT_DELAY = 250; // 250ms between requests (4 req/sec max)
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 20; // Reduced batch size to be safer
  
  // EcoManager API Rate Limits
  private readonly RATE_LIMITS = {
    perSecond: 4,     // Conservative: 4 instead of 5
    perMinute: 40,    // Conservative: 40 instead of 50
    perHour: 800,     // Conservative: 800 instead of 1000
    perDay: 8000      // Conservative: 8000 instead of 10000
  };

  constructor(config: EcoManagerConfig, redis: Redis) {
    this.config = config;
    this.redis = redis;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    // Add request interceptor for comprehensive rate limiting
    this.axiosInstance.interceptors.request.use(async (config: any) => {
      await this.enforceRateLimit();
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 429) {
          // Rate limit exceeded - implement exponential backoff
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
          
          console.log(`🚫 Rate limit exceeded for ${this.config.storeName}. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Don't retry automatically - let the calling code handle it
          throw new Error(`Rate limit exceeded. Waited ${waitTime}ms. Please retry manually.`);
        }
        
        if (error.response?.status === 403) {
          console.error(`🚫 403 Forbidden for ${this.config.storeName}. Check API token validity.`);
          throw new Error(`API access forbidden. Please check your API token for ${this.config.storeName}.`);
        }
        
        throw error;
      }
    );
  }

  /**
   * Enforce comprehensive rate limiting for EcoManager API
   */
  private async enforceRateLimit(): Promise<void> {
    const storeId = this.config.storeIdentifier;
    const now = Date.now();
    
    try {
      // Check per-second rate limit
      const secondKey = `ecomanager:rate:second:${storeId}:${Math.floor(now / 1000)}`;
      const secondCount = await this.redis.incr(secondKey);
      await this.redis.expire(secondKey, 2); // Expire after 2 seconds
      
      if (secondCount > this.RATE_LIMITS.perSecond) {
        const waitTime = 1000 - (now % 1000) + 100; // Wait until next second + 100ms buffer
        console.log(`⚠️ Per-second rate limit reached for ${this.config.storeName}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Check per-minute rate limit
      const minuteKey = `ecomanager:rate:minute:${storeId}:${Math.floor(now / 60000)}`;
      const minuteCount = await this.redis.incr(minuteKey);
      await this.redis.expire(minuteKey, 120); // Expire after 2 minutes
      
      if (minuteCount > this.RATE_LIMITS.perMinute) {
        const waitTime = 60000 - (now % 60000) + 1000; // Wait until next minute + 1s buffer
        console.log(`⚠️ Per-minute rate limit reached for ${this.config.storeName}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Check per-hour rate limit
      const hourKey = `ecomanager:rate:hour:${storeId}:${Math.floor(now / 3600000)}`;
      const hourCount = await this.redis.incr(hourKey);
      await this.redis.expire(hourKey, 7200); // Expire after 2 hours
      
      if (hourCount > this.RATE_LIMITS.perHour) {
        const waitTime = 3600000 - (now % 3600000) + 5000; // Wait until next hour + 5s buffer
        console.log(`⚠️ Per-hour rate limit reached for ${this.config.storeName}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Check per-day rate limit
      const dayKey = `ecomanager:rate:day:${storeId}:${Math.floor(now / 86400000)}`;
      const dayCount = await this.redis.incr(dayKey);
      await this.redis.expire(dayKey, 172800); // Expire after 2 days
      
      if (dayCount > this.RATE_LIMITS.perDay) {
        const waitTime = 86400000 - (now % 86400000) + 10000; // Wait until next day + 10s buffer
        console.log(`⚠️ Per-day rate limit reached for ${this.config.storeName}. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Always add minimum delay between requests
      const lastRequestKey = `ecomanager:last_request:${storeId}`;
      const lastRequest = await this.redis.get(lastRequestKey);
      
      if (lastRequest) {
        const timeSinceLastRequest = now - parseInt(lastRequest);
        if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
          const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      await this.redis.set(lastRequestKey, Date.now().toString(), 'EX', 60);
      
    } catch (error) {
      console.error(`❌ Rate limiting error for ${this.config.storeName}:`, error);
      // Fallback to simple delay if Redis fails
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
    }
  }

  /**
   * Get current rate limit status for monitoring
   */
  async getRateLimitStatus(): Promise<{
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
    limits: {
      perSecond: number;
      perMinute: number;
      perHour: number;
      perDay: number;
    };
  }> {
    const storeId = this.config.storeIdentifier;
    const now = Date.now();
    
    try {
      const [secondCount, minuteCount, hourCount, dayCount] = await Promise.all([
        this.redis.get(`ecomanager:rate:second:${storeId}:${Math.floor(now / 1000)}`),
        this.redis.get(`ecomanager:rate:minute:${storeId}:${Math.floor(now / 60000)}`),
        this.redis.get(`ecomanager:rate:hour:${storeId}:${Math.floor(now / 3600000)}`),
        this.redis.get(`ecomanager:rate:day:${storeId}:${Math.floor(now / 86400000)}`)
      ]);
      
      return {
        perSecond: parseInt(secondCount || '0'),
        perMinute: parseInt(minuteCount || '0'),
        perHour: parseInt(hourCount || '0'),
        perDay: parseInt(dayCount || '0'),
        limits: this.RATE_LIMITS
      };
    } catch (error) {
      console.error(`❌ Failed to get rate limit status for ${this.config.storeName}:`, error);
      return {
        perSecond: 0,
        perMinute: 0,
        perHour: 0,
        perDay: 0,
        limits: this.RATE_LIMITS
      };
    }
  }

  /**
   * Fetch orders from EcoManager API with pagination
   */
  async fetchOrdersPage(page: number = 1, perPage: number = this.BATCH_SIZE): Promise<EcoManagerOrder[]> {
    try {
      // Only fetch orders from 2025 January onwards
      const fromDate = '2025-01-01';
      
      const response = await this.axiosInstance.get('/orders', {
        params: {
          per_page: perPage,
          page: page,
          sort: '-id', // Sort by ID descending (newest first)
          created_at_from: fromDate // Filter orders from 2025 January onwards
        }
      });

      return (response.data as any).data || [];
    } catch (error) {
      console.error(`Error fetching orders page ${page} for ${this.config.storeName}:`, error);
      throw new Error(`Failed to fetch orders from EcoManager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all orders from EcoManager (for initial import)
   */
  async fetchAllOrders(maxOrders: number = 100000): Promise<EcoManagerOrder[]> {
    const allOrders: EcoManagerOrder[] = [];
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3;

    console.log(`Starting bulk import for ${this.config.storeName}...`);

    while (allOrders.length < maxOrders && consecutiveEmptyPages < maxEmptyPages) {
      try {
        // Reduced logging - only log every 10 pages
        if (page % 10 === 1) {
          console.log(`Fetching page ${page} for ${this.config.storeName}...`);
        }
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          // Only log empty pages if verbose logging is needed
          if (consecutiveEmptyPages === 1) {
            console.log(`Reached empty pages for ${this.config.storeName} starting at page ${page}`);
          }
          page++;
          continue;
        }

        allOrders.push(...orders);
        consecutiveEmptyPages = 0;
        
        // Reduced logging - only log progress every 10 pages
        if (page % 10 === 0) {
          console.log(`Progress: ${allOrders.length} orders fetched for ${this.config.storeName} (page ${page})`);
        }

        // Break if we got less than batch size (last page)
        if (orders.length < this.BATCH_SIZE) {
          console.log(`Reached last page for ${this.config.storeName}`);
          break;
        }

        page++;
      } catch (error) {
        console.error(`Error fetching page ${page} for ${this.config.storeName}:`, error);
        throw error;
      }
    }

    console.log(`Completed bulk import for ${this.config.storeName}: ${allOrders.length} orders`);
    return allOrders.slice(0, maxOrders);
  }

  /**
   * Find the page containing the lastOrderId using binary search
   * Since EcoManager orders are sorted by ID descending (newest first),
   * we need to find the exact page where lastOrderId exists
   */
  async findPageWithOrderId(lastOrderId: number): Promise<number> {
    console.log(`Finding page containing order ID ${lastOrderId} for ${this.config.storeName}...`);
    
    let left = 1;
    let right = 2000; // Start with reasonable upper bound
    let targetPage = 1;

    // First, find the approximate range by checking exponentially increasing pages
    let testPage = 1;
    let maxId = 0;
    let minId = 0;

    console.log(`Scanning for order ID ${lastOrderId} range...`);
    
    while (testPage <= 100) {
      try {
        const orders = await this.fetchOrdersPage(testPage, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          console.log(`No more orders found at page ${testPage}`);
          right = testPage - 1;
          break;
        }

        maxId = orders[0].id; // Highest ID on page (newest)
        minId = orders[orders.length - 1].id; // Lowest ID on page (oldest)

        console.log(`${this.config.storeName} Page ${testPage} ID range: ${maxId} - ${minId}`);

        // Check if our target ID is in this range
        if (lastOrderId >= minId && lastOrderId <= maxId) {
          console.log(`Found target order ID ${lastOrderId} on page ${testPage}!`);
          return testPage;
        }

        // If our target ID is higher than the max on this page, we need to go to earlier pages
        if (lastOrderId > maxId) {
          console.log(`Target ID ${lastOrderId} is higher than page ${testPage} max (${maxId}), checking earlier pages...`);
          right = testPage - 1;
          break;
        }

        // If our target ID is lower than the min on this page, continue to later pages
        if (lastOrderId < minId) {
          console.log(`Target ID ${lastOrderId} is lower than page ${testPage} min (${minId}), continuing to later pages...`);
          left = testPage + 1;
          testPage = testPage * 2; // Exponential search
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`Error during page scan for ${this.config.storeName} at page ${testPage}:`, error instanceof Error ? error.message : 'Unknown error');
        break;
      }
    }

    // Now do binary search in the identified range
    console.log(`Binary searching between pages ${left} and ${right}...`);
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      try {
        const orders = await this.fetchOrdersPage(mid, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          right = mid - 1;
          continue;
        }

        const firstId = orders[0].id;
        const lastId = orders[orders.length - 1].id;

        console.log(`${this.config.storeName} Binary search page ${mid} ID range: ${firstId} - ${lastId}`);

        // Check if our target ID is in this range
        if (lastOrderId >= lastId && lastOrderId <= firstId) {
          console.log(`Found target order ID ${lastOrderId} on page ${mid}!`);
          return mid;
        }

        if (lastOrderId > firstId) {
          // Target is in earlier pages (lower page numbers)
          right = mid - 1;
        } else {
          // Target is in later pages (higher page numbers)
          left = mid + 1;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`Error during binary search for ${this.config.storeName} at page ${mid}:`, error instanceof Error ? error.message : 'Unknown error');
        break;
      }
    }

    // If not found exactly, start from the closest page
    targetPage = Math.max(1, left - 1);
    console.log(`Could not find exact page for order ID ${lastOrderId}, starting from page ${targetPage}`);
    return targetPage;
  }

  /**
   * Get existing order IDs from database (like Google Sheets getExistingOrderIds)
   */
  async getExistingOrderIds(): Promise<Set<number>> {
    try {
      console.log(`Fetching existing order IDs for ${this.config.storeName} from database...`);
      
      // Use raw query to get all ecoManagerIds for this store
      const existingOrders = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${this.config.storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
      `;

      const existingIds = new Set<number>();
      existingOrders.forEach(order => {
        const id = parseInt(order.ecoManagerId);
        if (!isNaN(id)) {
          existingIds.add(id);
        }
      });

      console.log(`Loaded ${existingIds.size} existing order IDs for ${this.config.storeName} from database`);
      return existingIds;
    } catch (error) {
      console.error(`Error getting existing order IDs for ${this.config.storeName}:`, error);
      return new Set<number>();
    }
  }

  /**
   * Fetch new orders using OPTIMIZED strategy
   */
  async fetchNewOrders(lastOrderId: number): Promise<EcoManagerOrder[]> {
    const newOrders: EcoManagerOrder[] = [];
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3;

    console.log(`Fetching new "En dispatch" orders for ${this.config.storeName}...`);
    console.log(`Last synced EcoManager order ID for ${this.config.storeName}: ${lastOrderId}`);

    // Get cached page info
    const pageInfo = await this.getPageInfo();
    let currentLastPage = pageInfo?.lastPage || 1;

    // OPTIMIZATION 1: Scan -10 pages backward and forward until max page found
    const backwardRange = 10;
    const startPage = Math.max(1, currentLastPage - backwardRange);
    
    console.log(`Scanning ${this.config.storeName} from page ${startPage} backward (-10) and forward until max page...`);

    let newLastPage = currentLastPage;
    let foundNewOrders = false;

    // OPTIMIZATION 2: Scan forward from current last page until max page found
    let page = currentLastPage;
    console.log(`Starting forward scan from page ${page}...`);
    
    while (consecutiveEmptyPages < maxEmptyPages) {
      try {
        console.log(`Fetching ${this.config.storeName} page ${page}...`);
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Empty page received (${consecutiveEmptyPages}/${maxEmptyPages})`);
          if (consecutiveEmptyPages >= maxEmptyPages) {
            console.log(`Stopping forward scan after ${maxEmptyPages} empty pages`);
            break;
          }
          page++;
          continue;
        }

        consecutiveEmptyPages = 0;
        if (page > newLastPage) {
          newLastPage = page;
        }

        const firstId = orders[0].id;
        const lastId = orders[orders.length - 1].id;
        
        console.log(`Received ${orders.length} orders. ID range: ${firstId} - ${lastId}`);

        // OPTIMIZATION 3: Use database query instead of loading all IDs into memory
        const newDispatchOrders = await this.filterNewDispatchOrders(orders, lastOrderId);

        if (newDispatchOrders.length > 0) {
          newOrders.push(...newDispatchOrders);
          foundNewOrders = true;
          console.log(`Found ${newDispatchOrders.length} new dispatch orders on page ${page}`);
          
          // Show details of found orders
          newDispatchOrders.forEach(order => {
            console.log(`  - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          });
        }

        // Save page info for next run
        await this.savePageInfo(page, firstId, lastId);

        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        page++;
        continue;
      }
    }

    // OPTIMIZATION 4: Always scan backward 10 pages from current last page
    console.log(`Scanning backward from page ${currentLastPage - 1} to ${startPage}...`);
    
    for (let backPage = currentLastPage - 1; backPage >= startPage; backPage--) {
      try {
        console.log(`Fetching ${this.config.storeName} page ${backPage}...`);
        const orders = await this.fetchOrdersPage(backPage, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          continue;
        }

        const firstId = orders[0].id;
        const lastId = orders[orders.length - 1].id;
        
        console.log(`Received ${orders.length} orders. ID range: ${firstId} - ${lastId}`);

        const newDispatchOrders = await this.filterNewDispatchOrders(orders, lastOrderId);

        if (newDispatchOrders.length > 0) {
          newOrders.push(...newDispatchOrders);
          foundNewOrders = true;
          console.log(`Found ${newDispatchOrders.length} new dispatch orders on page ${backPage}`);
          
          // Show details of found orders
          newDispatchOrders.forEach(order => {
            console.log(`  - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          });
        }

        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`Error fetching page ${backPage}:`, error);
        continue;
      }
    }

    // Update last page if changed
    if (newLastPage !== currentLastPage) {
      console.log(`Updating last page for ${this.config.storeName} from ${currentLastPage} to ${newLastPage}`);
      const lastPageOrders = await this.fetchOrdersPage(newLastPage, this.BATCH_SIZE);
      if (lastPageOrders && lastPageOrders.length > 0) {
        await this.savePageInfo(newLastPage, lastPageOrders[lastPageOrders.length - 1].id, lastPageOrders[0].id);
      }
    }

    console.log(`Found ${newOrders.length} new "En dispatch" orders for ${this.config.storeName}`);
    return newOrders;
  }

  /**
   * OPTIMIZATION 3: Filter new dispatch orders using database queries instead of loading all IDs
   */
  private async filterNewDispatchOrders(orders: EcoManagerOrder[], lastOrderId: number): Promise<EcoManagerOrder[]> {
    // Filter for "En dispatch" orders first
    const dispatchOrders = orders.filter(order => order.order_state_name === 'En dispatch');
    
    if (dispatchOrders.length === 0) {
      return [];
    }

    // Get the IDs of these specific orders from database
    const orderIds = dispatchOrders.map(order => order.id.toString());
    
    const existingOrders = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
      SELECT "ecoManagerId"
      FROM "orders"
      WHERE "storeIdentifier" = ${this.config.storeIdentifier}
        AND "source" = 'ECOMANAGER'
        AND "ecoManagerId" = ANY(${orderIds})
    `;

    const existingIds = new Set(existingOrders.map(order => order.ecoManagerId));

    // Return orders that don't exist in database
    return dispatchOrders.filter(order => !existingIds.has(order.id.toString()));
  }

  /**
   * Find starting page for first run (scan all pages)
   */
  async findStartingPageForFirstRun(lastOrderId: number): Promise<number> {
    console.log(`Finding optimal starting page for ${this.config.storeName}...`);
    
    let left = 1;
    let right = Math.ceil(20000 / this.BATCH_SIZE);
    let targetPage = 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      try {
        const orders = await this.fetchOrdersPage(mid, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          right = mid - 1;
          continue;
        }

        const firstId = orders[0].id;
        const lastId = orders[orders.length - 1].id;

        console.log(`${this.config.storeName} Page ${mid} ID range: ${firstId} - ${lastId}`);

        if (lastId < lastOrderId) {
          left = mid + 1;
        } else if (firstId > lastOrderId) {
          right = mid - 1;
          targetPage = mid;
        } else {
          targetPage = mid;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`Error during binary search for ${this.config.storeName} at page ${mid}:`, error instanceof Error ? error.message : 'Unknown error');
        break;
      }
    }

    const finalPage = targetPage || Math.max(1, right);
    console.log(`Starting ${this.config.storeName} from calculated page ${finalPage}`);
    return finalPage;
  }

  /**
   * Fetch new orders with any status (for testing/debugging)
   */
  async fetchNewOrdersAnyStatus(lastOrderId: number, maxOrders: number = 100): Promise<EcoManagerOrder[]> {
    const newOrders: EcoManagerOrder[] = [];
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3;

    console.log(`Fetching new orders (any status) for ${this.config.storeName} since ID ${lastOrderId}...`);

    while (consecutiveEmptyPages < maxEmptyPages && newOrders.length < maxOrders) {
      try {
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          page++;
          continue;
        }

        console.log(`${this.config.storeName} Page ${page}: ${orders.length} orders, ID range: ${orders[0].id} - ${orders[orders.length-1].id}`);

        // Show status distribution
        const statusCounts: { [key: string]: number } = {};
        orders.forEach(order => {
          statusCounts[order.order_state_name] = (statusCounts[order.order_state_name] || 0) + 1;
        });
        console.log(`${this.config.storeName} Page ${page} statuses:`, statusCounts);

        // Filter for orders newer than lastOrderId (any status)
        const filteredOrders = orders.filter(order => order.id > lastOrderId);
        
        if (filteredOrders.length > 0) {
          newOrders.push(...filteredOrders);
          consecutiveEmptyPages = 0;
          console.log(`Found ${filteredOrders.length} new orders (any status) on page ${page} for ${this.config.storeName}`);
        } else {
          consecutiveEmptyPages++;
        }

        // Break if we got less than batch size (last page)
        if (orders.length < this.BATCH_SIZE) {
          console.log(`Reached last page for ${this.config.storeName}`);
          break;
        }

        page++;
      } catch (error) {
        console.error(`Error fetching orders page ${page} for ${this.config.storeName}:`, error);
        break;
      }
    }

    console.log(`Found ${newOrders.length} new orders (any status) for ${this.config.storeName}`);
    return newOrders;
  }

  /**
   * Convert EcoManager order to database format
   */
  mapOrderToDatabase(ecoOrder: EcoManagerOrder): any {
    return {
      ecoManagerId: ecoOrder.id.toString(),
      reference: ecoOrder.reference || `ECO-${ecoOrder.id}`,
      source: 'ECOMANAGER',
      status: this.mapOrderStatus(ecoOrder.order_state_name),
      total: parseFloat(ecoOrder.total.toString()),
      shippingCost: 0, // Default, can be updated later
      notes: null, // Keep notes field clean for agent notes only
      additionalMetaData: {
        ecoManagerConfirmationHistory: ecoOrder.confirmation_history || [],
        lastConfirmation: ecoOrder.confirmation_history && ecoOrder.confirmation_history.length > 0
          ? ecoOrder.confirmation_history[ecoOrder.confirmation_history.length - 1].state_name
          : null
      },
      ecoManagerStatus: ecoOrder.order_state_name,
      storeIdentifier: this.config.storeIdentifier,
      orderDate: new Date(ecoOrder.created_at),
      // Customer will be handled separately in the controller
      customerData: {
        fullName: ecoOrder.full_name,
        telephone: ecoOrder.telephone,
        wilaya: ecoOrder.wilaya,
        commune: ecoOrder.commune
      },
      items: {
        create: ecoOrder.items.map(item => ({
          productId: item.product_id.toString(), // Convert to string
          sku: item.sku || null, // Add SKU field
          title: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat((item.unit_price || 0).toString()),
          totalPrice: parseFloat((item.total_price || (item.unit_price ? item.unit_price * item.quantity : 0) || 0).toString())
        }))
      }
    };
  }

  /**
   * Map EcoManager status to internal status
   */
  private mapOrderStatus(ecoStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'En dispatch': 'PENDING',
      'Confirmé': 'CONFIRMED',
      'En cours': 'IN_PROGRESS',
      'Expédié': 'SHIPPED',
      'Livré': 'DELIVERED',
      'Annulé': 'CANCELLED',
      'Retourné': 'RETURNED'
    };

    return statusMap[ecoStatus] || 'PENDING';
  }

  /**
   * Save page info to cache (like Google Sheets script)
   */
  async savePageInfo(lastPage: number, firstId: number, lastId: number): Promise<void> {
    const pageInfoKey = `ecomanager:pageinfo:${this.config.storeIdentifier}`;
    const pageInfo = {
      lastPage,
      firstId,
      lastId,
      timestamp: new Date().toISOString(),
      storeName: this.config.storeName
    };

    await this.redis.set(pageInfoKey, JSON.stringify(pageInfo), 'EX', 86400 * 7); // 7 days
    console.log(`Saved page info for ${this.config.storeName}:`, pageInfo);
  }

  /**
   * Get last page info from cache
   */
  async getPageInfo(): Promise<any> {
    const pageInfoKey = `ecomanager:pageinfo:${this.config.storeIdentifier}`;
    const pageData = await this.redis.get(pageInfoKey);
    
    return pageData ? JSON.parse(pageData) : null;
  }

  /**
   * Save sync status to cache
   */
  async saveSyncStatus(lastOrderId: number, totalSynced: number): Promise<void> {
    const syncKey = `ecomanager:sync:${this.config.storeIdentifier}`;
    const syncData = {
      lastOrderId,
      totalSynced,
      lastSync: new Date().toISOString(),
      storeName: this.config.storeName
    };

    await this.redis.set(syncKey, JSON.stringify(syncData), 'EX', 86400); // 24 hours
  }

  /**
   * Get last sync status from cache
   */
  async getLastSyncStatus(): Promise<any> {
    const syncKey = `ecomanager:sync:${this.config.storeIdentifier}`;
    const syncData = await this.redis.get(syncKey);
    
    return syncData ? JSON.parse(syncData) : null;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/orders', {
        params: { per_page: 1, page: 1 }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error(`Connection test failed for ${this.config.storeName}:`, error);
      return false;
    }
  }
}