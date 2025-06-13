import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();

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
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 100;

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

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config: any) => {
      const lastRequestKey = `ecomanager:last_request:${this.config.storeIdentifier}`;
      const lastRequest = await this.redis.get(lastRequestKey);
      
      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - parseInt(lastRequest);
        if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
          await new Promise(resolve => 
            setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest)
          );
        }
      }
      
      await this.redis.set(lastRequestKey, Date.now().toString(), 'EX', 60);
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait longer
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY * 2));
          return this.axiosInstance.request(error.config);
        }
        throw error;
      }
    );
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
        console.log(`Fetching page ${page} for ${this.config.storeName}...`);
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Empty page ${page} for ${this.config.storeName} (${consecutiveEmptyPages}/${maxEmptyPages})`);
          page++;
          continue;
        }

        allOrders.push(...orders);
        consecutiveEmptyPages = 0;
        
        console.log(`Fetched ${orders.length} orders from page ${page} for ${this.config.storeName}`);
        console.log(`Total orders so far: ${allOrders.length}`);

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
   * Fetch new orders using EXACT Google Sheets strategy
   */
  async fetchNewOrders(lastOrderId: number): Promise<EcoManagerOrder[]> {
    const newOrders: EcoManagerOrder[] = [];
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3;

    console.log(`Fetching new "En dispatch" orders for ${this.config.storeName}...`);

    // Get existing order IDs from database (like Google Sheets)
    const existingOrderIds = await this.getExistingOrderIds();

    // Get cached page info
    const pageInfo = await this.getPageInfo();
    let currentLastPage = pageInfo?.lastPage || 1;

    // Check pages around cached position (±50 pages like Google Sheets)
    const startPage = Math.max(1, currentLastPage - 50);
    const endPage = currentLastPage + 50;

    console.log(`Checking pages ${startPage} to ${endPage} for ${this.config.storeName}...`);

    let newLastPage = currentLastPage;

    // Scan all pages in range (like Google Sheets)
    for (let page = startPage; page <= endPage; page++) {
      try {
        console.log(`Fetching ${this.config.storeName} page ${page}...`);
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Empty page received (${consecutiveEmptyPages}/${maxEmptyPages})`);
          if (consecutiveEmptyPages >= maxEmptyPages && page > currentLastPage) {
            console.log(`Stopping scan after ${maxEmptyPages} empty pages`);
            break;
          }
          continue;
        }

        consecutiveEmptyPages = 0;
        if (page > newLastPage) {
          newLastPage = page;
        }

        const firstId = orders[0].id;
        const lastId = orders[orders.length - 1].id;
        
        console.log(`Received ${orders.length} orders. ID range: ${firstId} - ${lastId}`);

        // Filter for "En dispatch" orders that don't exist in database (EXACT Google Sheets logic)
        const newDispatchOrders = orders.filter(order =>
          order.order_state_name === 'En dispatch' &&
          !existingOrderIds.has(order.id) // Check if order ID doesn't exist in database
        );

        if (newDispatchOrders.length > 0) {
          newOrders.push(...newDispatchOrders);
          console.log(`Found ${newDispatchOrders.length} new dispatch orders on page ${page}`);
          
          // Show details of found orders
          newDispatchOrders.forEach(order => {
            console.log(`  - Order ${order.id}: ${order.full_name} - ${order.total} DZD`);
          });
        }

        // Save page info for next run
        await this.savePageInfo(page, firstId, lastId);

        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
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
      notes: ecoOrder.confirmation_history && ecoOrder.confirmation_history.length > 0
        ? `Last confirmation: ${ecoOrder.confirmation_history[ecoOrder.confirmation_history.length - 1].state_name}`
        : null,
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