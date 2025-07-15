-- =====================================================
-- DATABASE PERFORMANCE OPTIMIZATION - ROLLBACK
-- Remove all performance indexes if needed
-- =====================================================
-- SAFE: Can be run anytime to remove indexes
-- Run time: 2-5 minutes
-- =====================================================

-- =====================================================
-- ROLLBACK ALL PERFORMANCE INDEXES
-- =====================================================

-- Primary performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_store_identifier;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_assigned_agent;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_updated_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_order_date;

-- Customer indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_telephone;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_wilaya;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_full_name;

-- Order items indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_order_items_title;
DROP INDEX CONCURRENTLY IF EXISTS idx_order_items_order_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_order_items_product_id;

-- Composite indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_status_store;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_agent_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_created_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_store_created;

-- Agent activities indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_activities_agent_order;
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_activities_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_activities_type;

-- Notifications indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_user_read;
DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_created_at;

-- Search optimization indexes (GIN)
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_reference_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_name_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_customers_phone_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_eco_id_gin;

-- User product assignments indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_user_product_assignments_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_product_assignments_product;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_product_assignments_active;

-- Additional indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_users_role;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_agent_code;
DROP INDEX CONCURRENTLY IF EXISTS idx_api_configs_store;
DROP INDEX CONCURRENTLY IF EXISTS idx_api_configs_active;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check remaining custom indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ALL PERFORMANCE INDEXES REMOVED SUCCESSFULLY!';
    RAISE NOTICE '🔄 Database returned to original state';
    RAISE NOTICE '📊 Performance will return to pre-optimization levels';
    RAISE NOTICE '💡 You can re-apply indexes anytime using 01-create-indexes.sql';
END $$;
