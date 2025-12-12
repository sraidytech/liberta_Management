import { PrismaClient } from '@prisma/client';
import { WebhookManagerService } from '../services/webhook-manager.service';

const prisma = new PrismaClient();

async function testWebhookRegistration() {
  console.log('🧪 Testing Webhook Registration (LOCAL)\n');
  console.log('='.repeat(80));

  try {
    // Get all active store configurations
    const storeConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (storeConfigs.length === 0) {
      console.log('❌ No active store configurations found');
      return;
    }

    console.log(`✅ Found ${storeConfigs.length} active store(s)\n`);

    // Use localhost for local testing
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';
    console.log(`🌐 Webhook Base URL: ${webhookBaseUrl}`);
    console.log(`📍 Webhook Endpoint: ${webhookBaseUrl}/api/webhooks/ecomanager\n`);
    console.log('-'.repeat(80));

    const webhookManager = new WebhookManagerService();

    // Test registration for each store
    for (let i = 0; i < storeConfigs.length; i++) {
      const store = storeConfigs[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏪 [Store ${i + 1}/${storeConfigs.length}] ${store.storeName} (${store.storeIdentifier})`);
      console.log(`${'='.repeat(80)}`);

      try {
        // Check if webhook already exists
        const existingWebhook = await prisma.webhookConfiguration.findUnique({
          where: { storeIdentifier: store.storeIdentifier }
        });

        if (existingWebhook) {
          console.log(`\n   ℹ️  Webhook already registered:`);
          console.log(`      - Webhook ID: ${existingWebhook.ecoManagerWebhookId}`);
          console.log(`      - Events: ${existingWebhook.events.join(', ')}`);
          console.log(`      - Active: ${existingWebhook.isActive ? '✅ Yes' : '❌ No'}`);
          console.log(`      - Created: ${existingWebhook.createdAt.toISOString()}`);
          console.log(`\n   ⚠️  Skipping registration (already exists)`);
          continue;
        }

        console.log(`\n   📝 Registering webhook...`);
        console.log(`      - Store: ${store.storeIdentifier}`);
        console.log(`      - API Token: ${store.apiToken.substring(0, 20)}...`);
        console.log(`      - Events: OrderCreated, OrderConfirmationStatusChanged`);

        // Register webhook
        await webhookManager.registerStoreWebhook(store, webhookBaseUrl);

        // Fetch the created webhook config
        const newWebhook = await prisma.webhookConfiguration.findUnique({
          where: { storeIdentifier: store.storeIdentifier }
        });

        if (newWebhook) {
          console.log(`\n   ✅ Webhook registered successfully!`);
          console.log(`      - Webhook ID: ${newWebhook.ecoManagerWebhookId}`);
          console.log(`      - Secret: ${newWebhook.webhookSecret.substring(0, 16)}...`);
          console.log(`      - Delivery URL: ${newWebhook.deliveryUrl}`);
          console.log(`      - Events: ${newWebhook.events.join(', ')}`);
        }

      } catch (error) {
        console.error(`\n   ❌ Error processing store:`, error instanceof Error ? error.message : error);
      }

      // Delay between stores to avoid rate limiting
      if (i < storeConfigs.length - 1) {
        console.log(`\n   ⏳ Waiting 2 seconds before next store...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Display summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Registration Summary\n');

    const webhooks = await prisma.webhookConfiguration.findMany({
      orderBy: { storeIdentifier: 'asc' }
    });

    console.log(`Total Webhooks Registered: ${webhooks.length}\n`);

    webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. ${webhook.storeName} (${webhook.storeIdentifier})`);
      console.log(`   - Webhook ID: ${webhook.ecoManagerWebhookId}`);
      console.log(`   - Events: ${webhook.events.join(', ')}`);
      console.log(`   - Active: ${webhook.isActive ? '✅' : '❌'}`);
      console.log(`   - Delivery URL: ${webhook.deliveryUrl}`);
      console.log(`   - Created: ${webhook.createdAt.toISOString()}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ Webhook registration test completed!\n');

    // Important notes for local testing
    console.log('📝 IMPORTANT NOTES FOR LOCAL TESTING:\n');
    console.log('1. For local testing, you need to expose your local server to the internet');
    console.log('   using a tool like ngrok or localtunnel.\n');
    console.log('2. Example with ngrok:');
    console.log('   $ ngrok http 3001');
    console.log('   Then use the ngrok URL as WEBHOOK_BASE_URL\n');
    console.log('3. To register webhooks with ngrok:');
    console.log('   $ export WEBHOOK_BASE_URL="https://your-ngrok-url.ngrok.io"');
    console.log('   $ npx ts-node src/scripts/register-webhooks.ts\n');
    console.log('4. EcoManager will send a GET request to validate the webhook URL');
    console.log('   Make sure your backend is running and accessible!\n');
    console.log('5. To test webhook reception:');
    console.log('   - Create a test order in EcoManager');
    console.log('   - Check backend logs for webhook reception');
    console.log('   - Verify data in OrderConfirmation table\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      console.error('Response status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testWebhookRegistration();