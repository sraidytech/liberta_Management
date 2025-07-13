import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();

export interface MaystroOrder {
  id: string;
  instance_uuid?: string; // This is the actual Maystro order ID
  display_id?: string;
  external_order_id: string;
  status: number;
  ordered_at?: string;
  delivered_at?: string;
  postponed_to?: string;
  created_at?: string;
  last_update?: string;
  alerted_at?: string;
  alert_reason?: string;
  abort_reason?: string;
  customer_name?: string;
  customer_phone?: string;
  destination_text?: string;
  product_name?: string;
  product_price?: number;
  commune?: number;
  wilaya?: string;
  commune_name?: string;
  tracking_number?: string;
  [key: string]: any; // Allow for additional fields from the API
}

export interface MaystroConfig {
  apiKey: string;
  baseUrl: string;
}

export class MaystroService {
  private axiosInstance: any;
  private redis: Redis;
  private config: MaystroConfig;
  private readonly RATE_LIMIT_DELAY = 50; // 50ms between requests for faster processing
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 20; // Use default page size as per API docs (20 orders per page)

  // Status mapping from Maystro API documentation
  private readonly STATUS_MAPPING: { [key: number]: string } = {
    4: "CRÉÉ",
    5: "DEMANDE DE RAMASSAGE",
    6: "EN COURS",
    8: "EN ATTENTE DE TRANSIT",
    9: "EN TRANSIT POUR EXPÉDITION",
    10: "EN TRANSIT POUR RETOUR",
    11: "EN ATTENTE",
    12: "EN RUPTURE DE STOCK",
    15: "PRÊT À EXPÉDIER",
    22: "ASSIGNÉ",
    31: "EXPÉDIÉ",
    32: "ALERTÉ",
    41: "LIVRÉ",
    42: "REPORTÉ",
    50: "ANNULÉ",
    51: "PRÊT À RETOURNER",
    52: "PRIS PAR LE MAGASIN",
    53: "NON REÇU"
  };

  constructor(config: MaystroConfig, redis: Redis) {
    this.config = config;
    this.redis = redis;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Token ${config.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minutes timeout for large fetches
    });

    // Add request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config: any) => {
      const lastRequestKey = `maystro:last_request`;
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
   * Fetch orders from Maystro API with pagination - OPTIMIZED for API docs format
   */
  async fetchOrders(page: number = 1, nextUrl?: string): Promise<{
    orders: MaystroOrder[];
    nextUrl?: string;
    totalCount: number;
    currentPage: number;
  }> {
    try {
      // Use nextUrl if provided, otherwise construct URL with page parameter
      const url = nextUrl || `/api/stores/orders/?page=${page}`;
      
      console.log(`🔄 Fetching Maystro orders from: ${url}`);
      
      const response = await this.axiosInstance.get(url);
      const data = response.data;

      if (!data.list || !Array.isArray(data.list.results)) {
        throw new Error('Invalid response format from Maystro API');
      }

      return {
        orders: data.list.results,
        nextUrl: data.list.next,
        totalCount: data.list.count || 0,
        currentPage: page
      };
    } catch (error: any) {
      console.error('❌ Error fetching Maystro orders:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Fetch all orders with CONCURRENT pagination - SUPER FAST
   */
  async fetchAllOrders(maxOrders: number = 3000): Promise<MaystroOrder[]> {
    const maxPages = Math.ceil(maxOrders / 20); // 20 orders per page
    const concurrency = 10; // Fetch 10 pages concurrently
    
    console.log(`🚀 Starting CONCURRENT fetch of up to ${maxOrders} Maystro orders (${maxPages} pages, ${concurrency} concurrent)...`);

    try {
      const allOrders: MaystroOrder[] = [];
      
      // Process pages in batches of 10 concurrent requests
      for (let batchStart = 1; batchStart <= maxPages; batchStart += concurrency) {
        const batchEnd = Math.min(batchStart + concurrency - 1, maxPages);
        const pagePromises: Promise<any>[] = [];
        
        // Create concurrent requests for this batch
        for (let page = batchStart; page <= batchEnd; page++) {
          pagePromises.push(
            this.fetchOrders(page).catch(error => {
              console.log(`⚠️  Page ${page} failed: ${error.message}`);
              return { orders: [], currentPage: page }; // Return empty on error
            })
          );
        }
        
        // Wait for all pages in this batch
        console.log(`📦 Fetching pages ${batchStart}-${batchEnd} concurrently...`);
        const batchResults = await Promise.all(pagePromises);
        
        // Collect orders from successful pages
        let batchOrderCount = 0;
        batchResults.forEach(result => {
          if (result.orders && result.orders.length > 0) {
            allOrders.push(...result.orders);
            batchOrderCount += result.orders.length;
          }
        });
        
        console.log(`✅ Batch ${Math.ceil(batchStart/concurrency)} complete: ${batchOrderCount} orders (Total: ${allOrders.length})`);
        
        // Break if we have enough orders
        if (allOrders.length >= maxOrders) {
          break;
        }
        
        // Small delay between batches to be nice to the API
        if (batchEnd < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const finalOrders = allOrders.slice(0, maxOrders);
      console.log(`🎉 CONCURRENT fetch complete: ${finalOrders.length} orders in ~${Math.ceil(maxPages/concurrency)} batches`);
      return finalOrders;

    } catch (error: any) {
      console.error('❌ Error in concurrent fetchAllOrders:', error.message);
      throw error;
    }
  }

  /**
   * Debug method to inspect raw API response
   */
  async debugApiResponse(limit: number = 10): Promise<any> {
    try {
      console.log('🔍 DEBUG: Fetching raw API response...');
      
      const response = await this.axiosInstance.get(`/api/stores/orders/?limit=${limit}`);
      const data = response.data;
      
      console.log('📋 DEBUG: Full API Response Structure:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.list && data.list.results && data.list.results.length > 0) {
        console.log('📋 DEBUG: First Order Sample:');
        console.log(JSON.stringify(data.list.results[0], null, 2));
        
        console.log('📋 DEBUG: Status Analysis:');
        data.list.results.forEach((order: any, index: number) => {
          console.log(`Order ${index + 1}:`);
          console.log(`  - external_order_id: ${order.external_order_id}`);
          console.log(`  - status: ${order.status} (${this.mapStatus(order.status)})`);
          console.log(`  - id: ${order.id}`);
          console.log(`  - instance_uuid: ${order.instance_uuid}`);
          console.log(`  - display_id: ${order.display_id}`);
          console.log(`  - tracking_number: ${order.tracking_number}`);
          console.log(`  - alerted_at: ${order.alerted_at}`);
          console.log(`  - alert_reason: ${order.alert_reason}`);
          console.log(`  - abort_reason: ${order.abort_reason}`);
          console.log(`  - created_at: ${order.created_at}`);
          console.log(`  - last_update: ${order.last_update}`);
          console.log(`  - customer_name: ${order.customer_name}`);
          console.log('  ---');
        });
        
        // Check for duplicate values
        const displayIds = data.list.results.map((order: any) => order.display_id);
        const trackingNumbers = data.list.results.map((order: any) => order.tracking_number);
        const ids = data.list.results.map((order: any) => order.id);
        
        console.log('📋 DEBUG: Duplicate Analysis:');
        console.log(`  - Unique display_ids: ${new Set(displayIds).size} out of ${displayIds.length}`);
        console.log(`  - Unique tracking_numbers: ${new Set(trackingNumbers).size} out of ${trackingNumbers.length}`);
        console.log(`  - Unique ids: ${new Set(ids).size} out of ${ids.length}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('❌ DEBUG: Error fetching API response:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get order by external order ID (reference)
   */
  async getOrderByReference(reference: string): Promise<MaystroOrder | null> {
    try {
      const response = await this.axiosInstance.get(`/api/stores/orders/?external_order_id=${reference}`);
      const data = response.data;

      if (data.list && data.list.results && data.list.results.length > 0) {
        return data.list.results[0];
      }

      return null;
    } catch (error: any) {
      console.error(`❌ Error fetching order by reference ${reference}:`, error.message);
      return null;
    }
  }

  /**
   * Get order history/tracking
   */
  async getOrderHistory(orderId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/api/stores/history_order/${orderId}`);
      return response.data || [];
    } catch (error: any) {
      console.error(`❌ Error fetching order history for ${orderId}:`, error.message);
      return [];
    }
  }

  /**
   * Map Maystro status code to readable status
   */
  mapStatus(statusCode: number): string {
    return this.STATUS_MAPPING[statusCode] || `INCONNU (${statusCode})`;
  }

  /**
   * Sync shipping status for orders from ALL STORES - OPTIMIZED APPROACH
   */
  async syncShippingStatus(orderReferences?: string[], storeIdentifier?: string): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    const results = {
      updated: 0,
      errors: 0,
      details: [] as Array<{ reference: string; status: string; error?: string }>
    };

    try {
      // Step 1: Fetch all orders from Maystro API first
      console.log('🔄 Fetching orders from Maystro API for all stores...');
      const maystroOrders = await this.fetchAllOrders(7000); // Fetch 7000 orders from Maystro
      
      // Step 2: Create a Map for fast lookup
      const orderMap = new Map(maystroOrders.map(order => [order.external_order_id, order]));
      console.log(`📦 Created order map with ${orderMap.size} Maystro orders`);

      // Step 3: Get orders from database to sync (ALL STORES)
      let ordersToSync: any[] = [];

      if (orderReferences && orderReferences.length > 0) {
        // Sync specific orders
        ordersToSync = await prisma.order.findMany({
          where: {
            reference: { in: orderReferences },
            ...(storeIdentifier && { storeIdentifier })
          },
          select: {
            id: true,
            reference: true,
            shippingStatus: true,
            maystroOrderId: true,
            storeIdentifier: true
          }
        });
      } else {
        // Sync latest orders from ALL STORES
        const whereClause: any = {};
        if (storeIdentifier) {
          whereClause.storeIdentifier = storeIdentifier;
        }

        ordersToSync = await prisma.order.findMany({
          select: {
            id: true,
            reference: true,
            shippingStatus: true,
            maystroOrderId: true,
            storeIdentifier: true
          },
          where: whereClause,
          orderBy: {
            createdAt: 'desc' // Get newest orders first
          },
          take: 5000 // Limit to latest 5,000 orders
        });
      }

      console.log(`🔄 Syncing shipping status for ${ordersToSync.length} orders from ${storeIdentifier || 'ALL STORES'}...`);

      // Step 4: Process orders in batches (like your script)
      const BATCH_SIZE = 100; // Process 100 orders at a time
      const ordersToUpdate: any[] = [];
      
      for (const order of ordersToSync) {
        try {
          // Fast lookup using Map (like orderMap.get(externalId) in your script)
          const maystroOrder = orderMap.get(order.reference);
          
          if (maystroOrder) {
            const shippingStatus = this.mapStatus(maystroOrder.status);
            
            // Prepare additional metadata
            const additionalMetaData = {
              maystro_id: maystroOrder.id,
              instance_uuid: maystroOrder.instance_uuid,
              display_id: maystroOrder.display_id,
              ordered_at: maystroOrder.ordered_at,
              delivered_at: maystroOrder.delivered_at,
              postponed_to: maystroOrder.postponed_to,
              created_at: maystroOrder.created_at,
              last_update: maystroOrder.last_update,
              customer_name: maystroOrder.customer_name,
              customer_phone: maystroOrder.customer_phone,
              destination_text: maystroOrder.destination_text,
              product_name: maystroOrder.product_name,
              product_price: maystroOrder.product_price,
              commune: maystroOrder.commune,
              wilaya: maystroOrder.wilaya,
              commune_name: maystroOrder.commune_name
            };
            
            // Only update if status has changed
            if (order.shippingStatus !== shippingStatus) {
              ordersToUpdate.push({
                id: order.id,
                reference: order.reference,
                shippingStatus,
                maystroOrderId: maystroOrder.instance_uuid, // Use instance_uuid as the main Maystro order ID
                trackingNumber: maystroOrder.tracking_number || maystroOrder.display_id || maystroOrder.instance_uuid,
                alertedAt: maystroOrder.alerted_at ? new Date(maystroOrder.alerted_at) : null,
                alertReason: maystroOrder.alert_reason,
                abortReason: maystroOrder.abort_reason ? String(maystroOrder.abort_reason) : null,
                additionalMetaData,
                maystroStatusCode: maystroOrder.status
              });
            }

            results.details.push({
              reference: order.reference,
              status: shippingStatus
            });

            console.log(`✅ Found ${order.reference}: ${shippingStatus} (Status: ${maystroOrder.status}, UUID: ${maystroOrder.instance_uuid})`);
          } else {
            results.details.push({
              reference: order.reference,
              status: 'NOT_FOUND',
              error: 'Order not found in Maystro'
            });
            console.log(`⚠️ Order ${order.reference} not found in Maystro`);
          }
        } catch (error: any) {
          results.errors++;
          results.details.push({
            reference: order.reference,
            status: 'ERROR',
            error: error.message
          });
          console.error(`❌ Error processing ${order.reference}:`, error.message);
        }
      }

      // Step 5: Batch update database (much faster than individual updates)
      console.log(`🔄 Updating ${ordersToUpdate.length} orders in database...`);
      
      for (let i = 0; i < ordersToUpdate.length; i += BATCH_SIZE) {
        const batch = ordersToUpdate.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (orderUpdate) => {
          try {
            // Prepare update data
            const updateData: any = {
              shippingStatus: orderUpdate.shippingStatus,
              maystroOrderId: orderUpdate.maystroOrderId,
              trackingNumber: orderUpdate.trackingNumber,
              alertedAt: orderUpdate.alertedAt,
              alertReason: orderUpdate.alertReason,
              abortReason: orderUpdate.abortReason ? String(orderUpdate.abortReason) : null,
              additionalMetaData: orderUpdate.additionalMetaData,
              updatedAt: new Date()
            };

            // 🎯 AUTO-UPDATE: If shipping status is "LIVRÉ", automatically set order status to "DELIVERED"
            if (orderUpdate.shippingStatus === 'LIVRÉ') {
              updateData.status = 'DELIVERED';
              console.log(`🚚 Auto-updating order ${orderUpdate.reference} status to DELIVERED (shipping status: LIVRÉ)`);
            }

            await prisma.order.update({
              where: { id: orderUpdate.id },
              data: updateData
            });

            results.updated++;
            console.log(`✅ Updated ${orderUpdate.reference}: ${orderUpdate.shippingStatus} (Code: ${orderUpdate.maystroStatusCode})`);
          } catch (error: any) {
            results.errors++;
            console.error(`❌ Error updating ${orderUpdate.reference}:`, error.message);
          }
        }));

        // Small delay between batches
        if (i + BATCH_SIZE < ordersToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Shipping status sync completed: ${results.updated} updated, ${results.errors} errors`);
      console.log(`📊 Status distribution:`);
      
      // Log status distribution for debugging
      const statusCounts = new Map<string, number>();
      results.details.forEach(detail => {
        const count = statusCounts.get(detail.status) || 0;
        statusCounts.set(detail.status, count + 1);
      });
      
      statusCounts.forEach((count, status) => {
        console.log(`   ${status}: ${count} orders`);
      });

      return results;

    } catch (error: any) {
      console.error('❌ Error in syncShippingStatus:', error.message);
      throw error;
    }
  }

  /**
   * Sync orders from Maystro to database - SUPER FAST with concurrent fetching
   */
  async syncOrders(): Promise<{ success: boolean; message: string; stats?: any }> {
    const startTime = Date.now();
    console.log('🚀 Starting SUPER FAST Maystro order sync...');

    try {
      // Step 1: Fetch orders from Maystro API (CONCURRENT - much faster!)
      console.log('📡 Fetching orders from Maystro API with concurrent requests...');
      const maystroOrders = await this.fetchAllOrders(3000); // Reduced to 3000 for speed
      
      if (maystroOrders.length === 0) {
        return {
          success: true,
          message: 'No orders found in Maystro API',
          stats: { processed: 0, created: 0, updated: 0, duration: Date.now() - startTime }
        };
      }

      console.log(`📦 Retrieved ${maystroOrders.length} orders from Maystro in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

      // Step 2: Get existing orders from database (optimized query)
      console.log('🔍 Checking existing orders in database...');
      const dbStartTime = Date.now();
      
      // Only get orders from last 30 days to speed up query
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const existingOrders = await prisma.order.findMany({
        select: {
          maystroOrderId: true,
          id: true
        },
        where: {
          maystroOrderId: { not: null },
          createdAt: { gte: thirtyDaysAgo } // Only recent orders
        }
      });

      // Create a Map for O(1) lookup performance
      const existingOrderMap = new Map(
        existingOrders.map((order: any) => [order.maystroOrderId, order.id])
      );

      console.log(`💾 Found ${existingOrders.length} existing recent Maystro orders in ${((Date.now() - dbStartTime) / 1000).toFixed(1)}s`);

      // Step 3: Process orders efficiently
      const ordersToCreate: any[] = [];
      const ordersToUpdate: any[] = [];

      for (const maystroOrder of maystroOrders) {
        const existingOrderId = existingOrderMap.get(maystroOrder.instance_uuid || maystroOrder.id);
        
        if (existingOrderId) {
          // Update existing order - only update Maystro-specific fields
          ordersToUpdate.push({
            id: existingOrderId,
            maystroOrderId: maystroOrder.instance_uuid || maystroOrder.id,
            shippingStatus: this.mapStatus(maystroOrder.status),
            trackingNumber: maystroOrder.tracking_number || maystroOrder.display_id,
            alertedAt: maystroOrder.alerted_at ? new Date(maystroOrder.alerted_at) : null,
            alertReason: maystroOrder.alert_reason,
            abortReason: maystroOrder.abort_reason ? String(maystroOrder.abort_reason) : null,
            additionalMetaData: {
              maystro_id: maystroOrder.id,
              instance_uuid: maystroOrder.instance_uuid,
              display_id: maystroOrder.display_id,
              customer_name: maystroOrder.customer_name,
              customer_phone: maystroOrder.customer_phone,
              destination_text: maystroOrder.destination_text,
              product_name: maystroOrder.product_name,
              product_price: maystroOrder.product_price,
              commune: maystroOrder.commune,
              wilaya: maystroOrder.wilaya,
              commune_name: maystroOrder.commune_name
            },
            updatedAt: new Date()
          });
        } else {
          // Skip creating new orders - we only sync existing ones for Maystro
          console.log(`⚠️ Skipping new order creation for ${maystroOrder.external_order_id} - order must exist first`);
        }
      }

      // Step 4: Update existing orders ONLY (SUPER FAST)
      let updatedCount = 0;
      const saveStartTime = Date.now();

      if (ordersToUpdate.length > 0) {
        console.log(`🔄 Updating ${ordersToUpdate.length} existing orders with status, alerts, and tracking...`);
        
        // Process updates concurrently in batches of 50 for optimal performance
        const batchSize = 50;
        const updatePromises: Promise<any>[] = [];
        
        for (let i = 0; i < ordersToUpdate.length; i += batchSize) {
          const batch = ordersToUpdate.slice(i, i + batchSize);
          
          const batchPromises = batch.map(orderUpdate =>
            prisma.order.update({
              where: { id: orderUpdate.id },
              data: {
                shippingStatus: orderUpdate.shippingStatus,
                trackingNumber: orderUpdate.trackingNumber,
                alertedAt: orderUpdate.alertedAt,
                alertReason: orderUpdate.alertReason,
                abortReason: orderUpdate.abortReason ? String(orderUpdate.abortReason) : null,
                additionalMetaData: orderUpdate.additionalMetaData,
                updatedAt: orderUpdate.updatedAt
              }
            }).then(() => {
              updatedCount++;
            }).catch(error => {
              console.error(`❌ Error updating order ${orderUpdate.id}:`, error.message);
            })
          );
          
          updatePromises.push(...batchPromises);
        }
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        console.log(`💾 Database updates completed in ${((Date.now() - saveStartTime) / 1000).toFixed(1)}s`);
      } else {
        console.log(`ℹ️ No orders to update`);
      }

      const duration = Date.now() - startTime;
      const stats = {
        processed: maystroOrders.length,
        updated: updatedCount,
        duration: duration
      };

      console.log(`🎉 SUPER FAST Maystro sync completed in ${(duration / 1000).toFixed(1)}s`);
      console.log(`📊 Stats: ${stats.processed} processed, ${stats.updated} updated`);

      return {
        success: true,
        message: `Successfully synced ${stats.processed} Maystro orders (${stats.updated} updated) in ${(duration / 1000).toFixed(1)}s`,
        stats
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Maystro sync failed:', error.message);
      console.error(`⏱️  Failed after ${(duration / 1000).toFixed(1)}s`);
      
      return {
        success: false,
        message: `Maystro sync failed: ${error.message}`,
        stats: { duration }
      };
    }
  }

  /**
   * Test Maystro API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    sampleOrders?: MaystroOrder[];
    statusCodes?: { [key: number]: number };
  }> {
    try {
      console.log('🧪 Testing Maystro API connection...');
      
      const result = await this.fetchOrders(100); // Get more orders to see status variety
      
      // Count status codes
      const statusCodes: { [key: number]: number } = {};
      result.orders.forEach(order => {
        statusCodes[order.status] = (statusCodes[order.status] || 0) + 1;
      });

      console.log('📊 Status codes found in Maystro orders:', statusCodes);
      
      return {
        success: true,
        message: `Successfully connected to Maystro API. Found ${result.totalCount} total orders.`,
        sampleOrders: result.orders.slice(0, 5),
        statusCodes
      };
    } catch (error: any) {
      console.error('❌ Maystro API test failed:', error.message);
      return {
        success: false,
        message: `Failed to connect to Maystro API: ${error.message}`
      };
    }
  }

  /**
   * Process webhook data from Maystro
   */
  async processWebhook(webhookData: any): Promise<{
    success: boolean;
    message: string;
    orderId?: string;
  }> {
    try {
      console.log('🔔 Processing Maystro webhook:', webhookData);

      const { event, payload } = webhookData;

      if (event === 'OrderStatusChanged' && payload) {
        const { external_order_id, status, display_id_order } = payload;

        if (external_order_id) {
          // Find order by reference
          const order = await prisma.order.findUnique({
            where: { reference: external_order_id }
          });

          if (order) {
            const shippingStatus = this.mapStatus(status);
            
            // Prepare update data
            const updateData: any = {
              shippingStatus,
              trackingNumber: display_id_order,
              updatedAt: new Date()
            };

            // 🎯 AUTO-UPDATE: If shipping status is "LIVRÉ", automatically set order status to "DELIVERED"
            if (shippingStatus === 'LIVRÉ') {
              updateData.status = 'DELIVERED';
              console.log(`🚚 Auto-updating order ${external_order_id} status to DELIVERED (shipping status: LIVRÉ) via webhook`);
            }
            
            await prisma.order.update({
              where: { id: order.id },
              data: updateData
            });

            // Create webhook event record
            await prisma.webhookEvent.create({
              data: {
                orderId: order.id,
                source: 'MAYSTRO',
                eventType: event,
                payload: webhookData,
                processed: true
              }
            });

            console.log(`✅ Updated order ${external_order_id} shipping status to: ${shippingStatus}`);

            return {
              success: true,
              message: `Order ${external_order_id} shipping status updated to ${shippingStatus}`,
              orderId: order.id
            };
          } else {
            console.log(`⚠️ Order not found for reference: ${external_order_id}`);
            return {
              success: false,
              message: `Order not found for reference: ${external_order_id}`
            };
          }
        }
      }

      return {
        success: false,
        message: 'Webhook event not processed - unsupported event type or missing data'
      };

    } catch (error: any) {
      console.error('❌ Error processing Maystro webhook:', error.message);
      
      // Create failed webhook event record
      await prisma.webhookEvent.create({
        data: {
          source: 'MAYSTRO',
          eventType: webhookData.event || 'unknown',
          payload: webhookData,
          processed: false,
          error: error.message
        }
      });

      return {
        success: false,
        message: `Error processing webhook: ${error.message}`
      };
    }
  }

  /**
   * Get available webhook types from Maystro
   */
  async getWebhookTypes(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/api/stores/hooks/types/');
      return response.data.results || [];
    } catch (error: any) {
      console.error('❌ Error fetching webhook types:', error.message);
      throw error;
    }
  }

  /**
   * Get configured webhooks
   */
  async getWebhooks(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/api/stores/hooks/costume/');
      return response.data.results || [];
    } catch (error: any) {
      console.error('❌ Error fetching webhooks:', error.message);
      throw error;
    }
  }

  /**
   * Create a webhook
   */
  async createWebhook(endpoint: string, triggerTypeId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/api/stores/hooks/costume/', {
        endpoint,
        trigger_type_id: triggerTypeId
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating webhook:', error.message);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      await this.axiosInstance.delete(`/api/stores/hooks/costume/${webhookId}/`);
      return true;
    } catch (error: any) {
      console.error('❌ Error deleting webhook:', error.message);
      return false;
    }
  }

  /**
   * Send test webhook
   */
  async sendTestWebhook(): Promise<boolean> {
    try {
      await this.axiosInstance.post('/api/stores/hooks/test/request/');
      return true;
    } catch (error: any) {
      console.error('❌ Error sending test webhook:', error.message);
      return false;
    }
  }
}

// Export singleton instance
let maystroService: MaystroService | null = null;

export const getMaystroService = (redis: Redis): MaystroService => {
  if (!maystroService) {
    const config: MaystroConfig = {
      apiKey: process.env.MAYSTRO_API_KEY || '',
      baseUrl: 'https://backend.maystro-delivery.com'
    };

    if (!config.apiKey) {
      throw new Error('MAYSTRO_API_KEY environment variable is required');
    }

    maystroService = new MaystroService(config, redis);
  }

  return maystroService;
};