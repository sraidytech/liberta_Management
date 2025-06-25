import { Router } from 'express';
import { DefaultCommissionSettingsController } from './default-commission-settings.controller';
import { requireAdmin, authMiddleware } from '@/common/middleware/auth';

const router = Router();
const defaultCommissionSettingsController = new DefaultCommissionSettingsController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/commissions/default-settings - Get current default settings
router.get('/', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.getDefaultSettings(req, res);
});

// PUT /api/commissions/default-settings - Update default settings
router.put('/', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.updateDefaultSettings(req, res);
});

// GET /api/commissions/default-settings/all - Get all settings profiles
router.get('/all', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.getAllSettings(req, res);
});

// POST /api/commissions/default-settings - Create new settings profile
router.post('/', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.createSettings(req, res);
});

// DELETE /api/commissions/default-settings/:id - Delete settings profile
router.delete('/:id', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.deleteSettings(req, res);
});

// PUT /api/commissions/default-settings/:id/activate - Activate settings profile
router.put('/:id/activate', requireAdmin as any, async (req, res) => {
  await defaultCommissionSettingsController.activateSettings(req, res);
});

export default router;