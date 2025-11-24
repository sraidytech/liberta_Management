# 🚨 Nginx Timeout Fix for Fetch All Orders

## The Problem
Your "Fetch All Orders" works in localhost but hangs on the server because:
- **Nginx proxy timeout**: 300 seconds (5 minutes)
- **Fetching all orders takes**: 10-30 minutes
- **Server kills the request** after 5 minutes

## Quick Fix Commands

Run these commands on your server to fix the Nginx timeout:

### 1. Update Nginx Configuration
```bash
# Edit the Nginx configuration
sudo nano /etc/nginx/sites-available/libertaphonix
```

### 2. Find and Replace These Lines

**Find this section:**
```nginx
# API routes
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

**Replace with:**
```nginx
# API routes
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 1800s;        # Increased from 300s to 1800s (30 minutes)
    proxy_connect_timeout 300s;      # Increased from 75s to 300s (5 minutes)
    proxy_send_timeout 1800s;        # Added 30 minutes send timeout
    client_max_body_size 100M;       # Added to handle large responses
}
```

### 3. Test and Reload Nginx
```bash
# Test the configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### 4. Also Update Frontend Routes (Optional)
**Find this section:**
```nginx
# Frontend routes
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

**Replace with:**
```nginx
# Frontend routes
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 1800s;        # Increased to 30 minutes
    proxy_connect_timeout 300s;      # Increased to 5 minutes
    proxy_send_timeout 1800s;        # Added 30 minutes send timeout
}
```

## Alternative: Quick One-Command Fix

If you want to do it quickly with sed commands:

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/libertaphonix /etc/nginx/sites-available/libertaphonix.backup.$(date +%Y%m%d_%H%M%S)

# Update API timeout
sudo sed -i 's/proxy_read_timeout 300s;/proxy_read_timeout 1800s;/g' /etc/nginx/sites-available/libertaphonix
sudo sed -i 's/proxy_connect_timeout 75s;/proxy_connect_timeout 300s;/g' /etc/nginx/sites-available/libertaphonix

# Add missing directives after proxy_connect_timeout lines
sudo sed -i '/proxy_connect_timeout 300s;/a\        proxy_send_timeout 1800s;\n        client_max_body_size 100M;' /etc/nginx/sites-available/libertaphonix

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## Step-by-Step Guide Based on Your Setup

Based on your `PRODUCTION_DEPLOYMENT_GUIDE.md`, here's the exact process:

### Step 1: Fix Git Issue First
```bash
# Navigate to your project directory
cd /home/liberta/liberta_Management

# Fix the git conflict (from IMMEDIATE_SERVER_FIX_COMMANDS.md)
git add docker-compose.prod-optimized.yml
git reset --hard HEAD
git pull origin main
```

### Step 2: Deploy Database Connection Fixes
```bash
# Make the deployment script executable
chmod +x scripts/deploy-connection-fixes.sh

# Run the deployment (this will fix the "too many clients" issue)
./scripts/deploy-connection-fixes.sh
```

### Step 3: Fix Nginx Timeout (for Fetch All Orders)
```bash
# Quick one-command fix for Nginx timeout
sudo cp /etc/nginx/sites-available/libertaphonix /etc/nginx/sites-available/libertaphonix.backup.$(date +%Y%m%d_%H%M%S)
sudo sed -i 's/proxy_read_timeout 300s;/proxy_read_timeout 1800s;/g' /etc/nginx/sites-available/libertaphonix
sudo sed -i 's/proxy_connect_timeout 75s;/proxy_connect_timeout 300s;/g' /etc/nginx/sites-available/libertaphonix
sudo sed -i '/proxy_connect_timeout 300s;/a\        proxy_send_timeout 1800s;\n        client_max_body_size 100M;' /etc/nginx/sites-available/libertaphonix
sudo nginx -t && sudo systemctl reload nginx
```

### Step 4: Verify Everything Works
```bash
# Check containers are running
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Check database connections
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT count(*) FROM pg_stat_activity;"

# Test the application
curl -I https://app.libertadz.shop/api/v1/health
```

## Verification

After making the changes:

```bash
# Check if Nginx reloaded successfully
sudo systemctl status nginx

# Test the configuration
sudo nginx -t

# Check the updated configuration
grep -A 15 "location /api/" /etc/nginx/sites-available/libertaphonix
```

## Test Fetch All Orders

Now try "Fetch All Orders" again - it should work without hanging!

## What This Fix Does

- **proxy_read_timeout**: 300s → 1800s (30 minutes)
- **proxy_connect_timeout**: 75s → 300s (5 minutes)  
- **proxy_send_timeout**: Added 1800s (30 minutes)
- **client_max_body_size**: Added 100M for large responses

This gives your fetch operation enough time to complete without Nginx killing the connection.