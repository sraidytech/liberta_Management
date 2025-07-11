import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../common/middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

/**
 * @route DELETE /api/admin/orders/all
 * @desc Delete all orders from the database
 * @access Admin only
 */
router.delete('/orders/all', async (req, res) => {
  await adminController.deleteAllOrders(req, res);
});

/**
 * @route POST /api/admin/stores/sync
 * @desc Sync all stores from EcoManager
 * @access Admin only
 */
router.post('/stores/sync', async (req, res) => {
  await adminController.syncStores(req, res);
});

/**
 * @route POST /api/admin/assignments/cleanup
 * @desc Clean up all order assignments
 * @access Admin only
 */
router.post('/assignments/cleanup', async (req, res) => {
  await adminController.cleanupAssignments(req, res);
});

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics
 * @access Admin only
 */
router.get('/stats', async (req, res) => {
  await adminController.getSystemStats(req, res);
});

export default router;