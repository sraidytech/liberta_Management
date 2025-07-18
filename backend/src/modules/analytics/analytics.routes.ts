import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { requireAdmin } from '@/common/middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// Authentication is already applied at the app level

// Dashboard statistics
router.get('/dashboard', requireAdmin as any, async (req, res) => {
  await analyticsController.getDashboardStats(req, res);
});

// Order trends for charts
router.get('/trends', requireAdmin as any, async (req, res) => {
  await analyticsController.getOrderTrends(req, res);
});

// Agent performance metrics
router.get('/agents', requireAdmin as any, async (req, res) => {
  await analyticsController.getAgentPerformance(req, res);
});

// Sales and revenue reports
router.get('/sales', requireAdmin as any, async (req, res) => {
  await analyticsController.getSalesReports(req, res);
});

// Detailed agent reports
router.get('/agents/detailed', requireAdmin as any, async (req, res) => {
  await analyticsController.getDetailedAgentReports(req, res);
});

// Geographic reports (orders by city/wilaya)
router.get('/geographic', requireAdmin as any, async (req, res) => {
  await analyticsController.getGeographicReports(req, res);
});

// Commune analytics for a specific wilaya
router.get('/geographic/commune', requireAdmin as any, async (req, res) => {
  await analyticsController.getCommuneAnalytics(req, res);
});

// Customer analytics
router.get('/customers', requireAdmin as any, async (req, res) => {
  await analyticsController.getCustomerReports(req, res);
});

// Agent notes activity analytics
router.get('/agents/notes', requireAdmin as any, async (req, res) => {
  await analyticsController.getAgentNotesAnalytics(req, res);
});

export default router;