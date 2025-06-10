import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware, requireAdmin } from '@/common/middleware/auth';

const router = Router();
const ordersController = new OrdersController();

// Authentication is already applied at the app level

// Get all orders with pagination and filtering
router.get('/', async (req, res) => {
  await ordersController.getOrders(req, res);
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  await ordersController.getDashboardStats(req, res);
});

// Admin-only routes (must be before /:id route)
router.get('/test-ecomanager', requireAdmin as any, async (req, res) => {
  await ordersController.testEcoManagerIntegration(req, res);
});

router.post('/sync', requireAdmin as any, async (req, res) => {
  await ordersController.syncOrders(req, res);
});

router.delete('/delete-all', requireAdmin as any, async (req, res) => {
  await ordersController.deleteAllOrders(req, res);
});

// Get single order by ID (must be after specific routes)
router.get('/:id', async (req, res) => {
  await ordersController.getOrder(req, res);
});

// Update order status
router.put('/:id/status', async (req, res) => {
  await ordersController.updateOrderStatus(req, res);
});

// Assign agent to order
router.put('/:id/assign', async (req, res) => {
  await ordersController.assignAgent(req, res);
});

export default router;