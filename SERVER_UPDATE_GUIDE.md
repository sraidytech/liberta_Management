# 🔄 LibertaPhonix Server Update Guide

## 📋 Quick Reference for Updating Production Server

This guide helps you update your LibertaPhonix production server at `app.libertadz.shop` when you make code changes locally.

---

## 🚀 Standard Update Process

### Step 1: Prepare Local Changes
```bash
# On your local machine
# Make your code changes, then commit and push
git add .
git commit -m "Your update description"
git push origin main
```

### Step 2: Connect to Server
```bash
# SSH into your VPS
ssh liberta@your-server-ip
# or
ssh liberta@app.libertadz.shop
```

### Step 3: Navigate to Project Directory
```bash
cd /home/liberta/liberta_Management
```

### Step 4: Pull Latest Changes
```bash
# Pull the latest code from GitHub
git pull origin main

# Verify changes were pulled
git log --oneline -5
```

### Step 5: Update Application
```bash
# Stop current containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Rebuild and restart with latest code
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d

# Monitor startup
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### Step 6: If Changes Don't Appear (Clear Docker Cache)
```bash
# Complete Docker cache clear and rebuild
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Remove all containers, networks, and volumes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v --remove-orphans

# Clear Docker cache completely
docker system prune -af --volumes

# Remove all images (forces complete rebuild)
docker image prune -af

# Rebuild from scratch (no cache)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache

# Start containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Monitor startup
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

---

## 🔧 Different Types of Updates

### 📝 Code-Only Updates (No Database Changes)
```bash
# Quick restart without rebuild (faster)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart

# Or with rebuild (safer)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d
```

### 🗄️ Database Schema Updates (New Migrations)
```bash
# After pulling code with new migrations
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d

# Apply new migrations
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma migrate deploy

# If needed, regenerate Prisma client
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma generate
```

### 📦 Package Updates (New Dependencies)
```bash
# When package.json changes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Force rebuild (no cache)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache

# Start containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

### 🛡️ Database Safety Guide

**IMPORTANT:** Understanding which commands affect your database:

#### ✅ SAFE Commands (Database Preserved):
```bash
# These commands only clear Docker build cache and images - DATABASE IS SAFE
docker system prune -af                    # Safe - no volumes
docker image prune -af                     # Safe - only removes images
docker builder prune -af                   # Safe - only build cache
docker-compose build --no-cache            # Safe - only rebuilds code
docker-compose down                        # Safe - stops containers but keeps volumes
```

#### ⚠️ DANGEROUS Commands (Can Delete Database):
```bash
# These commands include volume operations - CAN DELETE DATABASE
docker-compose down -v                     # DANGER - removes volumes
docker volume prune -f                     # DANGER - removes ALL volumes
docker system prune -af --volumes          # DANGER - removes volumes
```

#### 🔒 Database Protection Types:

**External Database (SAFE):**
- If using AWS RDS, DigitalOcean Database, or external PostgreSQL
- Docker cache clearing **CANNOT** affect external databases
- **100% SAFE** to use any Docker commands

**Docker Database Container (RISKY):**
- Database runs in Docker container with volumes
- Commands with `-v` or `--volumes` **WILL DELETE** database
- Always avoid volume-related commands

### 🧹 SAFE Cache Clear & Rebuild (Database Protected)
```bash
# RECOMMENDED: Safe cache clear that preserves database
# ✅ This method is 100% safe for your database

# Stop containers (but keep volumes/database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Clear cache safely (no volumes touched)
docker system prune -af                    # Safe - no --volumes flag
docker image prune -af                     # Safe - only removes images
docker builder prune -af                   # Safe - only build cache

# Rebuild from scratch
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull

# Start with fresh containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Monitor startup
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### 🚨 NUCLEAR OPTION (Use Only If Necessary)
```bash
# ⚠️ WARNING: This WILL remove database data if using Docker database
# Only use if you have database backups or using external database

# Stop all containers and remove volumes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v --remove-orphans

# Remove ALL Docker data (including database)
docker container prune -f
docker image prune -af
docker volume prune -f                     # ⚠️ DELETES DATABASE
docker network prune -f
docker builder prune -af
docker system prune -af --volumes          # ⚠️ DELETES DATABASE

# Rebuild everything from scratch
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

### 🔄 Git + Docker SAFE Reset (Recommended)
```bash
# Fix Git ownership issue first
git config --global --add safe.directory /home/liberta/liberta_Management

# Pull latest changes
git pull origin main

# Safe Docker reset (preserves database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
docker system prune -af                    # Safe - no volumes
docker image prune -af

# Rebuild from scratch
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Verify deployment
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### 🔄 Git + Docker COMPLETE Reset (Database Will Be Deleted)
```bash
# ⚠️ WARNING: This will delete your database - use only with backups

# Fix Git ownership issue first
git config --global --add safe.directory /home/liberta/liberta_Management

# Pull latest changes
git pull origin main

# Complete Docker reset (DELETES DATABASE)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v --remove-orphans
docker system prune -af --volumes          # ⚠️ DELETES DATABASE
docker image prune -af

# Rebuild from scratch
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Verify deployment
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### 🌱 Seed Data Updates
```bash
# After updating seed.ts file
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npm run db:seed
```

---

## 🔍 Verification Commands

### Check Application Status
```bash
# Check container status
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Check logs
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs backend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs frontend

# Test application endpoints
curl -I https://app.libertadz.shop
curl -I https://app.libertadz.shop/api/health
```

### Monitor Real-time Logs
```bash
# Follow all container logs
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f

# Follow specific service logs
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f backend
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f frontend
```

---

## 🚨 Troubleshooting Common Issues

### Issue 1: Changes Not Showing After Rebuild
```bash
# This is the most common issue - Docker is using cached layers

# SOLUTION 1: Force rebuild without cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# SOLUTION 2: Safe cache clear (preserves database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
docker system prune -af                    # Safe - no volumes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# SOLUTION 3: Complete cache clear (⚠️ may delete database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v
docker system prune -af --volumes          # ⚠️ DELETES DATABASE
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# SOLUTION 4: Nuclear option (⚠️ DELETES DATABASE)
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker rmi $(docker images -q) 2>/dev/null || true
docker volume prune -f                     # ⚠️ DELETES DATABASE
docker network prune -f
docker system prune -af --volumes          # ⚠️ DELETES DATABASE
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

### Issue 2: Containers Won't Start
```bash
# Check Docker system status
docker system df
docker system prune -f

# Remove old images
docker image prune -f

# Restart Docker daemon (if needed)
sudo systemctl restart docker
```

### Issue 3: Database Connection Issues
```bash
# Check database container
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs postgres

# Reset database connection
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart postgres backend
```

### Issue 4: Migration Conflicts
```bash
# Check migration status
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma migrate status

# Reset migrations (CAUTION: Data loss)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma migrate reset --force
```

### Issue 5: Git Ownership Problems
```bash
# Fix Git ownership issue
git config --global --add safe.directory /home/liberta/liberta_Management

# Alternative: Fix directory ownership
chown -R liberta:liberta /home/liberta/liberta_Management
```

### Issue 6: SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --nginx

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔄 Rollback Process

### Quick Rollback to Previous Version
```bash
# Check recent commits
git log --oneline -10

# Rollback to specific commit
git reset --hard COMMIT_HASH

# Force update containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d --force-recreate
```

### Emergency Rollback
```bash
# Stop all containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Rollback code
git reset --hard HEAD~1

# Restart with previous version
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d
```

---

## 📊 Monitoring & Maintenance

### Regular Health Checks
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check Docker resource usage
docker stats --no-stream

# Check application uptime
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps
```

### Weekly Maintenance
```bash
# Clean up Docker resources
docker system prune -f
docker volume prune -f
docker image prune -f

# Update system packages
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
sudo certbot certificates
```

---

## 🔐 Security Updates

### Update Environment Variables
```bash
# Edit production environment
nano .env

# Restart containers to apply changes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart
```

### Rotate API Keys
```bash
# Update backend environment
nano backend/.env

# Restart backend only
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart backend
```

---

## 📞 Emergency Contacts & Resources

### Important Files
- **Main Config**: `.env`
- **Backend Config**: `backend/.env`
- **Frontend Config**: `frontend/.env.local`
- **Docker Compose**: `docker-compose.prod-optimized.yml`
- **Nginx Config**: `/etc/nginx/sites-available/libertaphonix`

### Useful Commands Reference
```bash
# Quick status check
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Quick restart
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart

# Full rebuild
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up --build -d --force-recreate

# Force rebuild (no cache)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Safe cache clear and rebuild (preserves database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
docker system prune -af
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Complete cache clear (⚠️ deletes database)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v
docker system prune -af --volumes
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Emergency stop
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
```

### 🚀 One-Command SAFE Update (Recommended)
```bash
# Safe update with cache clearing (preserves database)
cd /home/liberta/liberta_Management && \
git config --global --add safe.directory /home/liberta/liberta_Management && \
git pull origin main && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down && \
docker system prune -af && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d && \
echo "✅ Safe update complete! Monitoring logs..." && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### 🚀 One-Command COMPLETE Update (⚠️ Deletes Database)
```bash
# Complete update with full cache clearing (⚠️ DELETES DATABASE)
cd /home/liberta/liberta_Management && \
git config --global --add safe.directory /home/liberta/liberta_Management && \
git pull origin main && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down -v --remove-orphans && \
docker system prune -af --volumes && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d && \
echo "⚠️ Complete update finished (database was reset)! Monitoring logs..." && \
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f
```

### Application URLs
- **Production**: https://app.libertadz.shop
- **Admin Login**: contact@libertaphoenix.com / 123456789
- **API Health**: https://app.libertadz.shop/api/health

---

## 📝 Update Log Template

Keep track of your updates:

```
Date: YYYY-MM-DD
Update Type: [Code/Database/Package/Security]
Description: Brief description of changes
Commands Used: 
- git pull origin main
- docker-compose up --build -d
Status: [Success/Failed]
Issues: Any problems encountered
Rollback: [Yes/No] - If yes, describe process
```

---

**💡 Pro Tips:**
- Always test updates in a staging environment first
- Keep backups of your database before major updates
- Monitor logs during and after updates
- Document any custom configurations
- Set up automated monitoring for production health

**🚨 Remember:** Your LibertaPhonix application is running in production. Always be cautious with updates and have a rollback plan ready!