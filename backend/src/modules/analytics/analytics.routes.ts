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

export default router;