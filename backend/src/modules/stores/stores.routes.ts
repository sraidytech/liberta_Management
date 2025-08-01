import { Router } from 'express';
import { StoresController } from './stores.controller';
import { requireAdmin } from '../../common/middleware/auth';

const router = Router();

// API connection testing (must be before /:id route)
router.post('/test-connection', requireAdmin as any, async (req, res) => {
  await StoresController.testConnection(req, res);
});

// Rate limit monitoring routes
router.get('/rate-limits', requireAdmin as any, async (req, res) => {
  await StoresController.getRateLimitStatus(req, res);
});

router.get('/:storeIdentifier/rate-limits', requireAdmin as any, async (req, res) => {
  await StoresController.getStoreRateLimitStatus(req, res);
});

// Store management routes
router.get('/', requireAdmin as any, async (req, res) => {
  await StoresController.getAllStores(req, res);
});

router.post('/', requireAdmin as any, async (req, res) => {
  await StoresController.createStore(req, res);
});

router.get('/:id', requireAdmin as any, async (req, res) => {
  await StoresController.getStore(req, res);
});

router.put('/:id', requireAdmin as any, async (req, res) => {
  await StoresController.updateStore(req, res);
});

router.patch('/:id/toggle', requireAdmin as any, async (req, res) => {
  await StoresController.toggleStoreStatus(req, res);
});

router.delete('/:id', requireAdmin as any, async (req, res) => {
  await StoresController.deleteStore(req, res);
});

// Store sync route
router.post('/:id/sync', requireAdmin as any, async (req, res) => {
  await StoresController.syncStoreOrders(req, res);
});

export default router;