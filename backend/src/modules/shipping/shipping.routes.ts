/**
 * Shipping Routes
 * 
 * API routes for shipping companies and accounts management
 */

import { Router } from 'express';
import { ShippingCompaniesController } from './shipping-companies.controller';
import { ShippingAccountsController } from './shipping-accounts.controller';
import { authMiddleware, requireAdmin } from '../../common/middleware/auth';
import { Redis } from 'ioredis';

export function createShippingRoutes(redis: Redis): Router {
  const router = Router();
  
  const companiesController = new ShippingCompaniesController();
  const accountsController = new ShippingAccountsController(redis);

  // All routes require authentication
  router.use(authMiddleware);

  // ============================================
  // SHIPPING COMPANIES ROUTES
  // ============================================

  // Get all shipping companies
  router.get('/companies', async (req, res) => {
    await companiesController.getAllCompanies(req, res);
  });

  // Get shipping company by ID
  router.get('/companies/:id', async (req, res) => {
    await companiesController.getCompanyById(req, res);
  });

  // Get shipping company statistics
  router.get('/companies/:id/stats', async (req, res) => {
    await companiesController.getCompanyStats(req, res);
  });

  // Create new shipping company (Admin only)
  router.post('/companies', requireAdmin as any, async (req, res) => {
    await companiesController.createCompany(req, res);
  });

  // Update shipping company (Admin only)
  router.put('/companies/:id', requireAdmin as any, async (req, res) => {
    await companiesController.updateCompany(req, res);
  });

  // ============================================
  // SHIPPING ACCOUNTS ROUTES
  // ============================================

  // Get all shipping accounts
  router.get('/accounts', async (req, res) => {
    await accountsController.getAllAccounts(req, res);
  });

  // Get shipping account by ID
  router.get('/accounts/:id', async (req, res) => {
    await accountsController.getAccountById(req, res);
  });

  // Create new shipping account (Admin only)
  router.post('/accounts', requireAdmin as any, async (req, res) => {
    await accountsController.createAccount(req, res);
  });

  // Update shipping account (Admin only)
  router.put('/accounts/:id', requireAdmin as any, async (req, res) => {
    await accountsController.updateAccount(req, res);
  });

  // Soft delete shipping account (Admin only)
  router.delete('/accounts/:id', requireAdmin as any, async (req, res) => {
    await accountsController.deleteAccount(req, res);
  });

  // Test connection for shipping account
  router.post('/accounts/:id/test', async (req, res) => {
    await accountsController.testConnection(req, res);
  });

  // Test credentials without saving (must be before /:id routes)
  router.post('/accounts/test-credentials', async (req, res) => {
    await accountsController.testCredentials(req, res);
  });

  return router;
}

export default createShippingRoutes;