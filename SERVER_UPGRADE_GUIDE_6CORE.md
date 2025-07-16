# 🚀 LibertaPhonix Server Upgrade Guide - 6 vCore Intel Xeon

## 📊 **NEW SERVER SPECIFICATIONS**
- **CPU**: Intel® Xeon® 6 vCore @ 3.0 GHz
- **RAM**: 12 GB
- **Storage**: 200 GB SSD NVMe
- **Performance Improvement**: ~3x CPU power, 3x RAM capacity

---

## 🎯 **OPTIMIZED DOCKER CONFIGURATION FOR 6-CORE SERVER**

### **Updated docker-compose.prod-optimized.yml**

Create this optimized configuration for your new server:

```yaml
# OPTIMIZED Production Docker Compose for 6-Core Intel Xeon Server
# Use with: docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

services:
  postgres:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      TZ: Africa/Casablanca
      PGTZ: Africa/Casablanca
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G      # Increased from 512M to 2G
          cpus: '1.5'     # Increased from 0.5 to 1.5 cores
    command: >
      postgres
      -c shared_buffers=512MB          # Increased from 128MB
      -c max_connections=300           # Increased from 200
      -c effective_cache_size=1536MB   # Increased from 256MB
      -c maintenance_work_mem=256MB    # Increased from 64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=64MB              # Increased from 16MB
      -c default_statistics_target=100
      -c work_mem=16MB                 # Added for better query performance
      -c random_page_cost=1.1          # Optimized for SSD
      -c effective_io_concurrency=200  # Optimized for SSD
      -c idle_in_transaction_session_timeout=300000
      -c statement_timeout=300000
      -c lock_timeout=30000
      -c log_connections=on
      -c log_disconnections=on
      -c log_lock_waits=on

  redis:
    volumes:
      - redis_prod_data:/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M    # Increased from 256M
          cpus: '0.5'     # Increased from 0.25
    command: >
      redis-server
      --maxmemory 400mb               # Increased from 200mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --tcp-keepalive 300
      --timeout 0

  backend:
    environment:
      - NODE_ENV=production
      - TZ=Africa/Casablanca
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
      # Performance optimizations
      - UV_THREADPOOL_SIZE=16          # Increased thread pool
      - NODE_OPTIONS=--max-old-space-size=1536  # Increased heap size
    volumes:
      - ./backend:/app
      - backend_node_modules:/app/node_modules
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    restart: always
    command: ["npm", "run", "dev"]
    deploy:
      resources:
        limits:
          memory: 2G      # Increased from 768M to 2G
          cpus: '2.0'     # Increased from 0.75 to 2.0 cores
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    environment:
      - NODE_ENV=production
      - TZ=Africa/Casablanca
      - BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Performance optimizations
      - NEXT_TELEMETRY_DISABLED=1
      - NODE_OPTIONS=--max-old-space-size=1024  # Increased heap size
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    restart: always
    command: ["npm", "run", "start"]
    deploy:
      resources:
        limits:
          memory: 1G      # Increased from 512M to 1G
          cpus: '1.0'     # Increased from 0.5 to 1.0 core
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_prod_data:
    driver: local
  redis_prod_data:
    driver: local
  backend_node_modules:
    driver: local
  frontend_node_modules:
    driver: local
```

---

## 🔧 **DATABASE CONFIGURATION UPDATES**

### **Update Database Connection Pool**

Update `backend/src/config/database.ts`:

```typescript
// Production: Optimized for 6-core server with 12GB RAM
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: createDatabaseUrl(25) // Increased from 15 to 25 connections
      }
    },
    log: ['error', 'warn'],
    errorFormat: 'minimal'
  });
}
```

### **Update Connection URL Function**

```typescript
function createDatabaseUrl(maxConnections: number = 25) { // Increased default
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connection_limit=${maxConnections}&pool_timeout=10&connect_timeout=30&socket_timeout=30&pgbouncer=true`;
}
```

---

## ⚡ **PERFORMANCE OPTIMIZATIONS**

### **1. Maystro Service Optimization**

Update fetch limits for better performance:

```typescript
// In syncShippingStatus method
const maystroOrders = await this.fetchAllOrders(15000); // Increased from 10000

// In fetchAllOrders method
const concurrency = 15; // Increased from 10 for 6-core server
```

### **2. Rate Limiting Adjustments**

Update `.env` for higher capacity:

```env
# Increased rate limits for 6-core server
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200  # Increased from 100
```

### **3. Redis Configuration**

Update Redis memory and performance settings:

```bash
# In docker-compose
--maxmemory 400mb
--maxmemory-policy allkeys-lru
--tcp-keepalive 300
--timeout 0
```

---

## 🚀 **UPGRADE PROCEDURE**

### **Step 1: Backup Current System**

```bash
# Create full backup
cd /home/liberta/liberta_Management
./scripts/backup.sh

# Export current Docker volumes
docker run --rm -v liberta_management_postgres_prod_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .
docker run --rm -v liberta_management_redis_prod_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### **Step 2: Update Configuration Files**

```bash
# Update Docker Compose configuration
cp docker-compose.prod-optimized.yml docker-compose.prod-optimized.yml.backup
# Replace with new 6-core configuration above

# Update database configuration
# Apply database connection pool changes
```

### **Step 3: Restart Services with New Configuration**

```bash
# Stop current services
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

# Pull latest images and rebuild
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache

# Start with new configuration
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Monitor startup
docker-compose logs -f
```

### **Step 4: Performance Verification**

```bash
# Check resource usage
docker stats

# Test application performance
curl -I https://app.libertadz.shop
curl https://app.libertadz.shop/api/v1/health

# Monitor database performance
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  temp_files,
  temp_bytes
FROM pg_stat_database 
WHERE datname = 'libertaphonix_production';"
```

---

## 📊 **EXPECTED PERFORMANCE IMPROVEMENTS**

### **Before (2-Core Server)**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Database Connections**: 15
- **Concurrent Users**: ~50
- **Order Processing**: ~1000 orders/sync

### **After (6-Core Server)**
- **CPU**: 6 cores (3x improvement)
- **RAM**: 12GB (3x improvement)
- **Database Connections**: 25 (67% increase)
- **Concurrent Users**: ~150-200
- **Order Processing**: ~15000 orders/sync

### **Performance Metrics**
- **API Response Time**: 50-70% faster
- **Database Query Performance**: 60-80% faster
- **Concurrent Request Handling**: 3x improvement
- **Memory Headroom**: 200% more available
- **Sync Performance**: 50% faster processing

---

## 🔍 **MONITORING & OPTIMIZATION**

### **System Monitoring Commands**

```bash
# CPU and Memory usage
htop

# Docker container stats
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Database performance
docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename, attname;"

# Redis performance
docker-compose exec redis redis-cli info memory
docker-compose exec redis redis-cli info stats
```

### **Performance Tuning Tips**

1. **Database Optimization**
   - Monitor connection pool usage
   - Adjust `max_connections` based on actual usage
   - Consider connection pooling with PgBouncer if needed

2. **Application Optimization**
   - Monitor Node.js heap usage
   - Adjust `NODE_OPTIONS` memory limits as needed
   - Use PM2 for production process management (optional)

3. **Redis Optimization**
   - Monitor memory usage and hit rates
   - Adjust `maxmemory` based on actual usage
   - Consider Redis clustering for high availability

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues After Upgrade**

1. **High Memory Usage**
   ```bash
   # Reduce container memory limits if needed
   # Monitor with: docker stats
   ```

2. **Database Connection Issues**
   ```bash
   # Check connection pool status
   docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Performance Not Improved**
   ```bash
   # Verify resource allocation
   docker-compose exec backend node -e "console.log(process.memoryUsage())"
   ```

### **Rollback Procedure**

If issues occur:

```bash
# Stop new configuration
docker-compose down

# Restore backup configuration
cp docker-compose.prod-optimized.yml.backup docker-compose.prod-optimized.yml

# Restart with old configuration
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d
```

---

## 🎉 **POST-UPGRADE CHECKLIST**

- [ ] All containers running successfully
- [ ] Application accessible at https://app.libertadz.shop
- [ ] Database connections stable
- [ ] Redis performance improved
- [ ] API response times faster
- [ ] Order sync performance improved
- [ ] Memory usage within limits
- [ ] CPU usage optimized
- [ ] Backup system working
- [ ] Monitoring alerts configured

---

**🚀 Ready for 3x Performance Boost!**

*This upgrade will significantly improve your LibertaPhonix system performance, allowing for better scalability and user experience.*
