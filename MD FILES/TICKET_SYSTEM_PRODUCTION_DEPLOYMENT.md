# 🎫 Ticket System Enhancement - Production Deployment Guide

## 📋 Overview

This guide covers deploying the enhanced ticket management system with:
- ✅ New critical ticket categories (EXCHANGE, REFUND, QUALITY_CONTROL)
- ✅ Role-based access control (Team Managers + Coordinateurs see ALL tickets)
- ✅ Critical tickets section with visual emphasis
- ✅ Auto-notification system for critical tickets

---

## 🚀 Deployment Steps for Production Server

### Step 1: Connect to Production Server

```bash
# SSH into your production server
ssh liberta@app.libertadz.shop

# Navigate to application directory
cd /home/liberta/liberta_Management
```

---

### Step 2: Backup Current Database

**CRITICAL: Always backup before making database changes!**

```bash
# Create backup directory if it doesn't exist
mkdir -p ~/backups

# Backup the database
docker exec libertaphonix_postgres pg_dump -U libertaphonix_prod libertaphonix_production > ~/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh ~/backups/

# Optional: Download backup to local machine for extra safety
# From your local machine, run:
# scp liberta@app.libertadz.shop:~/backups/db_backup_*.sql ./local_backup/
```

---

### Step 3: Pull Latest Code from Repository

```bash
# Check current status
git status

# Stash any local changes (if any)
git stash

# Pull latest changes from main branch
git pull origin main

# If you have conflicts, resolve them or reset to remote
# git reset --hard origin/main

# Verify the new files are present
ls -la backend/prisma/migrations/20250715000000_add_critical_ticket_categories/
ls -la frontend/src/components/tickets/
```

---

### Step 4: Stop Running Containers

```bash
# Stop all containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Verify containers are stopped
docker ps
```

---

### Step 5: Apply Database Migration

**Method 1: Using Docker (Recommended)**

```bash
# Copy migration SQL to PostgreSQL container
docker cp backend/prisma/migrations/20250715000000_add_critical_ticket_categories/migration.sql libertaphonix_postgres:/tmp/add_critical_ticket_categories.sql

# Execute the migration
docker exec libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production -f /tmp/add_critical_ticket_categories.sql

# Verify migration was successful (should show ALTER TYPE 3 times)
```

**Method 2: Manual SQL Execution (Alternative)**

```bash
# Start only the database container
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d postgres

# Wait for database to be ready
sleep 10

# Execute migration
docker exec -i libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production << 'EOF'
-- Add new critical ticket categories
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'EXCHANGE';
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'REFUND';
ALTER TYPE "TicketCategory" ADD VALUE IF NOT EXISTS 'QUALITY_CONTROL';
EOF

# Verify the new values were added
docker exec libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT unnest(enum_range(NULL::\"TicketCategory\"));"
```

---

### Step 6: Regenerate Prisma Client

```bash
# Start backend container temporarily to regenerate Prisma client
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d backend

# Wait for container to be ready
sleep 5

# Regenerate Prisma client
docker exec libertaphonix_backend npx prisma generate

# Verify generation was successful
docker exec libertaphonix_backend ls -la node_modules/@prisma/client/
```

---

### Step 7: Rebuild and Restart All Services

```bash
# Rebuild containers with new code
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache

# Start all services
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Wait for services to be ready
sleep 30

# Check container status
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Check logs for any errors
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs --tail=50 backend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs --tail=50 frontend
```

---

### Step 8: Verify Deployment

#### 8.1 Check Database Migration

```bash
# Verify new ticket categories exist
docker exec libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT unnest(enum_range(NULL::\"TicketCategory\"));"

# Expected output should include:
# CUSTOMER_ISSUE
# PRODUCT_ISSUE
# DELIVERY_ISSUE
# SYSTEM_ISSUE
# PAYMENT_ISSUE
# EXCHANGE          <-- NEW
# REFUND            <-- NEW
# QUALITY_CONTROL   <-- NEW
# OTHER
```

#### 8.2 Check Backend API

```bash
# Test backend health
curl http://localhost:5000/health

# Test tickets endpoint (requires authentication)
# You'll need to get a valid JWT token first
```

#### 8.3 Check Frontend

```bash
# Test frontend is running
curl http://localhost:3000

# Check if frontend can reach backend
docker exec libertaphonix_frontend curl http://backend:5000/health
```

#### 8.4 Check Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx if needed
sudo systemctl reload nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

### Step 9: Test the New Features

#### 9.1 Access the Application

1. Open browser and go to: https://app.libertadz.shop
2. Login as Admin or Team Manager
3. Navigate to Tickets page

#### 9.2 Verify Critical Tickets Section

- Check if "🚨 CRITICAL TICKETS" section appears at the top
- Verify it shows with red/orange gradient background
- Confirm it's empty initially (no critical tickets yet)

#### 9.3 Create Test Critical Ticket

1. Login as an Agent
2. Go to an order
3. Create a ticket with category "EXCHANGE" or "REFUND" or "QUALITY_CONTROL"
4. Logout and login as Team Manager or Coordinateur
5. Verify the ticket appears in the Critical Tickets section
6. Verify ALL Team Managers and Coordinateurs received notifications

#### 9.4 Verify Role-Based Access

1. Login as Team Manager → Should see ALL tickets
2. Login as Coordinateur → Should see ALL tickets
3. Login as Agent → Should see only their own tickets

---

### Step 10: Monitor Application

```bash
# Monitor container logs in real-time
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f

# Monitor specific service
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f backend

# Check container resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -h
```

---

## 🔄 Rollback Procedure (If Needed)

If something goes wrong, follow these steps to rollback:

### Option 1: Rollback Code Only

```bash
# Stop containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Rollback to previous commit
git log --oneline -10  # Find the commit hash before the update
git reset --hard <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

### Option 2: Rollback Database (If Migration Failed)

```bash
# Restore from backup
docker exec -i libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production < ~/backups/db_backup_YYYYMMDD_HHMMSS.sql

# Note: You cannot easily remove enum values in PostgreSQL
# If you need to rollback the enum, you'll need to:
# 1. Create a new enum without the new values
# 2. Alter the table to use the new enum
# 3. Drop the old enum
# This is complex and should be avoided if possible
```

---

## 📊 Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] All containers are running (postgres, redis, backend, frontend)
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Nginx is serving the application
- [ ] SSL certificate is valid
- [ ] Critical tickets section appears for supervisors
- [ ] New ticket categories (EXCHANGE, REFUND, QUALITY_CONTROL) are available
- [ ] Role-based access control works correctly
- [ ] Notifications are sent for critical tickets
- [ ] No errors in container logs
- [ ] Application performance is normal
- [ ] Backup was created before deployment

---

## 🐛 Troubleshooting

### Issue: Migration fails with "enum value already exists"

**Solution:**
```bash
# The migration is idempotent, but if you run it twice, you might see this error
# It's safe to ignore if the values already exist
# Verify the values exist:
docker exec libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT unnest(enum_range(NULL::\"TicketCategory\"));"
```

### Issue: TypeScript errors in backend

**Solution:**
```bash
# Regenerate Prisma client
docker exec libertaphonix_backend npx prisma generate

# Restart backend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart backend
```

### Issue: Frontend not showing critical tickets section

**Solution:**
```bash
# Check frontend logs
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache frontend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d frontend
```

### Issue: Containers keep restarting

**Solution:**
```bash
# Check logs for specific container
docker logs libertaphonix_backend --tail=100
docker logs libertaphonix_frontend --tail=100

# Check resource usage
docker stats

# If out of memory, consider upgrading server or optimizing resource limits
```

---

## 📞 Support

If you encounter any issues during deployment:

1. Check the logs: `docker-compose logs -f`
2. Verify database connection: `docker exec libertaphonix_postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT 1;"`
3. Check Nginx configuration: `sudo nginx -t`
4. Review this guide's troubleshooting section
5. Contact the development team with specific error messages

---

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ All containers show "Up" status
2. ✅ Backend health endpoint returns 200 OK
3. ✅ Frontend loads without errors
4. ✅ Critical tickets section appears for Team Managers/Coordinateurs
5. ✅ New ticket categories are selectable
6. ✅ Notifications work for critical tickets
7. ✅ No errors in application logs
8. ✅ Database queries execute normally

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Backup Location:** ~/backups/db_backup_YYYYMMDD_HHMMSS.sql
**Git Commit:** _____________

---

🎉 **Congratulations! Your ticket management system enhancement is now live in production!**