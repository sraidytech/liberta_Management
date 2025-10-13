# 🔧 ALPH Store Maystro Status Update Fix

## 🎯 Problem Identified

**Issue**: ALPH store orders are stuck in "EN TRANSIT POUR EXPÉDITION" status and not updating.

**Root Cause**: The `MaystroService` doesn't have any mapping between stores and API keys. Currently:
- `MAYSTRO_API_KEY` (primary) is used for stores: NATU, PURNA, DILST, MGSTR, JWLR
- `MAYSTRO_API_KEY_1` should be used ONLY for ALPH store
- BUT: The code treats all API keys as interchangeable and searches ALL APIs for ALL orders

This means when syncing ALPH orders, the system searches in the wrong API (the primary one) instead of `MAYSTRO_API_KEY_1`, resulting in orders not being found and statuses not updating.

---

## ✅ Solution Overview

Implement store-to-API-key mapping so that:
1. Each store is explicitly mapped to its specific API key
2. ALPH orders only use `MAYSTRO_API_KEY_1`
3. Other stores use the primary `MAYSTRO_API_KEY`
4. The sync logic respects these mappings

---

## 📋 Files Modified

1. `backend/src/services/maystro-config.service.ts` - ✅ ALREADY UPDATED
   - Added `storeIdentifiers` field to API key configuration
   - Added `getApiKeyForStore()` method
   - Added store-to-API-key mapping logic

2. `backend/.env` - ⚠️ NEEDS UPDATE ON SERVER

---

## 🚀 Deployment Steps

### Step 1: Update Environment Variables on Server

SSH into your production server and update the `.env` file:

```bash
# SSH into server
ssh liberta@your-server-ip

# Navigate to project directory
cd /home/liberta/liberta_Management

# Edit .env file
nano .env
```

**Add these new environment variables:**

```env
# Store-to-API-Key Mapping
# Primary API Key is for these stores
MAYSTRO_API_KEY_STORES=NATU,PURNA,DILST,MGSTR,JWLR

# Secondary API Key 1 is ONLY for ALPH store
MAYSTRO_API_KEY_1_STORES=ALPH
MAYSTRO_API_KEY_1_NAME=Alphalab Maystro API
```

**Verify your existing keys are correct:**
```env
MAYSTRO_API_KEY=33ab96ca7b3b640a82793f252cded720b1788c09
MAYSTRO_API_KEY_1=0fa983995c3362b35d97ac1ab9316a792fcb27a1
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 2: Pull Latest Code Changes

```bash
# Pull the latest changes (maystro-config.service.ts is already updated)
git pull origin main

# If there are conflicts, stash local changes first
git stash
git pull origin main
git stash pop
```

### Step 3: Rebuild and Restart Services

```bash
# Stop current services
docker-compose down

# Rebuild with new configuration
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache backend

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Check logs to verify the mapping is working
docker-compose logs -f backend | grep "Mapped store"
```

**Expected output:**
```
📍 Mapped store NATU -> Primary API Key
📍 Mapped store PURNA -> Primary API Key
📍 Mapped store DILST -> Primary API Key
📍 Mapped store MGSTR -> Primary API Key
📍 Mapped store JWLR -> Primary API Key
📍 Mapped store ALPH -> Alphalab Maystro API
📍 Store-to-API-key mapping complete: 6 store(s) mapped
```

### Step 4: Test ALPH Orders Sync

After the services are running, test the ALPH orders sync:

```bash
# Enter the backend container
docker-compose exec backend sh

# Run a test sync for ALPH store
npx ts-node src/scripts/check-shipping-statuses.ts

# Or manually trigger sync via API (from your local machine)
curl -X POST https://app.libertadz.shop/api/orders/sync-shipping-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeIdentifier": "ALPH"}'
```

### Step 5: Verify the Fix

1. **Check Backend Logs:**
```bash
docker-compose logs -f backend | grep "ALPH"
```

Look for messages like:
```
🏪 Processing X orders for store: ALPH
🔑 Using API key: Alphalab Maystro API for store ALPH
✅ Found ALPHXXXX: [NEW_STATUS]
```

2. **Check Database:**
```bash
# Enter PostgreSQL
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production

# Check ALPH orders status
SELECT reference, "shippingStatus", "updatedAt" 
FROM orders 
WHERE "storeIdentifier" = 'ALPH' 
ORDER BY "updatedAt" DESC 
LIMIT 10;
```

3. **Check Admin Dashboard:**
   - Go to https://app.libertadz.shop/admin/orders
   - Filter by store: ALPH
   - Verify that shipping statuses are updating correctly

---

## 🔍 How the Fix Works

### Before (Broken):
```
ALPH Order Sync Request
  ↓
MaystroService.syncShippingStatus()
  ↓
fetchAllOrders() - Fetches from ALL APIs
  ↓
Searches in Primary API (wrong!)
  ↓
Order not found → Status not updated ❌
```

### After (Fixed):
```
ALPH Order Sync Request
  ↓
MaystroService.syncShippingStatus()
  ↓
Groups orders by store
  ↓
For ALPH orders:
  ↓
MaystroConfigService.getApiKeyForStore('ALPH')
  ↓
Returns MAYSTRO_API_KEY_1 (correct!)
  ↓
Searches in correct API
  ↓
Order found → Status updated ✅
```

---

## 📊 Expected Results

After deployment:

1. **ALPH Orders**: Will sync correctly using `MAYSTRO_API_KEY_1`
2. **Other Stores**: Continue to work with primary `MAYSTRO_API_KEY`
3. **Status Updates**: ALPH orders will update from "EN TRANSIT POUR EXPÉDITION" to their actual current status
4. **Performance**: No performance impact, actually more efficient due to targeted API usage

---

## 🐛 Troubleshooting

### Issue: "No API key configured for store ALPH"

**Solution**: Verify environment variables are set correctly:
```bash
docker-compose exec backend sh
echo $MAYSTRO_API_KEY_1_STORES
# Should output: ALPH
```

### Issue: Still using wrong API

**Solution**: Restart services to reload environment variables:
```bash
docker-compose restart backend
```

### Issue: Orders still not updating

**Solution**: Check API key validity:
```bash
# Test the ALPH API key directly
curl -H "Authorization: Token 0fa983995c3362b35d97ac1ab9316a792fcb27a1" \
  https://backend.maystro-delivery.com/api/stores/orders/?limit=1
```

---

## 📝 Rollback Plan

If issues occur, rollback is simple:

```bash
# Stop services
docker-compose down

# Remove the new environment variables from .env
nano .env
# Delete: MAYSTRO_API_KEY_STORES, MAYSTRO_API_KEY_1_STORES, MAYSTRO_API_KEY_1_NAME

# Restart with previous configuration
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

The system will fall back to the previous behavior (searching all APIs).

---

## ✅ Success Criteria

The fix is successful when:

1. ✅ Backend logs show: "Mapped store ALPH -> Alphalab Maystro API"
2. ✅ ALPH orders sync without errors
3. ✅ ALPH order statuses update correctly in database
4. ✅ Admin dashboard shows updated statuses for ALPH orders
5. ✅ Other stores (NATU, PURNA, etc.) continue to work normally

---

## 📞 Support

If you encounter any issues during deployment:

1. Check backend logs: `docker-compose logs -f backend`
2. Verify environment variables: `docker-compose exec backend env | grep MAYSTRO`
3. Test API connectivity for both keys
4. Contact development team with error logs

---

## 🎉 Summary

This fix implements proper store-to-API-key mapping, ensuring that:
- ALPH store orders use the correct Maystro API key (`MAYSTRO_API_KEY_1`)
- Status updates work correctly for all ALPH orders
- The system is more maintainable and scalable for future multi-API scenarios

**Estimated Deployment Time**: 10-15 minutes
**Downtime Required**: ~2 minutes (during service restart)
**Risk Level**: Low (easy rollback available)