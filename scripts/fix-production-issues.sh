#!/bin/bash

# LibertaPhonix Production Issues Fix Script
# Fixes: 1) Docker containers stopping when exiting PuTTY
#        2) EcoManager API 403 Forbidden errors
#        3) Reduces verbose logging

set -e

echo "� LibertaPhonix Production Issues Fix Script"
echo "=============================================="

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
if [ ! -f "docker-compose.yml" ] || [ ! -f "docker-compose.prod-optimized.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting production issues fix..."

# Issue 1: Fix Docker containers stopping when exiting PuTTY
echo ""
echo "🔧 ISSUE 1: Fixing Docker Container Persistence"
echo "==============================================="

print_status "Stopping all containers..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml down

print_status "Starting containers in proper detached mode..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml up -d --remove-orphans

print_status "Verifying containers are running..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps

print_success "Docker containers are now running in detached mode"

# Issue 2: Check EcoManager API tokens
echo ""
echo "🔧 ISSUE 2: Checking EcoManager API Tokens"
echo "=========================================="

print_status "Checking current API token status..."

# Test database connection first
if docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
    
    print_status "Current API configurations:"
    docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec -T postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT storeIdentifier, storeName, CASE WHEN LENGTH(apiToken) > 0 THEN 'Token Present' ELSE 'No Token' END as token_status FROM \"apiConfigurations\";"
    
    print_warning "If you see 403 Forbidden errors in logs, you need to:"
    echo "  1. Login to EcoManager dashboard for each store"
    echo "  2. Generate new API tokens"
    echo "  3. Update tokens using: docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml exec backend npx prisma studio"
    echo "  4. Restart backend: docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart backend"
else
    print_error "Database connection failed. Please check PostgreSQL container."
fi

# Issue 3: Install screen for session management
echo ""
echo "🔧 ISSUE 3: Installing Screen for Session Management"
echo "=================================================="

if command -v screen &> /dev/null; then
    print_success "Screen is already installed"
else
    print_status "Installing screen..."
    if sudo apt update && sudo apt install screen -y; then
        print_success "Screen installed successfully"
    else
        print_warning "Could not install screen. You may need to run: sudo apt install screen"
    fi
fi

print_status "Screen usage instructions:"
echo "  - Create session: screen -S libertaphonix"
echo "  - Detach safely: Ctrl+A, then D"
echo "  - Reattach: screen -r libertaphonix"
echo "  - List sessions: screen -ls"

# Issue 4: Deploy logging optimizations
echo ""
echo "🔧 ISSUE 4: Deploying Logging Optimizations"
echo "==========================================="

print_status "Restarting backend to apply logging optimizations..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml restart backend

print_success "Backend restarted with optimized logging"

# Final verification
echo ""
echo "🔍 FINAL VERIFICATION"
echo "===================="

print_status "Checking container status..."
RUNNING_CONTAINERS=$(docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml ps --services --filter "status=running" | wc -l)
TOTAL_SERVICES=$(docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml config --services | wc -l)

if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_SERVICES" ]; then
    print_success "All containers are running properly"
else
    print_warning "Some containers may not be running. Check with: docker-compose ps"
fi

print_status "Checking for recent errors in logs..."
docker-compose -f docker-compose.yml -f docker-compose.prod-optimized.yml logs --tail=50 backend | grep -E "(ERROR|403|Forbidden)" || print_success "No recent errors found"

echo ""
echo "✅ PRODUCTION ISSUES FIX COMPLETED"
echo "================================="
print_success "Docker containers are now persistent and will survive SSH disconnections"
print_success "Logging has been optimized to reduce verbosity"
print_warning "If you still see 403 errors, update EcoManager API tokens as instructed above"

echo ""
echo "📋 NEXT STEPS:"
echo "1. Test by exiting SSH and reconnecting - containers should still be running"
echo "2. If 403 errors persist, update API tokens via Prisma Studio"
echo "3. Use screen sessions for safer server management"
echo "4. Monitor logs: docker-compose logs -f backend"

echo ""
print_status "Script completed successfully!"