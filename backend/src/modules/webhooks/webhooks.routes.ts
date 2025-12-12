import { Router } from 'express';
import { MaystroWebhookController } from './maystro-webhook.controller';
import { EcoManagerWebhookController } from './ecomanager-webhook.controller';
import { authMiddleware, requireAdmin } from '@/common/middleware/auth';

const router = Router();
const maystroWebhookController = new MaystroWebhookController();
const ecoManagerWebhookController = new EcoManagerWebhookController();

// Public webhook endpoints (no auth required)
router.post('/maystro', async (req, res) => {
  await maystroWebhookController.handleWebhook(req, res);
});

// EcoManager webhook endpoints
router.get('/ecomanager', async (req, res) => {
  await ecoManagerWebhookController.handleValidation(req, res);
});

router.post('/ecomanager', async (req, res) => {
  await ecoManagerWebhookController.handleWebhook(req, res);
});

// Protected webhook management endpoints
router.use(authMiddleware as any);

// Get webhook events history
router.get('/events', requireAdmin as any, async (req, res) => {
  await maystroWebhookController.getWebhookEvents(req, res);
});

// Get webhook statistics
router.get('/stats', requireAdmin as any, async (req, res) => {
  await maystroWebhookController.getWebhookStats(req, res);
});

// Retry failed webhook event
router.post('/events/:id/retry', requireAdmin as any, async (req, res) => {
  await maystroWebhookController.retryWebhookEvent(req, res);
});

// Delete webhook event
router.delete('/events/:id', requireAdmin as any, async (req, res) => {
  await maystroWebhookController.deleteWebhookEvent(req, res);
});

export default router;