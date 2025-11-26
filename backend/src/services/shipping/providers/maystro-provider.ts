/**
 * Maystro Shipping Provider
 * 
 * Adapter that wraps the existing MaystroService to implement IShippingProvider interface.
 * This maintains backward compatibility while enabling the multi-shipping architecture.
 */

import { Redis } from 'ioredis';
import { IShippingProvider } from '../shipping-provider.interface';
import { MaystroService, MaystroOrder } from '../../maystro.service';

export class MaystroProvider implements IShippingProvider {
  private maystroService: MaystroService;

  constructor(
    credentials: Record<string, any>,
    redis: Redis,
    baseUrl?: string
  ) {
    // Create MaystroService instance with the provided credentials
    const config = {
      id: credentials.id || 'maystro-account',
      name: credentials.name || 'Maystro Account',
      apiKey: credentials.apiKey,
      baseUrl: baseUrl || credentials.baseUrl || 'https://backend.maystro-delivery.com',
      isPrimary: credentials.isPrimary !== undefined ? credentials.isPrimary : true
    };

    this.maystroService = new MaystroService(config, redis);

    // 🔔 AUTO-SETUP WEBHOOK: Automatically configure webhook for real-time order status updates
    this.autoSetupWebhook().catch(error => {
      console.error(`⚠️  Failed to auto-setup webhook for ${config.name}:`, error.message);
      // Don't throw error - webhook setup failure shouldn't prevent provider initialization
    });
  }

  /**
   * Automatically setup webhook during provider initialization
   * This runs asynchronously and doesn't block provider creation
   */
  private async autoSetupWebhook(): Promise<void> {
    try {
      // Get webhook URL from environment or use default
      const webhookUrl = process.env.WEBHOOK_BASE_URL
        ? `${process.env.WEBHOOK_BASE_URL}/api/webhooks/maystro`
        : 'https://app.libertadz.shop/api/webhooks/maystro';

      console.log(`🔄 Auto-setting up webhook for Maystro provider...`);
      const result = await this.setupWebhook(webhookUrl);

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.warn(`⚠️  Webhook setup warning: ${result.message}`);
      }
    } catch (error: any) {
      console.error(`❌ Auto-setup webhook error:`, error.message);
      // Silently fail - webhook is optional, provider should still work
    }
  }

  async createOrder(orderData: any): Promise<any> {
    // Maystro order creation would be implemented here
    // For now, this is a placeholder as the existing service doesn't have this method
    throw new Error('createOrder not yet implemented for Maystro');
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    // Maystro order status update would be implemented here
    throw new Error('updateOrderStatus not yet implemented for Maystro');
  }

  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const order = await this.maystroService.getOrderByReference(orderId);
      return order;
    } catch (error: any) {
      console.error('❌ Maystro getOrderStatus error:', error.message);
      throw error;
    }
  }

  async getOrderByReference(reference: string): Promise<any> {
    return await this.maystroService.getOrderByReference(reference);
  }

  /**
   * Sync order statuses - This calls the full sync that includes tracking number fetch
   * @param orderIds - Array of order references to sync
   * @returns Sync results with updated count
   */
  async syncOrderStatuses(orderIds: string[]): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    return await this.maystroService.syncShippingStatus(orderIds);
  }

  /**
   * Fetch and update tracking numbers from Maystro API
   * 🔒 FIXED: Now properly filters orders by shippingAccountId to prevent data corruption
   * @param storeIdentifier - Optional store identifier to filter orders
   * @param maxOrders - Maximum number of orders to sync (default: 10000)
   * @param shippingAccountId - The shipping account ID to filter orders (CRITICAL for preventing cross-contamination)
   * @returns Sync results
   */
  async syncTrackingNumbers(storeIdentifier?: string, maxOrders: number = 10000, shippingAccountId?: string): Promise<{
    updated: number;
    errors: number;
    details: Array<{ reference: string; status: string; error?: string }>;
  }> {
    console.log(`🔄 [MaystroProvider] Starting tracking number sync for ${storeIdentifier || 'ALL STORES'}...`);
    
    // 🔒 CRITICAL FIX: shippingAccountId MUST be provided - it's the database ID, not API config ID!
    if (!shippingAccountId) {
      console.error(`❌ [MaystroProvider] shippingAccountId is REQUIRED - ABORTING to prevent data corruption!`);
      console.error(`   This must be the database shipping account ID (e.g., cmiaexiem001tsd1h7dbcgv3p)`);
      console.error(`   NOT the Maystro API config ID!`);
      return {
        updated: 0,
        errors: 1,
        details: [{ reference: 'N/A', status: 'ERROR', error: 'Missing shippingAccountId parameter - sync aborted for safety' }]
      };
    }
    
    console.log(`🔒 [MaystroProvider] Filtering orders for shipping account: ${shippingAccountId}`);
    
    // Call the full sync method with shippingAccountId filter to prevent cross-contamination
    const result = await this.maystroService.syncShippingStatus(undefined, storeIdentifier, shippingAccountId);
    
    console.log(`✅ [MaystroProvider] Tracking number sync complete: ${result.updated} updated, ${result.errors} errors`);
    return result;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by fetching a single order
      const result = await this.maystroService.fetchOrders(1);
      return result.orders !== undefined;
    } catch (error: any) {
      console.error('❌ Maystro connection test failed:', error.message);
      return false;
    }
  }

  async getOrderHistory(orderId: string): Promise<any[]> {
    return await this.maystroService.getOrderHistory(orderId);
  }

  mapStatus(statusCode: number | string): string {
    const code = typeof statusCode === 'string' ? parseInt(statusCode) : statusCode;
    return this.maystroService.mapStatus(code);
  }

  /**
   * Get the underlying MaystroService instance for advanced operations
   */
  getService(): MaystroService {
    return this.maystroService;
  }

  // ============================================
  // WEBHOOK MANAGEMENT METHODS
  // ============================================

  /**
   * Get available webhook types from Maystro API
   * @returns Array of webhook trigger types
   */
  async getWebhookTypes(): Promise<any[]> {
    return await this.maystroService.getWebhookTypes();
  }

  /**
   * Get all configured webhooks for this Maystro account
   * @returns Array of configured webhooks
   */
  async getWebhooks(): Promise<any[]> {
    return await this.maystroService.getWebhooks();
  }

  /**
   * Create a new webhook for order status updates
   * @param endpoint - The webhook endpoint URL (e.g., https://app.libertadz.shop/api/webhooks/maystro)
   * @param triggerTypeId - The trigger type ID (use getWebhookTypes() to find the correct ID)
   * @returns Created webhook configuration
   */
  async createWebhook(endpoint: string, triggerTypeId: string): Promise<any> {
    return await this.maystroService.createWebhook(endpoint, triggerTypeId);
  }

  /**
   * Delete a webhook by ID
   * @param webhookId - The webhook ID to delete
   * @returns True if deleted successfully
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    return await this.maystroService.deleteWebhook(webhookId);
  }

  /**
   * Send a test webhook to verify endpoint is working
   * @returns True if test webhook sent successfully
   */
  async sendTestWebhook(): Promise<boolean> {
    return await this.maystroService.sendTestWebhook();
  }

  /**
   * Setup webhook automatically for OrderStatusChanged events
   * This is called during provider initialization
   * @param webhookUrl - The webhook endpoint URL
   * @returns Setup result with webhook configuration
   */
  async setupWebhook(webhookUrl: string): Promise<{
    success: boolean;
    message: string;
    webhook?: any;
  }> {
    try {
      console.log(`🔔 Setting up Maystro webhook for ${webhookUrl}...`);

      // Step 1: Get available webhook types
      const webhookTypes = await this.getWebhookTypes();
      console.log(`📋 Available webhook types:`, webhookTypes.map(t => t.name));

      // Step 2: Find "OrderStatusChanged" or "all" trigger type
      let triggerType = webhookTypes.find(t =>
        t.name.toLowerCase() === 'orderstatuschanged' ||
        t.name.toLowerCase() === 'order_status_changed'
      );

      // Fallback to "all" if OrderStatusChanged not found
      if (!triggerType) {
        triggerType = webhookTypes.find(t => t.name.toLowerCase() === 'all');
      }

      if (!triggerType) {
        return {
          success: false,
          message: 'No suitable webhook trigger type found (OrderStatusChanged or all)'
        };
      }

      console.log(`✅ Using trigger type: ${triggerType.name} (${triggerType.id})`);

      // Step 3: Check if webhook already exists for this endpoint
      const existingWebhooks = await this.getWebhooks();
      const existingWebhook = existingWebhooks.find(w =>
        w.endpoint === webhookUrl &&
        w.triggers.some((t: any) => t.id === triggerType.id)
      );

      if (existingWebhook) {
        console.log(`ℹ️  Webhook already exists for ${webhookUrl}`);
        return {
          success: true,
          message: 'Webhook already configured',
          webhook: existingWebhook
        };
      }

      // Step 4: Create new webhook
      const newWebhook = await this.createWebhook(webhookUrl, triggerType.id);
      console.log(`✅ Webhook created successfully:`, newWebhook);

      return {
        success: true,
        message: 'Webhook created successfully',
        webhook: newWebhook
      };

    } catch (error: any) {
      console.error(`❌ Error setting up webhook:`, error.message);
      return {
        success: false,
        message: `Failed to setup webhook: ${error.message}`
      };
    }
  }
}