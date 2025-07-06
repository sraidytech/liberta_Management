import { Router } from 'express';
import { wilayaSettingsController } from './wilaya-settings.controller';
import { adminMiddleware } from '@/middleware/admin';

const router = Router();

// Get all wilaya delivery settings
router.get('/', adminMiddleware as any, async (req, res) => {
  await wilayaSettingsController.getWilayaSettings(req, res);
});

// Get unique wilayas from existing orders
router.get('/unique-wilayas', adminMiddleware as any, async (req, res) => {
  await wilayaSettingsController.getUniqueWilayas(req, res);
});

// Create or update multiple wilaya settings
router.post('/', adminMiddleware as any, async (req, res) => {
  await wilayaSettingsController.upsertWilayaSettings(req, res);
});

// Update specific wilaya setting
router.put('/:id', adminMiddleware as any, async (req, res) => {
  await wilayaSettingsController.updateWilayaSetting(req, res);
});

// Initialize wilaya settings from existing orders
router.post('/initialize', adminMiddleware as any, async (req, res) => {
  await wilayaSettingsController.initializeWilayaSettings(req, res);
});

export default router;