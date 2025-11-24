# 🔔 Maystro Webhook Auto-Update Setup Guide

## ✅ Implementation Complete

The webhook auto-update system for Maystro shipping status has been successfully implemented!

---

## 🎯 What Was Implemented

### 1. **MaystroProvider Webhook Methods** (`backend/src/services/shipping/providers/maystro-provider.ts`)
- ✅ `getWebhookTypes()` - List available webhook event types
- ✅ `getWebhooks()` - Get all configured webhooks
- ✅ `createWebhook(endpoint, triggerTypeId)` - Create new webhook
- ✅ `deleteWebhook(webhookId)` - Delete webhook
- ✅ `sendTestWebhook()` - Test webhook endpoint
- ✅ `setupWebhook(webhookUrl)` - Auto-setup webhook with smart detection
- ✅ **Auto-setup in constructor** - Automatically creates webhook when provider initializes

### 2. **Enhanced Webhook Processing** (`backend/src/services/maystro.service.ts`)
- ✅ **Smart Order Identification**: Finds orders using 3 methods (priority order):
  1. `trackingNumber` (display_id_order) - Most reliable
  2. `maystroOrderId` (id/instance_uuid) - Maystro's internal UUID
  3. `reference` (external_order_id) - Fallback
- ✅ **Only updates already synced orders** - Ignores webhooks for orders not yet in database
- ✅ **Auto-delivery detection** - When status = "LIVRÉ" (41), automatically sets order status to "DELIVERED"
- ✅ **Webhook event logging** - All webhooks stored in database for audit trail

### 3. **Webhook Endpoint** (`backend/src/modules/webhooks/webhooks.routes.ts`)
- ✅ Already exists at `/api/webhooks/maystro`
- ✅ Handles base64-encoded JSON data (decoded twice as per Maystro docs)
- ✅ Public endpoint (no auth required for incoming webhooks)

---

## 🔄 How It Works

### **Automatic Webhook Setup Flow:**

```
1. App Starts / MaystroProvider Created
   ↓
2. Auto-setup webhook runs in background
   ↓
3. Checks if webhook already exists for:
   - Endpoint: https://app.libertadz.shop/api/webhooks/maystro
   - Trigger: "all" (includes OrderStatusChanged)
   ↓
4. If NOT exists → Creates webhook automatically
   If EXISTS → Skips creation
   ↓
5. Provider ready to receive real-time updates
```

### **Real-time Order Update Flow:**

```
MAYSTRO SYSTEM
  ↓ Order status changes (e.g., LIVRÉ, EN TRANSIT)
  ↓ Sends webhook (base64-encoded JSON)
  
YOUR SYSTEM: /api/webhooks/maystro
  ↓ Receives & decodes webhook data (twice)
  ↓ Extracts: event, payload, instance_uuid
  
SMART ORDER LOOKUP (Priority):
  1. Try: trackingNumber = payload.display_id_order
  2. Try: maystroOrderId = payload.id OR instance_uuid
  3. Try: reference = payload.external_order_id
  
IF ORDER FOUND (already synced):
  ↓ Update shippingStatus
  ↓ Update trackingNumber, maystroOrderId
  ↓ IF status = "LIVRÉ" → Set order.status = "DELIVERED"
  ↓ Save webhook event to database
  ✅ SUCCESS
  
IF ORDER NOT FOUND (not synced yet):
  ↓ Log webhook event as "not processed"
  ↓ Order will be updated on next API sync
  ⚠️  SKIP (no error)
```

---

## 🛠️ What You Need to Do in Maystro Account

### **Option 1: Automatic Setup (RECOMMENDED)**

**Nothing!** The system will automatically create the webhook when the app starts.

Just verify it was created:
1. Go to [Maystro Beta Web App](https://beta.maystro-delivery.com/settings/webhooks)
2. Login to your account
3. Navigate to: **Settings** → **Webhooks**
4. You should see a webhook with:
   - **Endpoint**: `https://app.libertadz.shop/api/webhooks/maystro`
   - **Trigger**: "all" (or "OrderStatusChanged")
   - **Status**: Active ✅

### **Option 2: Manual Setup (If Auto-setup Fails)**

If automatic setup doesn't work, create it manually:

1. Go to [Maystro Beta Web App](https://beta.maystro-delivery.com/settings/webhooks)
2. Navigate to: **Settings** → **Webhooks**
3. Click the **"+"** button
4. Fill in:
   - **Endpoint URL**: `https://app.libertadz.shop/api/webhooks/maystro`
   - **Event Type**: Select **"all"** (this includes OrderStatusChanged)
   - **Protocol**: HTTPS ✅
5. Click **Save**

---

## 🧪 Testing the Webhook

### **Method 1: Using Maystro's Test Feature**

1. In Maystro web app, go to your webhook
2. Click **"Test"** button
3. Check your application logs for:
   ```
   🔔 Received Maystro webhook
   📦 Parsed webhook data
   ✅ Webhook processed successfully
   ```

### **Method 2: Using API Endpoint**

```bash
# Send test webhook via Maystro API
curl -X POST https://b.maystro-delivery.com/api/stores/hooks/test/request/ \
  -H "Authorization: Token YOUR_MAYSTRO_API_KEY"
```

### **Method 3: Real Order Status Change**

1. Change an order status in Maystro dashboard
2. Watch your application logs
3. Check database - order should be updated immediately

---

## 📊 Monitoring Webhooks

### **View Webhook Events in Your System:**

```bash
# Get webhook events history
GET /api/webhooks/events?source=MAYSTRO&limit=50

# Get webhook statistics
GET /api/webhooks/stats?source=MAYSTRO&period=7d

# Retry failed webhook
POST /api/webhooks/events/:id/retry
```

### **Check Webhook Status in Maystro:**

```bash
# List all configured webhooks
GET https://b.maystro-delivery.com/api/stores/hooks/costume/
Authorization: Token YOUR_API_KEY

# Get webhook types
GET https://b.maystro-delivery.com/api/stores/hooks/types/
Authorization: Token YOUR_API_KEY
```

---

## 🔧 Configuration

### **Environment Variables:**

Add to your `.env` file (optional):

```env
# Webhook base URL (defaults to https://app.libertadz.shop if not set)
WEBHOOK_BASE_URL=https://app.libertadz.shop
```

### **Webhook URL:**

The webhook endpoint is:
```
https://app.libertadz.shop/api/webhooks/maystro
```

**Important**: 
- ✅ Must be HTTPS (not HTTP)
- ✅ Must be publicly accessible
- ✅ No authentication required (public endpoint)

---

## 🎯 Supported Events

Currently processing:
- ✅ **OrderStatusChanged** - Real-time order status updates
- ⚠️ **orderCreated** - Logged but not processed (orders created via API sync)
- ⚠️ **InventoryMovement** - Logged but not processed

---

## 🔍 Troubleshooting

### **Webhook Not Receiving Data:**

1. **Check webhook exists in Maystro:**
   - Go to Maystro web app → Settings → Webhooks
   - Verify endpoint URL is correct
   - Verify trigger is "all" or "OrderStatusChanged"

2. **Check webhook endpoint is accessible:**
   ```bash
   curl -X POST https://app.libertadz.shop/api/webhooks/maystro \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. **Check application logs:**
   ```bash
   # Look for webhook processing logs
   grep "Maystro webhook" /path/to/logs
   ```

### **Orders Not Updating:**

1. **Verify order exists in database:**
   - Order must be synced via API first
   - Check `trackingNumber` or `maystroOrderId` is populated

2. **Check webhook event logs:**
   ```sql
   SELECT * FROM webhook_events 
   WHERE source = 'MAYSTRO' 
   ORDER BY createdAt DESC 
   LIMIT 10;
   ```

3. **Verify order identification:**
   - Webhook tries: trackingNumber → maystroOrderId → reference
   - At least one must match

### **Webhook Created Multiple Times:**

The system checks for existing webhooks before creating new ones. If you see duplicates:
1. Delete old webhooks via Maystro web app
2. Restart your application
3. System will create only one webhook

---

## 📝 Database Schema

### **WebhookEvent Model:**

```prisma
model WebhookEvent {
  id          String      @id @default(cuid())
  orderId     String?     // Linked order (if found)
  source      WebhookSource // "MAYSTRO"
  eventType   String      // "OrderStatusChanged"
  payload     Json        // Full webhook data
  processed   Boolean     @default(false)
  error       String?     // Error message if failed
  createdAt   DateTime    @default(now())
  
  order Order? @relation(fields: [orderId], references: [id])
}
```

---

## ✅ Verification Checklist

- [ ] Webhook exists in Maystro account
- [ ] Webhook endpoint is `https://app.libertadz.shop/api/webhooks/maystro`
- [ ] Webhook trigger is "all" or "OrderStatusChanged"
- [ ] Webhook status is "Active"
- [ ] Test webhook sends successfully
- [ ] Application logs show webhook processing
- [ ] Order status updates in real-time when changed in Maystro
- [ ] Delivered orders (status 41) automatically set to "DELIVERED"

---

## 🚀 Benefits

✅ **Real-time updates** - No more waiting for API sync
✅ **Automatic setup** - Webhook created on app start
✅ **Smart order matching** - Multiple identification methods
✅ **Auto-delivery detection** - Delivered orders marked automatically
✅ **Audit trail** - All webhooks logged in database
✅ **Multi-account support** - One endpoint for all Maystro accounts
✅ **Fail-safe** - Webhook failures don't break the system

---

## 📞 Support

If you encounter issues:
1. Check application logs for errors
2. Verify webhook configuration in Maystro
3. Test webhook endpoint manually
4. Check database webhook_events table
5. Contact Maystro support if webhook not sending

---

**Implementation Date**: November 22, 2025
**Status**: ✅ Complete and Ready for Production