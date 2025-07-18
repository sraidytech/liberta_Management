-- 🚀 ROLLBACK: Server-Safe Assignment System Indexes
-- Use this script to remove server-safe assignment optimization indexes if needed

DROP INDEX IF EXISTS idx_orders_assignment_basic;
DROP INDEX IF EXISTS idx_orders_unassigned_simple;
DROP INDEX IF EXISTS idx_users_agent_active;
DROP INDEX IF EXISTS idx_user_products_simple;
DROP INDEX IF EXISTS idx_order_items_simple;

ANALYZE orders;
ANALYZE users;
ANALYZE user_product_assignments;
ANALYZE order_items;

-- Success message
SELECT 'Server-safe assignment indexes removed successfully' as status;