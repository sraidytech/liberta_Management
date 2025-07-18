-- 🚀 ROLLBACK: Assignment System Indexes
-- Use this script to remove assignment optimization indexes if needed

DROP INDEX CONCURRENTLY IF EXISTS idx_orders_assignment_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_unassigned_recent;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_shipping_status_assignment;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_agent_daily_workload;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_product_assignments_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_order_items_title_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_activities_assignment;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_agent_suivi_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_assignment_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_recent_order_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_assignment_groupby;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_product_assignments_lookup;

ANALYZE orders;
ANALYZE users;
ANALYZE user_product_assignments;
ANALYZE order_items;
ANALYZE agent_activities;