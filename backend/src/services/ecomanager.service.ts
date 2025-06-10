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
   * Fetch new orders since last sync
   */
  async fetchNewOrders(lastOrderId: number): Promise<EcoManagerOrder[]> {
    const newOrders: EcoManagerOrder[] = [];
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 5; // Increased to be more thorough
    let foundNewOrders = false;

    console.log(`Fetching new "En dispatch" orders for ${this.config.storeName} since ID ${lastOrderId}...`);

    while (consecutiveEmptyPages < maxEmptyPages && page <= 20) { // Reduced pages but more thorough
      try {
        const orders = await this.fetchOrdersPage(page, this.BATCH_SIZE);

        if (!orders || orders.length === 0) {
          consecutiveEmptyPages++;
          page++;
          continue;
        }

        // Filter for "En dispatch" status first
        const dispatchOrders = orders.filter(order => order.order_state_name === 'En dispatch');
        
        // Then filter for orders newer than lastOrderId
        const filteredOrders = dispatchOrders.filter(order => order.id > lastOrderId);
        
        if (filteredOrders.length > 0) {
          newOrders.push(...filteredOrders);
          consecutiveEmptyPages = 0;
          foundNewOrders = true;
          console.log(`Found ${filteredOrders.length} new "En dispatch" orders on page ${page} for ${this.config.storeName}`);
        } else {
          // Check if we have any "En dispatch" orders on this page
          if (dispatchOrders.length > 0) {
            console.log(`Found ${dispatchOrders.length} "En dispatch" orders on page ${page}, but all are older than ${lastOrderId}`);
          }
          consecutiveEmptyPages++;
        }

        // If we found new orders but this page has none, continue a bit more
        if (foundNewOrders && filteredOrders.length === 0) {
          consecutiveEmptyPages = Math.min(consecutiveEmptyPages, 2);
        }

        page++;
      } catch (error) {
        console.error(`Error fetching new orders page ${page} for ${this.config.storeName}:`, error);
        // Don't throw error, just stop fetching more pages
        console.log(`Stopping sync at page ${page} due to error. Will process ${newOrders.length} orders found so far.`);
        break;
      }
    }

    if (page > 20) {
      console.log(`Reached maximum page limit (20). Will process ${newOrders.length} orders found so far.`);
    }

    console.log(`Found ${newOrders.length} new "En dispatch" orders for ${this.config.storeName}`);
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