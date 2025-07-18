-- 🚀 SERVER-SAFE: Assignment System Indexes
-- Optimized for production server deployment with resource constraints

-- Create indexes one by one with smaller resource footprint
-- Remove CONCURRENTLY for faster creation (brief locks acceptable during deployment)

-- 1. Essential assignment lookup index (most critical)
CREATE INDEX IF NOT EXISTS idx_orders_assignment_basic 
ON orders (assigned_agent_id, status) 
WHERE assigned_agent_id IS NOT NULL;

-- 2. Unassigned orders index (simplified)
CREATE INDEX IF NOT EXISTS idx_orders_unassigned_simple 
ON orders (assigned_agent_id, order_date DESC) 
WHERE assigned_agent_id IS NULL;

-- 3. Agent role lookup (essential for assignment)
CREATE INDEX IF NOT EXISTS idx_users_agent_active 
ON users (role, is_active) 
WHERE role = 'AGENT_SUIVI';

-- 4. Product assignments (simplified)
CREATE INDEX IF NOT EXISTS idx_user_products_simple 
ON user_product_assignments (user_id, product_name);

-- 5. Order items for product filtering
CREATE INDEX IF NOT EXISTS idx_order_items_simple 
ON order_items (title);

-- Analyze tables after index creation
ANALYZE orders;
ANALYZE users;
ANALYZE user_product_assignments;
ANALYZE order_items;

-- Success message
SELECT 'Server-safe assignment indexes created successfully' as status;