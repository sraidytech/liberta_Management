import { Router } from 'express';
import { NotificationController } from './notifications.controller';

const router = Router();
const notificationController = new NotificationController();

// Authentication is already applied at the app level

// Get user notifications with pagination and filters
router.get('/', async (req, res) => {
  await notificationController.getUserNotifications(req, res);
});

// Get unread notification count
router.get('/unread-count', async (req, res) => {
  await notificationController.getUnreadCount(req, res);
});

// Get notification statistics (Admin/Manager only)
router.get('/stats', async (req, res) => {
  await notificationController.getNotificationStats(req, res);
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  await notificationController.markAsRead(req, res);
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
  await notificationController.markAllAsRead(req, res);
});

// Delete all notifications (Admin only)
router.delete('/delete-all', async (req, res) => {
  await notificationController.deleteAllNotifications(req, res);
});

// Create notification (Admin/Manager only)
router.post('/', async (req, res) => {
  await notificationController.createNotification(req, res);
});

// Create bulk notifications (Admin/Manager only)
router.post('/bulk', async (req, res) => {
  await notificationController.createBulkNotifications(req, res);
});

// Test notification endpoint (Development only)
router.post('/test', async (req, res) => {
  await notificationController.testNotification(req, res);
});

export default router;