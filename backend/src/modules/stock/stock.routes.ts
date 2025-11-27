import { Router } from 'express';
import { stockController } from './stock.controller';
import { authMiddleware, requireRole } from '@/common/middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Middleware: All stock routes require authentication
router.use(authMiddleware);

// Stock management access: ADMIN, TEAM_MANAGER, STOCK_MANAGEMENT_AGENT
const requireStockAccess = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.STOCK_MANAGEMENT_AGENT
]) as any;

// ============================================
// PRODUCTS
// ============================================

router.get('/products', requireStockAccess, (req, res) => {
  stockController.getProducts(req, res);
});

router.get('/products/categories', requireStockAccess, (req, res) => {
  stockController.getCategories(req, res);
});

router.get('/products/:id', requireStockAccess, (req, res) => {
  stockController.getProductById(req, res);
});

router.post('/products', requireStockAccess, (req, res) => {
  stockController.createProduct(req, res);
});

router.put('/products/:id', requireStockAccess, (req, res) => {
  stockController.updateProduct(req, res);
});

router.delete('/products/:id', requireRole([UserRole.ADMIN]) as any, (req, res) => {
  stockController.deleteProduct(req, res);
});

// ============================================
// LOTS
// ============================================

router.get('/lots', requireStockAccess, (req, res) => {
  stockController.getLots(req, res);
});

router.get('/lots/:id', requireStockAccess, (req, res) => {
  stockController.getLotById(req, res);
});

router.post('/lots', requireStockAccess, (req, res) => {
  stockController.createLot(req, res);
});

router.put('/lots/:id', requireStockAccess, (req, res) => {
  stockController.updateLot(req, res);
});

router.delete('/lots/:id', requireStockAccess, (req, res) => {
  stockController.deleteLot(req, res);
});

// ============================================
// MOVEMENTS
// ============================================

router.get('/movements', requireStockAccess, (req, res) => {
  stockController.getMovements(req, res);
});

router.post('/movements', requireStockAccess, (req, res) => {
  stockController.createMovement(req, res);
});

router.post('/movements/adjustment', requireStockAccess, (req, res) => {
  stockController.createAdjustment(req, res);
});

// ============================================
// STOCK LEVELS
// ============================================

router.get('/levels', requireStockAccess, (req, res) => {
  stockController.getStockLevels(req, res);
});

router.get('/dashboard/stats', requireStockAccess, (req, res) => {
  stockController.getDashboardStats(req, res);
});

// ============================================
// ALERTS
// ============================================

router.get('/alerts', requireStockAccess, (req, res) => {
  stockController.getAlerts(req, res);
});

router.get('/alerts/summary', requireStockAccess, (req, res) => {
  stockController.getAlertSummary(req, res);
});

router.put('/alerts/:id/resolve', requireStockAccess, (req, res) => {
  stockController.resolveAlert(req, res);
});

// ============================================
// REPORTS
// ============================================

router.get('/reports/stock-level', requireStockAccess, (req, res) => {
  stockController.getStockLevelReport(req, res);
});

router.get('/reports/movements', requireStockAccess, (req, res) => {
  stockController.getMovementReport(req, res);
});

router.get('/reports/expiry', requireStockAccess, (req, res) => {
  stockController.getExpiryReport(req, res);
});

router.get('/reports/valuation', requireStockAccess, (req, res) => {
  stockController.getValuationReport(req, res);
});

router.get('/reports/turnover', requireStockAccess, (req, res) => {
  stockController.getTurnoverReport(req, res);
});

router.get('/reports/low-stock', requireStockAccess, (req, res) => {
  stockController.getLowStockReport(req, res);
});

router.post('/reports/export', requireStockAccess, (req, res) => {
  stockController.exportReport(req, res);
});

// ============================================
// WAREHOUSES
// ============================================

router.get('/warehouses', requireStockAccess, (req, res) => {
  stockController.getWarehouses(req, res);
});

router.get('/warehouses/:id', requireStockAccess, (req, res) => {
  stockController.getWarehouseById(req, res);
});

router.post('/warehouses', requireRole([UserRole.ADMIN]) as any, (req, res) => {
  stockController.createWarehouse(req, res);
});

router.put('/warehouses/:id', requireRole([UserRole.ADMIN]) as any, (req, res) => {
  stockController.updateWarehouse(req, res);
});

// ============================================
// PRODUCT SYNC ROUTES (Auto-fetch from Order Items)
// ============================================

// Sync specific order items to products
router.post('/sync/orders/:orderId',
  requireStockAccess,
  (req, res) => stockController.syncOrderItems(req, res)
);

// Batch sync all order items to products
router.post('/sync/batch',
  requireStockAccess,
  (req, res) => stockController.batchSyncAllOrderItems(req, res)
);

// Get sync statistics
router.get('/sync/stats',
  requireStockAccess,
  (req, res) => stockController.getSyncStats(req, res)
);

export default router;