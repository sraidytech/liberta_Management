import { Router } from 'express';
import { ActivityLogsController } from './activity-logs.controller';
import { authMiddleware } from '../../common/middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();

// All routes require authentication and admin privileges
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

// Get activity logs with filtering and pagination
router.get('/', async (req, res) => {
  await ActivityLogsController.getLogs(req, res);
});

// Get activity logs for a specific user
router.get('/user/:userId', async (req, res) => {
  await ActivityLogsController.getUserLogs(req, res);
});

// Get activity logs for a specific resource
router.get('/resource/:resourceType/:resourceId', async (req, res) => {
  await ActivityLogsController.getResourceLogs(req, res);
});

// Get system logs
router.get('/system', async (req, res) => {
  await ActivityLogsController.getSystemLogs(req, res);
});

// Get error logs
router.get('/errors', async (req, res) => {
  await ActivityLogsController.getErrorLogs(req, res);
});

// Get authentication logs
router.get('/auth', async (req, res) => {
  await ActivityLogsController.getAuthLogs(req, res);
});

// Get activity statistics
router.get('/stats', async (req, res) => {
  await ActivityLogsController.getActivityStats(req, res);
});

// Get filter options
router.get('/filter-options', async (req, res) => {
  await ActivityLogsController.getFilterOptions(req, res);
});

// Delete old logs
router.delete('/cleanup', async (req, res) => {
  await ActivityLogsController.deleteOldLogs(req, res);
});

export default router;