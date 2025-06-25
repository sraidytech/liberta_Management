import { Router } from 'express';
import { CommissionController } from './commission.controller';
import { requireAdmin, authMiddleware } from '@/common/middleware/auth';

const router = Router();
const commissionController = new CommissionController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Commission calculation routes
router.get('/agents/:agentId/calculate', async (req, res) => {
  await commissionController.calculateAgentCommission(req, res);
});

router.get('/summary', async (req, res) => {
  await commissionController.getCommissionSummary(req, res);
});

router.get('/export', async (req, res) => {
  await commissionController.exportCommissionReport(req, res);
});

// Product commission management routes (Admin only)
router.get('/products/from-orders', requireAdmin as any, async (req, res) => {
  await commissionController.getProductsFromOrders(req, res);
});

router.get('/products', requireAdmin as any, async (req, res) => {
  await commissionController.getProductCommissions(req, res);
});

router.post('/products', requireAdmin as any, async (req, res) => {
  await commissionController.upsertProductCommission(req, res);
});

router.put('/products/:id', requireAdmin as any, async (req, res) => {
  await commissionController.upsertProductCommission(req, res);
});

router.delete('/products/:id', requireAdmin as any, async (req, res) => {
  await commissionController.deleteProductCommission(req, res);
});

// Agent confirmation rate management routes (Admin only)
router.get('/agents/performance', requireAdmin as any, async (req, res) => {
  await commissionController.getAgentsWithPerformance(req, res);
});

router.get('/agents/rates', requireAdmin as any, async (req, res) => {
  await commissionController.getAllAgentRates(req, res);
});

router.post('/agents/:agentId/rates', requireAdmin as any, async (req, res) => {
  await commissionController.setAgentConfirmationRate(req, res);
});

router.get('/agents/:agentId/rates', requireAdmin as any, async (req, res) => {
  await commissionController.getAgentConfirmationRates(req, res);
});

// Agent-Product confirmation rate management routes (Admin only)
router.get('/agents/product-rates', requireAdmin as any, async (req, res) => {
  await commissionController.getAgentProductConfirmationRates(req, res);
});

router.post('/agents/:agentId/products/:productName/rates', requireAdmin as any, async (req, res) => {
  await commissionController.setAgentProductConfirmationRate(req, res);
});

router.put('/agents/product-rates/:id', requireAdmin as any, async (req, res) => {
  await commissionController.updateAgentProductConfirmationRate(req, res);
});

router.delete('/agents/product-rates/:id', requireAdmin as any, async (req, res) => {
  await commissionController.deleteAgentProductConfirmationRate(req, res);
});

// Bulk operations
router.post('/agents/product-rates/bulk', requireAdmin as any, async (req, res) => {
  await commissionController.bulkCreateAgentProductConfirmationRates(req, res);
});

router.put('/agents/product-rates/bulk', requireAdmin as any, async (req, res) => {
  await commissionController.bulkUpdateAgentProductConfirmationRates(req, res);
});

router.delete('/agents/product-rates/bulk', requireAdmin as any, async (req, res) => {
  await commissionController.bulkDeleteAgentProductConfirmationRates(req, res);
});

export default router;