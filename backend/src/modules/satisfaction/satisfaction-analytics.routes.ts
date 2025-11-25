import { Router } from 'express';
import { SatisfactionAnalyticsController } from './satisfaction-analytics.controller';

const router = Router();

// Authentication is already applied at the app level
// Role-based access control is handled in the controller

// Get comprehensive analytics
router.get('/analytics', SatisfactionAnalyticsController.getAnalytics);

// Get overview metrics
router.get('/overview', SatisfactionAnalyticsController.getOverview);

// Get trend data
router.get('/trends', SatisfactionAnalyticsController.getTrends);

// Get agent performance
router.get('/agent-performance', SatisfactionAnalyticsController.getAgentPerformance);

// Get store performance
router.get('/store-performance', SatisfactionAnalyticsController.getStorePerformance);

// Get product satisfaction
router.get('/product-satisfaction', SatisfactionAnalyticsController.getProductSatisfaction);

// Get wilaya satisfaction
router.get('/wilaya-satisfaction', SatisfactionAnalyticsController.getWilayaSatisfaction);

export default router;