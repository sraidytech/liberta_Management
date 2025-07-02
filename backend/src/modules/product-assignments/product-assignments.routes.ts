import { Router } from 'express';
import { ProductAssignmentsController } from './product-assignments.controller';
import { authMiddleware, requireAdmin, requireManager } from '@/common/middleware/auth';

const router = Router();
const productAssignmentsController = new ProductAssignmentsController();

// Apply authentication middleware to all routes
router.use(authMiddleware as any);

// Admin and Manager only routes
router.post('/assign', requireManager as any, async (req, res) => {
  await productAssignmentsController.assignProducts(req, res);
});

router.put('/update', requireManager as any, async (req, res) => {
  await productAssignmentsController.updateAssignments(req, res);
});

router.delete('/:userId/:productName', requireManager as any, async (req, res) => {
  await productAssignmentsController.removeAssignment(req, res);
});

// Read-only routes (accessible by managers and coordinateurs)
router.get('/my-assignments', async (req, res) => {
  await productAssignmentsController.getMyAssignments(req, res);
});

router.get('/user/:userId', async (req, res) => {
  await productAssignmentsController.getUserProducts(req, res);
});

router.get('/product/:productName', async (req, res) => {
  await productAssignmentsController.getProductUsers(req, res);
});

router.get('/assignments', async (req, res) => {
  await productAssignmentsController.getAssignments(req, res);
});

router.get('/available-products', async (req, res) => {
  await productAssignmentsController.getAvailableProducts(req, res);
});

router.get('/stats', requireManager as any, async (req, res) => {
  await productAssignmentsController.getStats(req, res);
});

export default router;