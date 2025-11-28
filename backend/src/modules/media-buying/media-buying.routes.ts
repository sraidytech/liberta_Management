import { Router } from 'express';
import { mediaBuyingController } from './media-buying.controller';
import { authMiddleware, requireRole } from '@/common/middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Middleware: All media buying routes require authentication
router.use(authMiddleware);

// Media buying access: ADMIN, TEAM_MANAGER, MEDIA_BUYER
const requireMediaBuyingAccess = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.MEDIA_BUYER
]) as any;

// Admin only access
const requireAdminAccess = requireRole([UserRole.ADMIN]) as any;

// ============================================
// AD SOURCES
// ============================================

router.get('/sources', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getSources(req, res);
});

router.post('/sources', requireAdminAccess, (req, res) => {
  mediaBuyingController.createSource(req, res);
});

router.put('/sources/:id', requireAdminAccess, (req, res) => {
  mediaBuyingController.updateSource(req, res);
});

// ============================================
// ENTRIES (CRUD)
// ============================================

router.get('/entries', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getEntries(req, res);
});

router.get('/entries/:id', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getEntryById(req, res);
});

router.post('/entries', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.createEntry(req, res);
});

router.put('/entries/:id', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.updateEntry(req, res);
});

// DELETE only for ADMIN
router.delete('/entries/:id', requireAdminAccess, (req, res) => {
  mediaBuyingController.deleteEntry(req, res);
});

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

router.get('/dashboard/stats', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getDashboardStats(req, res);
});

router.get('/analytics/by-source', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getAnalyticsBySource(req, res);
});

router.get('/analytics/conversions', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getConversionAnalytics(req, res);
});

// ============================================
// BUDGETS
// ============================================

router.get('/budgets', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getBudgets(req, res);
});

router.post('/budgets', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.createBudget(req, res);
});

router.put('/budgets/:id', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.updateBudget(req, res);
});

router.get('/budgets/status', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getBudgetStatus(req, res);
});

// ============================================
// BUDGET ALERTS
// ============================================

router.get('/alerts', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getAlerts(req, res);
});

router.put('/alerts/:id/read', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.markAlertAsRead(req, res);
});

// ============================================
// CONVERSIONS
// ============================================

router.get('/conversions', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getConversions(req, res);
});

router.post('/conversions', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.linkLeadToOrder(req, res);
});

router.delete('/conversions/:id', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.unlinkLeadFromOrder(req, res);
});

// ============================================
// EXCHANGE RATES
// ============================================

router.get('/exchange-rates', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getExchangeRates(req, res);
});

router.get('/exchange-rates/latest', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.getLatestExchangeRate(req, res);
});

router.post('/exchange-rates', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.createExchangeRate(req, res);
});

// ============================================
// EXPORT
// ============================================

router.get('/export', requireMediaBuyingAccess, (req, res) => {
  mediaBuyingController.exportData(req, res);
});

export default router;