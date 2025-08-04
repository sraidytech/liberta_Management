-- Migration: Add Performance Indexes for Analytics
-- This migration is 100% SAFE - it only adds indexes for better performance
-- NO DATA IS MODIFIED OR DELETED

-- Add critical indexes for Order table to improve analytics performance
-- These indexes will dramatically improve Advanced Reports load times

-- Date range queries (most critical for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_orderDate_idx" ON "orders"("orderDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

-- Status filtering (critical for all reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- Store filtering (critical for store analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_storeIdentifier_idx" ON "orders"("storeIdentifier");

-- Agent queries (critical for agent performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_assignedAgentId_idx" ON "orders"("assignedAgentId");

-- Customer queries (critical for customer analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId");

-- Composite indexes for complex analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_assignedAgentId_status_idx" ON "orders"("assignedAgentId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_customerId_status_idx" ON "orders"("customerId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_orderDate_status_idx" ON "orders"("orderDate", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_orderDate_storeIdentifier_idx" ON "orders"("orderDate", "storeIdentifier");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_status_storeIdentifier_idx" ON "orders"("status", "storeIdentifier");

-- Customer table indexes for geographic analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_wilaya_idx" ON "customers"("wilaya");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_commune_idx" ON "customers"("commune");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_wilaya_commune_idx" ON "customers"("wilaya", "commune");

-- Agent activities indexes for performance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_activities_agentId_createdAt_idx" ON "agent_activities"("agentId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "agent_activities_orderId_idx" ON "agent_activities"("orderId");