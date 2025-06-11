import { Router } from 'express';
import { MaystroWebhookController } from './maystro-webhook.controller';
import { authMiddleware, requireAdmin } from '@/common/middleware/auth';

const router = Router();
const maystroWebhookController = new MaystroWebhookController();

// Public webhook endpoints (no auth required)
router.post('/maystro', async (req, res) => {
  await maystroWebhookController.handleWebhook(req, res);
});

// Placeholder for EcoManager webhook
router.post('/ecomanager', (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      message: 'EcoManager webhook not implemented yet',
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
    },
  });
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