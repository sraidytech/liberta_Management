import { Router } from 'express';
import { ConfirmationsController } from './confirmations.controller';
import { authMiddleware } from '../../common/middleware/auth';

const router = Router();
const controller = new ConfirmationsController();

// All routes require authentication
router.use(authMiddleware as any);

// Get confirmation for specific order
router.get('/order/:orderId', async (req, res) => {
  await controller.getOrderConfirmation(req, res);
});

// Get confirmations by confirmator
router.get('/confirmator/:confirmatorId', async (req, res) => {
  await controller.getConfirmationsByConfirmator(req, res);
});

// Get confirmation statistics
router.get('/stats', async (req, res) => {
  await controller.getConfirmationStats(req, res);
});

// Get confirmator performance with confirmation rates
router.get('/performance', async (req, res) => {
  await controller.getConfirmatorPerformance(req, res);
});

// Get paginated list of confirmations
router.get('/list', async (req, res) => {
  await controller.getConfirmationsList(req, res);
});

export default router;