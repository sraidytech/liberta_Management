import { WebhookManagerService } from '../services/webhook-manager.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function registerWebhooks() {
  console.log('🚀 Starting webhook registration process...\n');
  
  try {
    // Get the base URL from environment or use default
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-domain.com';
    
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Webhook endpoint: ${baseUrl}/api/webhooks/ecomanager\n`);
    
    if (baseUrl === 'https://your-domain.com') {
      console.warn('⚠️  WARNING: Using default base URL. Set WEBHOOK_BASE_URL environment variable for production.\n');
    }
    
    const webhookManager = new WebhookManagerService();
    
    // Register webhooks for all active stores
    await webhookManager.registerAllStoreWebhooks(baseUrl);
    
    // Display webhook status
    console.log('\n📊 Webhook Status:');
    console.log('='.repeat(80));
    
    const status = await webhookManager.getWebhookStatus();
    
    if (status.length === 0) {
      console.log('No webhooks registered yet.');
    } else {
      status.forEach(config => {
        console.log(`\n🏪 ${config.storeName} (${config.storeIdentifier})`);
        console.log(`   Webhook ID: ${config.webhookId}`);
        console.log(`   Status: ${config.isActive ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   Events: ${config.events.join(', ')}`);
        console.log(`   Last Triggered: ${config.lastTriggered || 'Never'}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Webhook registration process completed!\n');
    
  } catch (error) {
    console.error('❌ Error during webhook registration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
registerWebhooks();