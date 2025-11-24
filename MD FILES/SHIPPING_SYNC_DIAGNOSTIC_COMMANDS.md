# 🔍 Shipping Sync Diagnostic Commands for Production Server

## Quick Diagnostic Command

Run this single command on your production server to diagnose all shipping sync issues:

```bash
docker-compose exec backend npx ts-node src/scripts/diagnose-shipping-sync-issue.ts
```

---

## Additional Diagnostic Commands

### 1. Check Backend Logs for Shipping Errors
```bash
docker-compose logs -f backend | grep -i "shipping\|sync\|error"
```

### 2. Check Database - Shipping Companies
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, name, slug FROM shipping_companies;"
```

### 3. Check Database - Shipping Accounts
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, name, \"companyId\", \"isActive\", \"isPrimary\", \"requestCount\", \"successCount\", \"errorCount\" FROM shipping_accounts;"
```

### 4. Check Database - Store-Shipping Account Links (CRITICAL!)
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, \"storeName\", \"storeIdentifier\", \"shippingAccountId\" FROM api_configurations;"
```

### 5. Check Orders with Shipping Accounts
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT reference, \"trackingNumber\", \"shippingStatus\", \"shippingAccountId\" FROM orders WHERE \"trackingNumber\" IS NOT NULL ORDER BY \"createdAt\" DESC LIMIT 10;"
```

### 6. Count Orders by Shipping Account Status
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

---

## Root Cause Analysis

Based on the code analysis, the issue is:

### **Problem**: Orders are not being updated because they don't have `shippingAccountId` assigned

The new [`shipping-sync.service.ts`](backend/src/services/shipping-sync.service.ts:26) requires:
1. Order must have `shippingAccountId` (line 46-64)
2. Order must have `trackingNumber` (line 66-72)

However, the old system only used `trackingNumber` and `maystroOrderId` without requiring `shippingAccountId`.

### **Why Store Links Might Not Be Saving**

Check the [`stores.controller.ts`](backend/src/modules/stores/stores.controller.ts:788-800) - the code looks correct, but we need to verify:
1. The API endpoint is being called correctly
2. The database transaction is committing
3. No middleware is blocking the update

---

## Fix Steps

### Step 1: Verify Shipping Accounts Exist
```bash
docker-compose exec backend npm run db:seed
```

### Step 2: Check if Store Links Are Actually Saved
```bash
# Run this AFTER linking a store in the admin panel
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, \"storeName\", \"shippingAccountId\" FROM api_configurations WHERE \"shippingAccountId\" IS NOT NULL;"
```

### Step 3: If Links Are Not Saving, Check Backend Logs
```bash
docker-compose logs backend --tail=100 | grep -i "shipping"
```

### Step 4: Manually Link a Store (if UI fails)
```bash
# Replace <STORE_ID> and <SHIPPING_ACCOUNT_ID> with actual IDs
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "UPDATE api_configurations SET \"shippingAccountId\" = '<SHIPPING_ACCOUNT_ID>' WHERE id = '<STORE_ID>';"
```

### Step 5: Verify Orders Get Shipping Account on Creation
Check if new orders are automatically getting `shippingAccountId` from their store:
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT o.reference, o.\"storeIdentifier\", o.\"shippingAccountId\", s.\"shippingAccountId\" as store_shipping_account FROM orders o LEFT JOIN api_configurations s ON o.\"storeIdentifier\" = s.\"storeIdentifier\" ORDER BY o.\"createdAt\" DESC LIMIT 10;"
```

---

## Expected Output

After running the diagnostic script, you should see:

✅ **PASS** - Shipping companies exist
✅ **PASS** - Shipping accounts configured
✅ **PASS** - Stores linked to shipping accounts
✅ **PASS** - Orders have shipping accounts assigned
✅ **PASS** - Orders can be synced

If you see ❌ **FAIL** or ⚠️ **WARNING**, follow the recommended actions in the diagnostic output.

---

## Quick Fix Commands

### If stores are not linked:
```bash
# Get shipping account ID
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, name FROM shipping_accounts WHERE \"isActive\" = true LIMIT 1;"

# Link all stores to that account (replace <ACCOUNT_ID>)
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "UPDATE api_configurations SET \"shippingAccountId\" = '<ACCOUNT_ID>' WHERE \"shippingAccountId\" IS NULL;"
```

### If orders don't have shipping accounts:
```bash
# Update existing orders to inherit shipping account from their store
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "UPDATE orders o SET \"shippingAccountId\" = s.\"shippingAccountId\" FROM api_configurations s WHERE o.\"storeIdentifier\" = s.\"storeIdentifier\" AND o.\"shippingAccountId\" IS NULL AND s.\"shippingAccountId\" IS NOT NULL;"
```

---

## Test Shipping Sync After Fixes

```bash
# Test sync on a single order
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
    console.log('Testing sync for order:', order.reference);
    const result = await syncService.syncOrderShippingStatus(order.id);
    console.log('Result:', result);
  } else {
    console.log('No orders found with both tracking number and shipping account');
  }
  
  await prisma.\$disconnect();
  await redis.quit();
}

test();
"
```

---

## Monitoring

### Watch for sync errors in real-time:
```bash
docker-compose logs -f backend | grep -i "sync\|shipping"
```

### Check sync statistics:
```bash
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT name, \"requestCount\", \"successCount\", \"errorCount\", \"lastUsed\" FROM shipping_accounts;"