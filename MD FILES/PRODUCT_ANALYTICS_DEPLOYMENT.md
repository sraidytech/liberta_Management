# 🚀 Product Analytics Deployment Guide

## 📋 Overview
This guide covers deploying the new Product Analytics feature to both development and production environments.

---

## 🔧 Changes Made

### Backend Changes
1. **New Controller**: `backend/src/modules/analytics/product-analytics.controller.ts`
2. **New Route**: Added to `backend/src/modules/analytics/analytics.routes.ts`
3. **Database Indexes**: `scripts/database-optimization/03-product-analytics-indexes.sql`

### Frontend Changes
1. **Main Component**: `frontend/src/components/admin/reports/product-analytics.tsx`
2. **Sub-components**: 9 new components in `frontend/src/components/admin/reports/product-analytics/`
3. **Hook Update**: Modified `frontend/src/hooks/useReportsLazy.ts`
4. **Page Update**: Modified `frontend/src/app/admin/reports/page.tsx`

---

## 💻 Development Environment (Your PC)

### Step 1: Apply Database Indexes
```bash
# Navigate to project root
cd "c:/Users/sufma/Documents/SracomAgency/libertaphonix management app folder"

# Connect to your local database and run the indexes
# Option A: Using Docker
docker exec -i libertaphonix-postgres-1 psql -U your_db_user -d your_db_name < "scripts/database-optimization/03-product-analytics-indexes.sql"

# Option B: Using psql directly (if installed locally)
psql -U your_db_user -d your_db_name -f "scripts/database-optimization/03-product-analytics-indexes.sql"
```

### Step 2: Restart Backend
```bash
# If using Docker
docker-compose restart backend

# If running locally
cd backend
npm run dev
```

### Step 3: Restart Frontend
```bash
# If using Docker
docker-compose restart frontend

# If running locally
cd frontend
npm run dev
```

### Step 4: Test the Feature
1. Open browser: `http://localhost:3000/admin/reports`
2. Click on "Product Analytics" tab
3. Verify all data loads correctly with revenue showing proper values

---

## 🌐 Production Server Deployment

### Prerequisites
- SSH access to production server
- Docker and Docker Compose installed
- Application running in Docker containers

### Step 1: Connect to Server
```bash
# SSH into your production server
ssh liberta@your-server-ip

# Navigate to application directory
cd /home/liberta/liberta_Management
```

### Step 2: Backup Current State
```bash
# Backup database
docker exec libertaphonix-postgres-1 pg_dump -U libertaphonix_prod libertaphonix_production > backup_before_product_analytics_$(date +%Y%m%d_%H%M%S).sql

# Backup current code
git stash
git branch backup-before-product-analytics-$(date +%Y%m%d_%H%M%S)
```

### Step 3: Pull Latest Changes
```bash
# Fetch latest code
git fetch origin
git pull origin main

# Or if you're on a different branch
git pull origin your-branch-name
```

### Step 4: Apply Database Indexes
```bash
# Apply the new indexes
docker exec -i libertaphonix-postgres-1 psql -U libertaphonix_prod -d libertaphonix_production < scripts/database-optimization/03-product-analytics-indexes.sql

# Verify indexes were created
docker exec -i libertaphonix-postgres-1 psql -U libertaphonix_prod -d libertaphonix_production -c "\di"
```

### Step 5: Rebuild and Restart Containers
```bash
# Stop containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Rebuild images (this will include new code)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache

# Start containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 6: Verify Deployment
```bash
# Check container status
docker ps

# Check backend health
curl http://localhost:5000/health

# Check frontend health
curl http://localhost:3000

# Test the API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:5000/api/v1/analytics/products?startDate=2024-01-01&endDate=2024-12-31"
```

### Step 7: Monitor Logs
```bash
# Watch backend logs for any errors
docker-compose logs -f backend | grep -i "product"

# Watch for any errors
docker-compose logs -f backend | grep -i "error"

# Check Redis cache
docker exec -it libertaphonix-redis-1 redis-cli
> KEYS product-analytics:*
> TTL product-analytics:*
> exit
```

---

## 🔍 Troubleshooting

### Issue: Revenue Shows 0 DA
**Solution**: The fix has been applied. Revenue now uses `order.total` distributed across items.

```bash
# Verify the fix in logs
docker-compose logs backend | grep "Sample item"
```

### Issue: Slow Loading
**Solution**: Indexes have been added. Verify they exist:

```bash
docker exec -i libertaphonix-postgres-1 psql -U libertaphonix_prod -d libertaphonix_production -c "
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('orders', 'order_items', 'customers')
ORDER BY tablename, indexname;
"
```

### Issue: Frontend Not Updating
**Solution**: Clear browser cache and rebuild frontend:

```bash
# Rebuild frontend only
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build frontend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d frontend
```

### Issue: API Returns 500 Error
**Solution**: Check backend logs:

```bash
# View recent errors
docker-compose logs --tail=100 backend | grep -i "error"

# Check database connection
docker exec -it libertaphonix-postgres-1 psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT 1;"
```

---

## 📊 Performance Monitoring

### Check Query Performance
```bash
# Connect to database
docker exec -it libertaphonix-postgres-1 psql -U libertaphonix_prod libertaphonix_production

# Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%order_items%' 
ORDER BY mean_time DESC 
LIMIT 10;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('orders', 'order_items')
ORDER BY idx_scan DESC;
```

### Monitor Cache Hit Rate
```bash
# Check Redis stats
docker exec -it libertaphonix-redis-1 redis-cli INFO stats

# Check cache keys
docker exec -it libertaphonix-redis-1 redis-cli KEYS "product-analytics:*"
```

---

## 🔄 Rollback Procedure (If Needed)

### Quick Rollback
```bash
# Stop containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Checkout previous version
git checkout backup-before-product-analytics-YYYYMMDD_HHMMSS

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

### Remove Indexes (If Causing Issues)
```bash
docker exec -i libertaphonix-postgres-1 psql -U libertaphonix_prod -d libertaphonix_production << 'EOF'
DROP INDEX IF EXISTS idx_order_items_title;
DROP INDEX IF EXISTS idx_order_items_sku;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_orders_shipping_status;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_order_date;
DROP INDEX IF EXISTS idx_orders_store_identifier;
DROP INDEX IF EXISTS idx_orders_date_status;
DROP INDEX IF EXISTS idx_orders_date_store;
DROP INDEX IF EXISTS idx_customers_wilaya;
EOF
```

---

## ✅ Post-Deployment Checklist

- [ ] Database indexes created successfully
- [ ] Backend container running without errors
- [ ] Frontend container running without errors
- [ ] Product Analytics tab visible in UI
- [ ] Revenue showing correct values (not 0 DA)
- [ ] All sub-tabs loading correctly
- [ ] Data loads in under 3 seconds
- [ ] No console errors in browser
- [ ] Redis cache working (check logs for "cached: true")
- [ ] Nginx logs show no 502/504 errors

---

## 📞 Support

If you encounter issues:

1. **Check Logs**: `docker-compose logs -f backend frontend`
2. **Check Database**: Verify indexes exist
3. **Check Redis**: Verify cache is working
4. **Check Nginx**: `sudo nginx -t && sudo systemctl status nginx`
5. **Restart Services**: `docker-compose restart`

---

## 🎉 Success Indicators

✅ Product Analytics tab loads in < 3 seconds
✅ Revenue values show actual amounts (not 0 DA)
✅ All 7 sub-tabs work correctly
✅ Data updates when filters change
✅ No errors in browser console
✅ Backend logs show successful queries
✅ Redis cache hit rate > 50%
