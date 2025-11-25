import { Router } from 'express';
import { TicketAnalyticsController } from './ticket-analytics.controller';

const router = Router();

// Authentication is already applied at the app level
// Role-based access control is handled in the controller

// Get comprehensive analytics
router.get('/analytics', async (req, res) => {
  await TicketAnalyticsController.getAnalytics(req, res);
});

// Get overview metrics
router.get('/overview', async (req, res) => {
  await TicketAnalyticsController.getOverview(req, res);
});

// Get category distribution
router.get('/category-distribution', async (req, res) => {
  await TicketAnalyticsController.getCategoryDistribution(req, res);
});

// Get priority distribution
router.get('/priority-distribution', async (req, res) => {
  await TicketAnalyticsController.getPriorityDistribution(req, res);
});

// Get trend data
router.get('/trends', async (req, res) => {
  await TicketAnalyticsController.getTrends(req, res);
});

// Get agent analysis
router.get('/agent-analysis', async (req, res) => {
  await TicketAnalyticsController.getAgentAnalysis(req, res);
});

// Get ticket aging
router.get('/aging', async (req, res) => {
  await TicketAnalyticsController.getTicketAging(req, res);
});

// Get critical summary
router.get('/critical-summary', async (req, res) => {
  await TicketAnalyticsController.getCriticalSummary(req, res);
});

export default router;