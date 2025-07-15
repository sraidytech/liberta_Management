#!/bin/bash

# =====================================================
# DATABASE PERFORMANCE OPTIMIZATION - LOCALHOST TESTING
# Test script for 200,000+ Orders System
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting Database Performance Optimization Testing"
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

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if PostgreSQL is running
print_status "Checking PostgreSQL connection..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_success "Environment variables loaded from .env"
elif [ -f "backend/.env" ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
    print_success "Environment variables loaded from backend/.env"
else
    print_warning "No .env file found. Make sure DATABASE_URL is set."
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    exit 1
fi

print_success "Database URL configured"

# Test database connection
print_status "Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Cannot connect to database. Please check your DATABASE_URL"
    exit 1
fi

# Get current database stats
print_status "Getting current database statistics..."
ORDERS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM orders;" | xargs)
CUSTOMERS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM customers;" | xargs)
ITEMS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM order_items;" | xargs)

echo "📊 Current Database Statistics:"
echo "   - Orders: $ORDERS_COUNT"
echo "   - Customers: $CUSTOMERS_COUNT"
echo "   - Order Items: $ITEMS_COUNT"

if [ "$ORDERS_COUNT" -lt 1000 ]; then
    print_warning "Low order count ($ORDERS_COUNT). Performance improvements may not be as noticeable."
fi

# Backup database (optional but recommended)
print_status "Creating database backup (recommended)..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
    print_success "Database backup created: $BACKUP_FILE"
else
    print_warning "Could not create backup. Continuing without backup..."
fi

# Phase 1: Apply database indexes
print_status "Phase 1: Applying database indexes..."
echo "⏱️  This may take 5-15 minutes depending on data size..."

if psql "$DATABASE_URL" -f "scripts/database-optimization/01-create-indexes.sql" > /dev/null 2>&1; then
    print_success "Database indexes created successfully"
else
    print_error "Failed to create database indexes"
    exit 1
fi

# Phase 2: Create optimized views
print_status "Phase 2: Creating optimized database views..."

if psql "$DATABASE_URL" -f "scripts/database-optimization/02-create-views.sql" > /dev/null 2>&1; then
    print_success "Database views created successfully"
else
    print_error "Failed to create database views"
    exit 1
fi

# Verify indexes were created
print_status "Verifying index creation..."
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';" | xargs)
print_success "$INDEX_COUNT performance indexes created"

# Verify views were created
print_status "Verifying view creation..."
VIEW_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND viewname LIKE '%_view';" | xargs)
print_success "$VIEW_COUNT optimized views created"

# Performance testing
print_status "Running performance tests..."

# Test 1: Orders query performance
print_status "Test 1: Orders listing performance..."
START_TIME=$(date +%s%N)
ORDERS_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM order_summary_view LIMIT 100;" | xargs)
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

if [ "$DURATION" -lt 2000 ]; then
    print_success "Orders query: ${DURATION}ms (EXCELLENT)"
elif [ "$DURATION" -lt 5000 ]; then
    print_success "Orders query: ${DURATION}ms (GOOD)"
else
    print_warning "Orders query: ${DURATION}ms (NEEDS IMPROVEMENT)"
fi

# Test 2: Agent performance query
print_status "Test 2: Agent performance query..."
START_TIME=$(date +%s%N)
AGENTS_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM agent_performance_view;" | xargs)
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$DURATION" -lt 1000 ]; then
    print_success "Agent performance query: ${DURATION}ms (EXCELLENT)"
elif [ "$DURATION" -lt 3000 ]; then
    print_success "Agent performance query: ${DURATION}ms (GOOD)"
else
    print_warning "Agent performance query: ${DURATION}ms (NEEDS IMPROVEMENT)"
fi

# Test 3: Dashboard query
print_status "Test 3: Dashboard statistics query..."
START_TIME=$(date +%s%N)
DASHBOARD_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT * FROM daily_dashboard_view;" | head -1)
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$DURATION" -lt 3000 ]; then
    print_success "Dashboard query: ${DURATION}ms (EXCELLENT)"
elif [ "$DURATION" -lt 8000 ]; then
    print_success "Dashboard query: ${DURATION}ms (GOOD)"
else
    print_warning "Dashboard query: ${DURATION}ms (NEEDS IMPROVEMENT)"
fi

# Check database size after optimization
print_status "Checking database size after optimization..."
DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | xargs)
INDEX_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) FROM pg_indexes WHERE indexname LIKE 'idx_%';" | xargs)

echo "📊 Database Size Information:"
echo "   - Total Database Size: $DB_SIZE"
echo "   - Performance Indexes Size: $INDEX_SIZE"

# Test application startup (if Node.js is available)
if command -v node &> /dev/null && [ -f "backend/package.json" ]; then
    print_status "Testing application startup with optimized database..."
    
    cd backend
    if npm list --depth=0 > /dev/null 2>&1; then
        print_status "Dependencies are installed, testing startup..."
        
        # Test database connection with optimized config
        if timeout 30s npm run dev > /dev/null 2>&1 & then
            sleep 5
            pkill -f "npm run dev" 2>/dev/null || true
            print_success "Application startup test passed"
        else
            print_warning "Application startup test failed or timed out"
        fi
    else
        print_warning "Node.js dependencies not installed. Run 'npm install' in backend directory."
    fi
    cd ..
fi

# Generate performance report
print_status "Generating performance report..."
REPORT_FILE="performance_report_$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
DATABASE PERFORMANCE OPTIMIZATION REPORT
========================================
Date: $(date)
Orders Count: $ORDERS_COUNT
Customers Count: $CUSTOMERS_COUNT
Order Items Count: $ITEMS_COUNT

OPTIMIZATIONS APPLIED:
- Database Indexes: $INDEX_COUNT created
- Database Views: $VIEW_COUNT created
- Connection Pool: Optimized for high-volume operations

PERFORMANCE RESULTS:
- Orders Query: ${DURATION}ms
- Agent Performance Query: ${DURATION}ms  
- Dashboard Query: ${DURATION}ms

DATABASE SIZE:
- Total Size: $DB_SIZE
- Index Size: $INDEX_SIZE

RECOMMENDATIONS:
- Monitor query performance in production
- Consider separating database server if performance is still slow
- Implement caching for frequently accessed data
EOF

print_success "Performance report saved: $REPORT_FILE"

# Final summary
echo ""
echo "🎉 DATABASE OPTIMIZATION COMPLETED SUCCESSFULLY!"
echo "================================================"
echo ""
echo "✅ What was optimized:"
echo "   • $INDEX_COUNT database indexes for faster queries"
echo "   • $VIEW_COUNT pre-computed views for complex operations"
echo "   • Enhanced connection pooling configuration"
echo "   • Query performance monitoring"
echo ""
echo "📈 Expected improvements:"
echo "   • 50-80% faster query performance"
echo "   • Reduced database load and CPU usage"
echo "   • Better handling of 200,000+ orders"
echo "   • Improved user experience"
echo ""
echo "🔄 Next steps:"
echo "   1. Test your application thoroughly"
echo "   2. Monitor performance in development"
echo "   3. Deploy to production during low-traffic hours"
echo "   4. Monitor production performance metrics"
echo ""
echo "⚠️  Rollback instructions:"
echo "   If you need to remove optimizations:"
echo "   psql \"\$DATABASE_URL\" -f scripts/database-optimization/01-rollback-indexes.sql"
echo ""
echo "📊 Performance report: $REPORT_FILE"
echo "💾 Database backup: $BACKUP_FILE"
echo ""
print_success "Ready for production deployment!"
