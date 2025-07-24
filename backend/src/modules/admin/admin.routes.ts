import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../common/middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

/**
 * @route DELETE /api/admin/delete-orders
 * @desc Delete all orders from the database
 * @access Admin only
 */
router.delete('/delete-orders', async (req, res) => {
  await adminController.deleteAllOrders(req, res);
});

/**
 * @route POST /api/admin/sync-stores
 * @desc Sync all stores from EcoManager
 * @access Admin only
 */
router.post('/sync-stores', async (req, res) => {
  await adminController.syncStores(req, res);
});

/**
 * @route DELETE /api/admin/cleanup-assignments
 * @desc Clean up all order assignments
 * @access Admin only
 */
router.delete('/cleanup-assignments', async (req, res) => {
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

/**
 * @route POST /api/admin/restore-sync-positions
 * @desc Restore sync positions from JSON backup or calculate from database
 * @access Admin only
 */
router.post('/restore-sync-positions', async (req, res) => {
  await adminController.restoreSyncPositions(req, res);
});

/**
 * @route GET /api/admin/sync-position-status
 * @desc Get sync position status for all stores
 * @access Admin only
 */
router.get('/sync-position-status', async (req, res) => {
  await adminController.getSyncPositionStatus(req, res);
});

/**
 * @route POST /api/admin/auto-recover-sync-positions
 * @desc Auto-detect and recover from cache loss
 * @access Admin only
 */
router.post('/auto-recover-sync-positions', async (req, res) => {
  await adminController.autoRecoverSyncPositions(req, res);
});

/**
 * @route GET /api/admin/health
 * @desc Health check for admin routes
 * @access Admin only
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working',
    timestamp: new Date().toISOString()
  });
});

export default router;
