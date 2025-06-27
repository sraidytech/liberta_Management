import { Router } from 'express';
import { SchedulerController } from './scheduler.controller';
import { authMiddleware } from '@/common/middleware/auth';
import { adminMiddleware } from '@/middleware/admin';

const router = Router();

// All scheduler routes require authentication and admin privileges
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

/**
 * @route GET /api/v1/scheduler/status
 * @desc Get scheduler status and statistics
 * @access Admin only
 */
router.get('/status', SchedulerController.getStatus);

/**
 * @route POST /api/v1/scheduler/start
 * @desc Start the background job scheduler
 * @access Admin only
 */
router.post('/start', SchedulerController.startScheduler);

/**
 * @route POST /api/v1/scheduler/stop
 * @desc Stop the background job scheduler
 * @access Admin only
 */
router.post('/stop', SchedulerController.stopScheduler);

/**
 * @route POST /api/v1/scheduler/trigger/ecomanager
 * @desc Manually trigger EcoManager sync
 * @access Admin only
 */
router.post('/trigger/ecomanager', SchedulerController.triggerEcoManagerSync);

/**
 * @route POST /api/v1/scheduler/trigger/shipping
 * @desc Manually trigger Shipping Status sync
 * @access Admin only
 */
router.post('/trigger/shipping', SchedulerController.triggerShippingStatusSync);

/**
 * @route GET /api/v1/scheduler/history
 * @desc Get sync history and logs
 * @access Admin only
 */
router.get('/history', SchedulerController.getSyncHistory);

/**
 * @route GET /api/v1/scheduler/next-sync-times
 * @desc Get next scheduled sync times
 * @access Admin only
 */
router.get('/next-sync-times', SchedulerController.getNextSyncTimes);

/**
 * @route GET /api/v1/scheduler/maystro-api-keys
 * @desc Get Maystro API keys information and statistics
 * @access Admin only
 */
router.get('/maystro-api-keys', SchedulerController.getMaystroApiKeys);

/**
 * @route POST /api/v1/scheduler/test-maystro-key/:keyId
 * @desc Test Maystro API key connection
 * @access Admin only
 */
router.post('/test-maystro-key/:keyId', SchedulerController.testMaystroApiKey);

/**
 * @route GET /api/v1/scheduler/system-info
 * @desc Get real system information
 * @access Admin only
 */
router.get('/system-info', SchedulerController.getSystemInfo);

export default router;