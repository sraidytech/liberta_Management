-- Product Analytics Performance Indexes
-- These indexes optimize the product analytics queries

-- Index on order_items for product analytics
CREATE INDEX IF NOT EXISTS idx_order_items_title ON order_items(title);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items("orderId");

-- Index on orders for filtering
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders("shippingStatus");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders("orderDate");
CREATE INDEX IF NOT EXISTS idx_orders_store_identifier ON orders("storeIdentifier");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders("orderDate", "shippingStatus");
CREATE INDEX IF NOT EXISTS idx_orders_date_store ON orders("orderDate", "storeIdentifier");

-- Index on customers for geographic filtering
CREATE INDEX IF NOT EXISTS idx_customers_wilaya ON customers(wilaya);

-- Analyze tables to update statistics
ANALYZE orders;
ANALYZE order_items;
ANALYZE customers;