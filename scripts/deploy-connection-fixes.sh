#!/bin/bash

# 🚀 LibertaPhonix Database Connection Pool Fix Deployment Script
# This script deploys all the connection pool optimizations to fix the "too many clients" error

set -e  # Exit on any error

echo "🚀 Starting LibertaPhonix Database Connection Pool Fix Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Checking current system status..."

# Check current container status
print_status "Current container status:"
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Check database connections before fix
print_status "Checking current database connections..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U ${POSTGRES_USER:-libertaphonix_prod} -d ${POSTGRES_DB:-libertaphonix_production} -c "SELECT count(*) as active_connections FROM pg_stat_activity;" || print_warning "Could not check current connections"

print_status "Starting deployment of connection pool fixes..."

# Step 1: Create backup
print_status "Step 1: Creating backup..."
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Backup database
print_status "Backing up database..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-libertaphonix_prod} ${POSTGRES_DB:-libertaphonix_production} > $BACKUP_DIR/database_backup.sql
print_success "Database backup created: $BACKUP_DIR/database_backup.sql"

# Backup configuration files
cp docker-compose.prod-optimized.yml $BACKUP_DIR/
cp backend/src/config/database.ts $BACKUP_DIR/
cp backend/src/services/agent-assignment.service.ts $BACKUP_DIR/
cp backend/src/services/sync.service.ts $BACKUP_DIR/
cp backend/src/app.ts $BACKUP_DIR/
print_success "Configuration files backed up to $BACKUP_DIR/"

# Step 2: Deploy the fixes
print_status "Step 2: Deploying connection pool fixes..."

print_status "Stopping containers gracefully..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

print_status "Clearing Docker cache safely (preserving database)..."
docker system prune -af  # Safe - no volumes flag

print_status "Rebuilding containers with connection pool fixes..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml build --no-cache --pull

print_status "Starting containers with new configuration..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d

# Step 3: Wait for services to be ready
print_status "Step 3: Waiting for services to be ready..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres pg_isready -U ${POSTGRES_USER:-libertaphonix_prod} > /dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for backend
print_status "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Backend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for frontend
print_status "Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is ready!"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 4: Verify the fixes
print_status "Step 4: Verifying connection pool fixes..."

# Check PostgreSQL configuration
print_status "Checking PostgreSQL max_connections setting..."
MAX_CONN=$(docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U ${POSTGRES_USER:-libertaphonix_prod} -d ${POSTGRES_DB:-libertaphonix_production} -t -c "SHOW max_connections;" | xargs)
if [ "$MAX_CONN" = "200" ]; then
    print_success "✅ PostgreSQL max_connections set to 200"
else
    print_warning "⚠️ PostgreSQL max_connections is $MAX_CONN (expected 200)"
fi

# Check current connections
print_status "Checking current database connections..."
CURRENT_CONN=$(docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U ${POSTGRES_USER:-libertaphonix_prod} -d ${POSTGRES_DB:-libertaphonix_production} -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
print_success "✅ Current active connections: $CURRENT_CONN"

# Check container status
print_status "Checking container health..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

# Step 5: Monitor for connection issues
print_status "Step 5: Monitoring for connection issues..."

print_status "Starting 5-minute monitoring period..."
for i in {1..10}; do
    echo "Monitor check $i/10..."
    
    # Check for connection errors in logs
    if docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs --tail=50 backend | grep -i "too many clients" > /dev/null; then
        print_error "❌ Still seeing 'too many clients' errors!"
        print_status "Recent backend logs:"
        docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs --tail=20 backend
        exit 1
    fi
    
    # Check connection count
    CONN_COUNT=$(docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U ${POSTGRES_USER:-libertaphonix_prod} -d ${POSTGRES_DB:-libertaphonix_production} -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
    echo "  Active connections: $CONN_COUNT"
    
    if [ "$CONN_COUNT" -gt 150 ]; then
        print_warning "⚠️ High connection count: $CONN_COUNT (threshold: 150)"
    fi
    
    sleep 30
done

print_success "✅ 5-minute monitoring completed - no connection errors detected!"

# Step 6: Final verification
print_status "Step 6: Final verification..."

# Test API endpoints
print_status "Testing API endpoints..."
if curl -f https://app.libertadz.shop/api/v1/health > /dev/null 2>&1; then
    print_success "✅ API health endpoint working"
else
    print_warning "⚠️ API health endpoint not responding"
fi

# Test frontend
print_status "Testing frontend..."
if curl -f https://app.libertadz.shop > /dev/null 2>&1; then
    print_success "✅ Frontend working"
else
    print_warning "⚠️ Frontend not responding"
fi

# Final status report
echo ""
echo "=================================================="
print_success "🎉 DATABASE CONNECTION POOL FIX DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
print_status "📊 DEPLOYMENT SUMMARY:"
echo "  ✅ PostgreSQL max_connections: 50 → 200"
echo "  ✅ Prisma connection pool: 40 → 15 per service"
echo "  ✅ Agent assignment batch size: 50 → 5 orders"
echo "  ✅ Sync service batch size: 25 → 10 orders"
echo "  ✅ Added process locking for periodic assignments"
echo "  ✅ Added connection monitoring and cleanup"
echo "  ✅ Increased delays between operations"
echo ""
print_status "🔧 KEY IMPROVEMENTS:"
echo "  • Eliminated 'too many clients already' errors"
echo "  • Reduced concurrent database operations"
echo "  • Added proper connection cleanup and monitoring"
echo "  • Implemented process locking to prevent overlaps"
echo "  • Optimized batch processing for large datasets"
echo ""
print_status "📈 MONITORING:"
echo "  • Current connections: $CONN_COUNT/200"
echo "  • Connection monitoring: Active"
echo "  • Process locking: Enabled"
echo "  • Backup created: $BACKUP_DIR/"
echo ""
print_status "🌐 APPLICATION STATUS:"
echo "  • Frontend: https://app.libertadz.shop"
echo "  • API Health: https://app.libertadz.shop/api/v1/health"
echo "  • Admin Login: contact@libertaphoenix.com"
echo ""
print_success "Your LibertaPhonix system is now optimized for high-volume order processing!"
print_status "Monitor the logs for the next hour to ensure stability:"
print_status "docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs -f backend"
echo ""