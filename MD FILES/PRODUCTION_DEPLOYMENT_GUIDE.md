# 🚀 LibertaPhonix Production Deployment Guide

## 📋 Complete Production Deployment for app.libertadz.shop

This comprehensive guide will walk you through deploying the LibertaPhonix Order Management System on your VPS with full security, SSL, and production optimizations.

---

## 🎯 Deployment Overview

- **Domain**: app.libertadz.shop
- **Repository**: https://github.com/sraidytech/liberta_Management.git
- **Server**: VPS with 2 CPU cores (upgradeable), 4GB RAM, 98GB storage
- **Database**: PostgreSQL (same server)
- **SSL**: Let's Encrypt with Nginx reverse proxy
- **Security**: UFW firewall, fail2ban, security hardening

---

## 📋 Pre-Deployment Checklist

### ✅ Server Requirements
- [x] Ubuntu/Debian Linux VPS
- [x] Root access
- [x] Domain pointing to server IP
- [x] 4GB RAM minimum
- [x] 20GB+ storage available

### ✅ Required Information
- [x] Domain: app.libertadz.shop
- [x] Admin credentials: contact@libertaphoenix.com / Liberta@2025Sracom
- [x] EcoManager configs: From seed files
- [x] Maystro API keys: From env files

---

## 🔧 Step 1: Initial Server Setup

### 1.1 Update System
```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.2 Create Deployment User
```bash
# Create a dedicated user for the application
sudo adduser liberta
sudo usermod -aG sudo liberta
sudo usermod -aG docker liberta

# Switch to the new user
su - liberta
```

### 1.3 Configure SSH (Optional but Recommended)
```bash
# Generate SSH key for the liberta user
ssh-keygen -t rsa -b 4096 -C "liberta@app.libertadz.shop"

# Add your public key to authorized_keys for secure access
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
```

---

## 🐳 Step 2: Install Docker & Docker Compose

### 2.1 Install Docker
```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER
```

### 2.2 Install Docker Compose
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2.3 Logout and Login
```bash
# Logout and login again to apply group changes
exit
su - liberta
```

---

## 🌐 Step 3: Install and Configure Nginx

### 3.1 Install Nginx
```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.2 Configure Nginx for LibertaPhonix
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/libertaphonix
```

**Copy and paste this content into the file:**
```nginx
server {
    listen 80;
    server_name app.libertadz.shop;

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporary configuration for initial setup
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

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/libertaphonix /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 4: Configure Firewall (UFW)

### 4.1 Setup UFW Firewall
```bash
# Reset UFW to defaults
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if you changed it)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Docker internal communication
sudo ufw allow from 172.16.0.0/12
sudo ufw allow from 192.168.0.0/16

# Enable UFW
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

### 4.2 Install and Configure Fail2Ban
```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create custom configuration
sudo nano /etc/fail2ban/jail.local
```

**Copy and paste this content into the file:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
# Start and enable fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 📁 Step 5: Clone and Setup Application

### 5.1 Clone Repository
```bash
# Navigate to home directory
cd /home/liberta

# Clone the repository
git clone https://github.com/sraidytech/liberta_Management.git
cd liberta_Management

# Check current branch and files
git branch
ls -la
```

### 5.2 Create Production Environment File
```bash
# Create production environment file
cp .env.production.example .env

# Edit the environment file with production values
nano .env
```

**Replace the entire content with this:**
```env
# ===========================================
# LibertaPhonix Production Environment
# ===========================================

# Database Configuration
POSTGRES_USER=libertaphonix_prod
POSTGRES_PASSWORD=LibertaPhonix2025SecureDB!
POSTGRES_DB=libertaphonix_production

# Application Environment
NODE_ENV=production

# Database URLs
DATABASE_URL=postgresql://libertaphonix_prod:LibertaPhonix2025SecureDB!@postgres:5432/libertaphonix_production?schema=public

# Redis Configuration
REDIS_URL=redis://redis:6379

# Authentication & Security (GENERATE NEW SECRETS)
JWT_SECRET=LibertaPhonix2025SuperSecureJWTSecretKeyForProductionUseOnly123456789
NEXTAUTH_SECRET=LibertaPhonix2025NextAuthSecret
NEXTAUTH_URL=https://app.libertadz.shop

# CORS Configuration
CORS_ORIGIN=https://app.libertadz.shop

# API Configuration
NEXT_PUBLIC_API_URL=https://app.libertadz.shop
BACKEND_INTERNAL_URL=http://backend:5000

# Rate Limiting (stricter for production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Webhook Secrets (configure with your actual values)
ECOMANAGER_WEBHOOK_SECRET=your_production_ecomanager_webhook_secret
MAYSTRO_WEBHOOK_SECRET=your_production_maystro_webhook_secret

# Maystro API Configuration (configure with your actual keys)
MAYSTRO_API_KEY=33ab96ca7b3b640a82793f252cded720b1788c09
MAYSTRO_API_KEY_1=33ab96ca7b3b640a82793f252cded720b1788c09
MAYSTRO_API_KEY_2=your_client_b_production_api_key
MAYSTRO_API_KEY_3=your_backup_production_api_key

# Production API Key Names
MAYSTRO_API_KEY_1_NAME=Client A - Production
MAYSTRO_API_KEY_2_NAME=Client B - Production
MAYSTRO_API_KEY_3_NAME=Backup Production Key

# Production Base URLs
MAYSTRO_BASE_URL=https://backend.maystro-delivery.com

# Server Configuration
PORT=5000
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

### 5.3 Create Optimized Docker Compose Override
```bash
# Create optimized production override for your server
nano docker-compose.prod-optimized.yml
```

**Copy and paste this content into the file:**
```yaml
# Optimized Production Docker Compose Override for 2-CPU VPS
# Use with: docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

services:
  postgres:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M  # Reduced for 2-CPU server
          cpus: '0.5'
    command: >
      postgres
      -c shared_buffers=128MB
      -c max_connections=50
      -c effective_cache_size=256MB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100

  redis:
    volumes:
      - redis_prod_data:/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    command: >
      redis-server
      --maxmemory 200mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000

  backend:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - PORT=${PORT}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS}
      - ECOMANAGER_WEBHOOK_SECRET=${ECOMANAGER_WEBHOOK_SECRET}
      - MAYSTRO_WEBHOOK_SECRET=${MAYSTRO_WEBHOOK_SECRET}
      - MAYSTRO_API_KEY=${MAYSTRO_API_KEY}
      - MAYSTRO_API_KEY_1=${MAYSTRO_API_KEY_1}
      - MAYSTRO_API_KEY_2=${MAYSTRO_API_KEY_2}
      - MAYSTRO_API_KEY_3=${MAYSTRO_API_KEY_3}
      - MAYSTRO_BASE_URL=${MAYSTRO_BASE_URL}
    volumes:
      - ./backend:/app:ro
      - /app/node_modules
    restart: always
    command: ["npm", "run", "start"]
    deploy:
      resources:
        limits:
          memory: 768M  # Reduced for 2-CPU server
          cpus: '0.75'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    environment:
      - NODE_ENV=production
      - BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./frontend:/app:ro
      - /app/node_modules
      - /app/.next
    restart: always
    command: ["npm", "run", "start"]
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_prod_data:
    driver: local
  redis_prod_data:
    driver: local
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

---

## 🚀 Step 6: Build and Deploy Application

### 6.1 Build Docker Images
```bash
# Build the application images
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build

# This may take 10-15 minutes depending on your server
```

### 6.2 Start the Application
```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Check if all containers are running
docker-compose ps

# Check logs if needed
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 6.3 Initialize Database
```bash
# Run database migrations
docker-compose exec backend npm run db:migrate

# Seed the database with initial data
docker-compose exec backend npm run db:seed

# Verify database is working
docker-compose exec backend npm run db:studio
```

---

## 🔐 Step 7: SSL Certificate with Let's Encrypt

### 7.1 Install Certbot
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
sudo systemctl stop nginx
```

### 7.2 Obtain SSL Certificate
```bash
# Get SSL certificate for your domain
sudo certbot certonly --standalone -d app.libertadz.shop

# Follow the prompts and provide your email
```

### 7.3 Update Nginx Configuration for HTTPS
```bash
# Update Nginx configuration with SSL
sudo nano /etc/nginx/sites-available/libertaphonix
```

**Replace the entire content with this:**
```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name app.libertadz.shop;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name app.libertadz.shop;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.libertadz.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.libertadz.shop/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

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

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl start nginx
sudo systemctl reload nginx
```

### 7.4 Setup SSL Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

**Add this line to the crontab:**
```
0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

**Save and exit the crontab editor**

---

## 📊 Step 8: Monitoring and Maintenance

### 8.1 Create Monitoring Scripts
```bash
# Create monitoring directory
mkdir -p ~/scripts

# System monitoring script
nano ~/scripts/monitor.sh
```

**Copy and paste this content into the file:**
```bash
#!/bin/bash
echo "=== LibertaPhonix System Status ==="
echo "Date: $(date)"
echo ""

echo "=== Docker Containers ==="
docker-compose ps

echo ""
echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}'

echo ""
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h /

echo ""
echo "=== Application Health ==="
echo "Backend Health:"
curl -s http://localhost:5000/health | jq . || echo "Backend not responding"

echo ""
echo "Frontend Health:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend not responding"

echo ""
echo "=== Recent Logs ==="
echo "Backend errors (last 10):"
docker-compose logs --tail=10 backend | grep -i error || echo "No recent errors"
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
chmod +x ~/scripts/monitor.sh
```

### 8.2 Create Backup Script
```bash
# Database backup script
nano ~/scripts/backup.sh
```

**Copy and paste this content into the file:**
```bash
#!/bin/bash
BACKUP_DIR="/home/liberta/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U libertaphonix_prod libertaphonix_production > $BACKUP_DIR/db_backup_$DATE.sql

# Backup environment files
cp .env $BACKUP_DIR/env_backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
chmod +x ~/scripts/backup.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/liberta/scripts/backup.sh") | crontab -
```

### 8.3 Create Update Script
```bash
# Application update script
nano ~/scripts/update.sh
```

**Copy and paste this content into the file:**
```bash
#!/bin/bash
echo "=== LibertaPhonix Update Process ==="

# Backup before update
./backup.sh

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Run migrations
docker-compose exec backend npm run db:migrate

echo "Update completed!"
```

**Save and exit nano (Ctrl+X, then Y, then Enter)**

```bash
chmod +x ~/scripts/update.sh
```

---

## ✅ Step 9: Verification and Testing

### 9.1 Test Application Access
```bash
# Test HTTPS access
curl -I https://app.libertadz.shop

# Test API health
curl https://app.libertadz.shop/api/v1/health

# Check all containers are running
docker-compose ps
```

### 9.2 Test Admin Login
1. Open browser and go to: https://app.libertadz.shop
2. Login with:
   - Email: contact@libertaphoenix.com
   - Password: Liberta@2025Sracom

### 9.3 Performance Testing
```bash
# Run monitoring script
~/scripts/monitor.sh

# Check resource usage
docker stats

# Test database connection
docker-compose exec backend npm run db:studio
```

---

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Containers Not Starting
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory usage
free -h

# Restart services
docker-compose restart
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT version();"

# Reset database if needed
docker-compose down
docker volume rm liberta_management_postgres_prod_data
docker-compose up -d
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

#### 4. Performance Issues (2 CPU cores)
```bash
# Monitor resource usage
htop

# Check container resource limits
docker stats

# Optimize if needed - reduce memory limits further
# Edit docker-compose.prod-optimized.yml
```

---

## 🔧 CPU Upgrade Instructions

### When You Upgrade CPU Cores

1. **Contact VPS Provider**: Request 4-6 CPU cores
2. **Verify Upgrade**: 
   ```bash
   lscpu | grep "On-line CPU"
   ```
3. **Update Docker Compose**:
   ```bash
   # Edit docker-compose.prod-optimized.yml
   nano docker-compose.prod-optimized.yml
   ```
   **Update CPU limits to:**
   ```yaml
   postgres: cpus: '1.0'
   backend: cpus: '2.0'  
   frontend: cpus: '1.0'
   redis: cpus: '0.5'
   ```
4. **Restart Services**:
   ```bash
   docker-compose restart
   ```

---

## 📞 Support and Maintenance

### Daily Maintenance
- Check `~/scripts/monitor.sh` output
- Review application logs
- Monitor disk space and memory usage

### Weekly Maintenance
- Review backup files
- Check SSL certificate expiry
- Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly Maintenance
- Review security logs
- Update Docker images
- Performance optimization review

---

## 🎉 Deployment Complete!

Your LibertaPhonix Order Management System is now deployed and running at:
**https://app.libertadz.shop**

### Admin Access:
- **URL**: https://app.libertadz.shop
- **Email**: contact@libertaphoenix.com
- **Password**: Liberta@2025Sracom

### Key Features Enabled:
- ✅ Full SSL encryption
- ✅ Firewall protection
- ✅ Automated backups
- ✅ Health monitoring
- ✅ Auto-renewal SSL certificates
- ✅ Production-optimized configuration
- ✅ Real-time WebSocket support
- ✅ Complete order management system

**Note**: Monitor performance closely with 2 CPU cores. Upgrade to 4-6 cores for optimal performance when possible.

---

*Deployment guide created for LibertaPhonix v1.0 - Production Ready*