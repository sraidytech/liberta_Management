-- 🚀 PERFORMANCE OPTIMIZATION: Assignment System Indexes
-- These indexes optimize agent assignment queries for better performance

-- Index for order assignment queries (assignedAgentId, assignedAt, status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assignment_performance 
ON orders (assigned_agent_id, assigned_at DESC, status) 
WHERE assigned_agent_id IS NOT NULL;

-- Index for unassigned orders queries (assignedAgentId null, orderDate desc)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_unassigned_recent 
ON orders (order_date DESC) 
WHERE assigned_agent_id IS NULL;

-- Index for shipping status filtering in assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_shipping_status_assignment 
ON orders (shipping_status, assigned_agent_id, order_date DESC);

-- Index for agent workload queries (assignedAgentId, assignedAt for today's assignments)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_agent_daily_workload 
ON orders (assigned_agent_id, assigned_at DESC) 
WHERE assigned_agent_id IS NOT NULL AND assigned_at >= CURRENT_DATE;

-- Index for product assignment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_product_assignments_active 
ON user_product_assignments (user_id, product_name) 
WHERE is_active = true;

-- Index for order items product filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_title_lookup 
ON order_items (title, order_id);

-- Index for agent activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_activities_assignment 
ON agent_activities (agent_id, activity_type, created_at DESC) 
WHERE activity_type = 'ORDER_ASSIGNED';

-- Index for users role and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_agent_suivi_active 
ON users (role, is_active, id) 
WHERE role = 'AGENT_SUIVI' AND is_active = true;

-- Composite index for order assignment with status and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assignment_composite 
ON orders (assigned_agent_id, status, assigned_at DESC, order_date DESC);

-- Index for recent orders (last 15,000 optimization) - using orderDate
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_recent_order_date 
ON orders (order_date DESC, id, assigned_agent_id);

-- Index for assignment groupBy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assignment_groupby 
ON orders (assigned_agent_id, assigned_at, status) 
WHERE assigned_agent_id IS NOT NULL;

-- Index for product assignment lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_product_assignments_lookup 
ON user_product_assignments (product_name, user_id, is_active);

ANALYZE orders;
ANALYZE users;
ANALYZE user_product_assignments;
ANALYZE order_items;
ANALYZE agent_activities;