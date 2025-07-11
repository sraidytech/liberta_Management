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

### Issue 1: Containers Won't Start
```bash
# Check Docker system status
docker system df
docker system prune -f

# Remove old images
docker image prune -f

# Restart Docker daemon (if needed)
sudo systemctl restart docker
```

### Issue 2: Database Connection Issues
```bash
# Check database container
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs postgres

# Reset database connection
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart postgres backend
```

### Issue 3: Migration Conflicts
```bash
# Check migration status
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma migrate status

# Reset migrations (CAUTION: Data loss)
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma migrate reset --force
```

### Issue 4: SSL Certificate Issues
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

# Emergency stop
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
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