import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { productionAnalyticsController } from './analytics-production-optimized.controller';
import { requireAdmin, requireManager } from '@/common/middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// Authentication is already applied at the app level

// Dashboard statistics (Admin only)
router.get('/dashboard', requireAdmin as any, async (req, res) => {
  await analyticsController.getDashboardStats(req, res);
});

// Order trends for charts (Admin only)
router.get('/trends', requireAdmin as any, async (req, res) => {
  await analyticsController.getOrderTrends(req, res);
});

// Agent performance metrics (Admin and Team Manager)
router.get('/agents', requireManager as any, async (req, res) => {
  await analyticsController.getAgentPerformance(req, res);
});

// Sales and revenue reports (Admin and Team Manager)
router.get('/sales', requireManager as any, async (req, res) => {
  await analyticsController.getSalesReports(req, res);
});

// Detailed agent reports - PRODUCTION OPTIMIZED VERSION (Admin and Team Manager)
router.get('/agents/detailed', requireManager as any, async (req, res) => {
  await productionAnalyticsController.getDetailedAgentReports(req, res);
});

// Geographic reports (orders by city/wilaya) (Admin and Team Manager)
router.get('/geographic', requireManager as any, async (req, res) => {
  await analyticsController.getGeographicReports(req, res);
});

// Commune analytics for a specific wilaya (Admin and Team Manager)
router.get('/geographic/commune', requireManager as any, async (req, res) => {
  await analyticsController.getCommuneAnalytics(req, res);
});

// Customer analytics (Admin and Team Manager)
router.get('/customers', requireManager as any, async (req, res) => {
  await analyticsController.getCustomerReports(req, res);
});

// Agent notes activity analytics (Admin and Team Manager)
router.get('/agents/notes', requireManager as any, async (req, res) => {
  await analyticsController.getAgentNotesAnalytics(req, res);
});

// Agent performance analytics (agents can view their own, managers can view any)
router.get('/agents/:agentId/performance', async (req, res) => {
  await analyticsController.getAgentPerformanceAnalytics(req, res);
});

// Customer list endpoints (Admin and Team Manager)
router.get('/customers/active', requireManager as any, async (req, res) => {
  await analyticsController.getActiveCustomersList(req, res);
});

router.get('/customers/returning', requireManager as any, async (req, res) => {
  await analyticsController.getReturningCustomersList(req, res);
});

router.get('/customers/export', requireManager as any, async (req, res) => {
  await analyticsController.exportCustomerData(req, res);
});

export default router;