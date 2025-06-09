import { Router } from 'express';

const router = Router();

// Placeholder routes for webhooks
router.post('/ecomanager', (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      message: 'EcoManager webhook not implemented yet',
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
    },
  });
});

router.post('/maystro', (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      message: 'Maystro webhook not implemented yet',
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
    },
  });
});

export default router;