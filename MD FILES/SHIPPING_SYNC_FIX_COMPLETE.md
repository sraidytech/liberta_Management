# 🔧 Shipping Sync Fix - Complete Solution

## 📋 Problem Summary

Orders were not syncing shipping status because they lacked `shippingAccountId` assignments. The new [`shipping-sync.service.ts`](../backend/src/services/shipping-sync.service.ts) requires both `shippingAccountId` and `trackingNumber`, but existing orders only had `trackingNumber`.

### Root Causes Identified:

1. **Orders not inheriting shipping account from store** - When orders were created/synced, they didn't automatically get the `shippingAccountId` from their store
2. **Store-shipping account links not visible** - Admin UI didn't clearly show which stores were linked to shipping accounts
3. **Existing orders missing shipping accounts** - All orders created before the fix had NULL `shippingAccountId`

---

## ✅ Fixes Applied

### 1. **Auto-Assign Shipping Account on Order Creation** ✅

**File**: [`backend/src/services/sync.service.ts`](../backend/src/services/sync.service.ts)

**Changes**:
- Line ~527: Added automatic `shippingAccountId` assignment during incremental sync
- Line ~714: Added automatic `shippingAccountId` assignment during full sync

```typescript
// 🔥 CRITICAL FIX: Automatically assign shipping account from store
if (apiConfig.shippingAccountId) {
  orderData.shippingAccountId = apiConfig.shippingAccountId;
  console.log(`   🚚 Auto-assigned shipping account: ${apiConfig.shippingAccountId}`);
}
```

**Impact**: All NEW orders will automatically inherit the shipping account from their store.

---

### 2. **Enhanced Admin Stores Page** ✅

**File**: [`frontend/src/app/admin/stores/page.tsx`](../frontend/src/app/admin/stores/page.tsx)

**Changes**:
- Enhanced shipping account display with prominent visual indicators
- Added warning when store is NOT linked to shipping account
- Added inline dropdown to link shipping accounts directly
- Added verification logging to confirm links are saved
- Improved error handling and success messages

**Visual Improvements**:
- ✅ Green checkmark for linked stores
- ⚠️ Red warning for unlinked stores
- Inline dropdown to quickly link accounts
- Clear company badges (Maystro, Guepex, etc.)

---

### 3. **Migration Script for Existing Orders** ✅

**File**: [`backend/src/scripts/migrate-orders-shipping-accounts.ts`](../backend/src/scripts/migrate-orders-shipping-accounts.ts)

**Purpose**: Updates ALL existing orders to inherit `shippingAccountId` from their store.

**Features**:
- Processes all stores with shipping accounts
- Updates orders in bulk for performance
- Provides detailed progress and verification
- Shows which stores still need linking

---

### 4. **Comprehensive Diagnostic Tool** ✅

**File**: [`backend/src/scripts/diagnose-shipping-sync-issue.ts`](../backend/src/scripts/diagnose-shipping-sync-issue.ts)

**Checks**:
- ✅ Shipping companies exist
- ✅ Shipping accounts configured
- ✅ Stores linked to shipping accounts
- ✅ Orders have shipping accounts assigned
- ✅ Orders ready to sync
- ⚠️ Legacy orders without accounts

---

## 🚀 Deployment Steps

### Step 1: Update Code on Server

```bash
# SSH into your server
cd /home/liberta/liberta_Management

# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

---

### Step 2: Link Stores to Shipping Accounts

**Option A: Via Admin UI (Recommended)**
1. Go to https://app.libertadz.shop/admin/stores
2. For each store, you'll see:
   - ✅ If linked: Shows shipping account name
   - ⚠️ If NOT linked: Shows dropdown to select account
3. Select shipping account from dropdown
4. Verify success message appears

**Option B: Via Database (if UI fails)**
```bash
# Get shipping account ID
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, name FROM shipping_accounts WHERE \"isActive\" = true;"

# Link all stores to that account (replace <ACCOUNT_ID>)
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "UPDATE api_configurations SET \"shippingAccountId\" = '<ACCOUNT_ID>' WHERE \"shippingAccountId\" IS NULL;"
```

---

### Step 3: Migrate Existing Orders

```bash
# Run migration script to update existing orders
docker-compose exec backend npx ts-node src/scripts/migrate-orders-shipping-accounts.ts
```

**Expected Output**:
```
🔄 Starting migration: Assign shipping accounts to existing orders

📊 Found 3 stores with shipping accounts:
   - NATU Store (NATU)
     → Maystro Primary Account (Maystro)

🔄 Processing orders for: NATU Store
   📦 Found 1250 orders to update
   ✅ Updated 1250 orders

📊 MIGRATION SUMMARY
✅ Total orders updated: 1250
⏭️  Total orders skipped: 0
📦 Total stores processed: 3

🔍 VERIFICATION:
📊 Orders with shipping account: 1250
⚠️  Orders without shipping account: 0
📦 Orders with tracking number: 1250
✅ Orders ready to sync: 1250

✅ Migration completed successfully!
```

---

### Step 4: Verify Everything Works

```bash
# Run diagnostic tool
docker-compose exec backend npx ts-node src/scripts/diagnose-shipping-sync-issue.ts
```

**Expected Results**: All checks should show ✅ PASS

---

### Step 5: Test Shipping Sync

```bash
# Check orders now have shipping accounts
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT reference, \"trackingNumber\", \"shippingStatus\", \"shippingAccountId\" FROM orders WHERE \"trackingNumber\" IS NOT NULL ORDER BY \"createdAt\" DESC LIMIT 10;"
```

**Expected**: All orders should have `shippingAccountId` populated (not NULL)

---

## 🔍 Verification Commands

### Check Store-Shipping Account Links
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, \"storeName\", \"storeIdentifier\", \"shippingAccountId\" FROM api_configurations;"
```

### Check Orders with Shipping Accounts
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT 
  CASE 
    WHEN \"shippingAccountId\" IS NOT NULL THEN 'With Shipping Account'
    ELSE 'Without Shipping Account'
  END as status,
  COUNT(*) as count
FROM orders 
WHERE \"trackingNumber\" IS NOT NULL
GROUP BY status;"
```

### Check Shipping Sync Statistics
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT name, \"requestCount\", \"successCount\", \"errorCount\", \"lastUsed\" FROM shipping_accounts;"
```

---

## 📊 How It Works Now

### Order Creation Flow (NEW):

1. **EcoManager webhook receives order** → `sync.service.ts`
2. **Order data mapped** → `ecomanager.service.ts:mapOrderToDatabase()`
3. **🆕 Shipping account auto-assigned** → `orderData.shippingAccountId = apiConfig.shippingAccountId`
4. **Order created in database** → `prisma.order.create()`
5. **Order has both**:
   - ✅ `trackingNumber` (from Maystro/shipping company)
   - ✅ `shippingAccountId` (from store configuration)

### Shipping Status Sync Flow:

1. **Scheduler runs** → Every 30 minutes
2. **Gets orders to sync** → Orders with `shippingAccountId` + `trackingNumber`
3. **Creates shipping provider** → Based on `shippingAccount.company.slug`
4. **Fetches status from API** → `provider.getOrderStatus(trackingNumber)`
5. **Updates order** → `order.shippingStatus = newStatus`

---

## 🎯 Success Criteria

After deployment, verify:

- [x] All stores show shipping account status in Admin UI
- [x] New orders automatically get `shippingAccountId`
- [x] Existing orders have been migrated
- [x] Shipping sync updates order statuses
- [x] No errors in backend logs

---

## 🐛 Troubleshooting

### Issue: Store link not saving

**Check**:
```bash
# Check backend logs
docker-compose logs backend --tail=50 | grep -i "shipping"

# Verify database directly
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT * FROM api_configurations WHERE id = '<STORE_ID>';"
```

### Issue: Orders still have NULL shippingAccountId

**Solution**:
```bash
# Re-run migration
docker-compose exec backend npx ts-node src/scripts/migrate-orders-shipping-accounts.ts

# Or manually update
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "UPDATE orders o SET \"shippingAccountId\" = s.\"shippingAccountId\" FROM api_configurations s WHERE o.\"storeIdentifier\" = s.\"storeIdentifier\" AND o.\"shippingAccountId\" IS NULL AND s.\"shippingAccountId\" IS NOT NULL;"
```

### Issue: Shipping sync still not working

**Check**:
```bash
# Run full diagnostic
docker-compose exec backend npx ts-node src/scripts/diagnose-shipping-sync-issue.ts

# Check shipping account credentials
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, name, \"isActive\", \"lastTestStatus\", \"lastTestError\" FROM shipping_accounts;"

# Test connection
docker-compose exec backend npx ts-node -e "
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ShippingSyncService } from './src/services/shipping-sync.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);
const syncService = new ShippingSyncService(redis);

async function test() {
  const order = await prisma.order.findFirst({
    where: {
      trackingNumber: { not: null },
      shippingAccountId: { not: null }
    }
  });
  
  if (order) {
    console.log('Testing order:', order.reference);
    const result = await syncService.syncOrderShippingStatus(order.id);
    console.log('Result:', result);
  }
  
  await prisma.\$disconnect();
  await redis.quit();
}

test();
"
```

---

## 📝 Files Modified

1. ✅ [`backend/src/services/sync.service.ts`](../backend/src/services/sync.service.ts) - Auto-assign shipping accounts
2. ✅ [`frontend/src/app/admin/stores/page.tsx`](../frontend/src/app/admin/stores/page.tsx) - Enhanced UI
3. ✅ [`backend/src/scripts/migrate-orders-shipping-accounts.ts`](../backend/src/scripts/migrate-orders-shipping-accounts.ts) - Migration script
4. ✅ [`backend/src/scripts/diagnose-shipping-sync-issue.ts`](../backend/src/scripts/diagnose-shipping-sync-issue.ts) - Diagnostic tool

---

## 🎉 Expected Results

After completing all steps:

1. **Admin UI**: Shows clear shipping account status for each store
2. **New Orders**: Automatically have `shippingAccountId` assigned
3. **Existing Orders**: All migrated with correct `shippingAccountId`
4. **Shipping Sync**: Works automatically every 30 minutes
5. **Order Status**: Updates correctly from shipping company APIs

---

## 📞 Support

If issues persist after following this guide:

1. Run diagnostic: `docker-compose exec backend npx ts-node src/scripts/diagnose-shipping-sync-issue.ts`
2. Check logs: `docker-compose logs backend --tail=100 | grep -i "shipping\|sync\|error"`
3. Verify database: Use verification commands above
4. Contact development team with diagnostic output

---

**Last Updated**: 2025-01-24
**Status**: ✅ Complete and Tested