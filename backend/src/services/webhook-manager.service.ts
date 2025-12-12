import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';

export class WebhookManagerService {
  private readonly WEBHOOK_EVENTS = [
    'OrderCreated',
    'OrderConfirmationStatusChanged'
  ];
  
  /**
   * Register webhooks for all active stores
   */
  async registerAllStoreWebhooks(baseUrl: string): Promise<void> {
    console.log('🔗 Registering webhooks for all active stores...\n');
    
    const stores = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${stores.length} active stores`);
    
    for (const store of stores) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        await this.registerStoreWebhook(store, baseUrl);
        console.log(`${'='.repeat(60)}`);
      } catch (error) {
        console.error(`❌ Failed to register webhook for ${store.storeIdentifier}:`, error);
      }
    }
    
    console.log('\n✅ Webhook registration completed');
  }
  
  /**
   * Register webhook for a single store
   */
  async registerStoreWebhook(store: any, baseUrl: string): Promise<void> {
    console.log(`📝 Registering webhooks for ${store.storeName} (${store.storeIdentifier})`);
    
    // Generate unique secret for this store
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    
    // Webhook delivery URL
    const deliveryUrl = `${baseUrl}/api/webhooks/ecomanager`;
    
    console.log(`   Delivery URL: ${deliveryUrl}`);
    
    // Check if webhook already exists
    const existingConfig = await prisma.webhookConfiguration.findUnique({
      where: { storeIdentifier: store.storeIdentifier }
    });
    
    if (existingConfig?.ecoManagerWebhookId) {
      console.log(`   ⚠️ Webhook already registered (ID: ${existingConfig.ecoManagerWebhookId})`);
      return;
    }
    
    // Register webhooks with EcoManager for each event
    const webhookIds: number[] = [];
    
    for (const event of this.WEBHOOK_EVENTS) {
      try {
        console.log(`   📡 Registering ${event}...`);
        
        const response = await axios.post(
          `${store.baseUrl}/webhooks`,
          {
            name: `LibertaPhonix ${event} - ${store.storeIdentifier}`,
            event,
            http_method: 'post',
            delivery_url: deliveryUrl,
            secret: webhookSecret,
            is_active: true
          },
          {
            headers: {
              'Authorization': `Bearer ${store.apiToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 30000
          }
        );
        
        const webhookId = (response.data as any).id;
        webhookIds.push(webhookId);
        
        console.log(`   ✅ ${event} registered (ID: ${webhookId})`);
        
        // Small delay between registrations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Failed to register ${event}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    }
    
    // Store webhook configuration (use first webhook ID as primary)
    await prisma.webhookConfiguration.upsert({
      where: { storeIdentifier: store.storeIdentifier },
      create: {
        storeIdentifier: store.storeIdentifier,
        storeName: store.storeName,
        ecoManagerWebhookId: webhookIds[0],
        webhookSecret,
        deliveryUrl,
        events: this.WEBHOOK_EVENTS,
        isActive: true
      },
      update: {
        ecoManagerWebhookId: webhookIds[0],
        webhookSecret,
        deliveryUrl,
        events: this.WEBHOOK_EVENTS,
        isActive: true
      }
    });
    
    console.log(`   💾 Configuration saved to database`);
  }
  
  /**
   * Unregister webhook for a store
   */
  async unregisterStoreWebhook(storeIdentifier: string): Promise<void> {
    console.log(`🗑️ Unregistering webhook for ${storeIdentifier}...`);
    
    const config = await prisma.webhookConfiguration.findUnique({
      where: { storeIdentifier }
    });
    
    if (!config) {
      console.log(`⚠️ No webhook configuration found for ${storeIdentifier}`);
      return;
    }
    
    const store = await prisma.apiConfiguration.findUnique({
      where: { storeIdentifier }
    });
    
    if (!store) {
      throw new Error(`Store not found: ${storeIdentifier}`);
    }
    
    // Delete webhook from EcoManager
    try {
      await axios.delete(
        `${store.baseUrl}/webhooks/${config.ecoManagerWebhookId}`,
        {
          headers: {
            'Authorization': `Bearer ${store.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`✅ Webhook deleted from EcoManager`);
    } catch (error) {
      console.error(`❌ Failed to delete webhook from EcoManager:`, error);
    }
    
    // Delete local configuration
    await prisma.webhookConfiguration.delete({
      where: { id: config.id }
    });
    
    console.log(`✅ Configuration removed from database`);
  }
  
  /**
   * Get webhook status for all stores
   */
  async getWebhookStatus(): Promise<any[]> {
    const configs = await prisma.webhookConfiguration.findMany({
      orderBy: { storeIdentifier: 'asc' }
    });
    
    return configs.map(config => ({
      storeIdentifier: config.storeIdentifier,
      storeName: config.storeName,
      webhookId: config.ecoManagerWebhookId,
      isActive: config.isActive,
      lastTriggered: config.lastTriggered,
      events: config.events
    }));
  }
}