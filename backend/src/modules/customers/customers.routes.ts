import { Router } from 'express';

const router = Router();

// Placeholder routes for customers
router.get('/', (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      message: 'Customers routes not implemented yet',
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
    },
  });
});

export default router;