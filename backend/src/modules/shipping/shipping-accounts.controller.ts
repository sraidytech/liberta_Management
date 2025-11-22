/**
 * Shipping Accounts Controller
 * 
 * Handles CRUD operations for shipping accounts and connection testing
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ShippingProviderFactory } from '../../services/shipping/shipping-provider-factory';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();

export class ShippingAccountsController {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get all shipping accounts
   * GET /api/v1/shipping/accounts
   */
  async getAllAccounts(req: Request, res: Response) {
    try {
      const { companyId, isActive } = req.query;

      const where: any = {};
      if (companyId) where.companyId = companyId as string;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const accounts = await prisma.shippingAccount.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          },
          stores: {
            select: {
              id: true,
              storeName: true,
              storeIdentifier: true
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { name: 'asc' }
        ]
      });

      // Remove sensitive credentials from response
      const sanitizedAccounts = accounts.map(account => ({
        ...account,
        credentials: undefined, // Don't expose credentials
        hasCredentials: !!account.credentials
      }));

      res.json({
        success: true,
        data: sanitizedAccounts
      });
    } catch (error: any) {
      console.error('Error fetching shipping accounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shipping accounts',
        message: error.message
      });
    }
  }

  /**
   * Get a specific shipping account by ID
   * GET /api/v1/shipping/accounts/:id
   */
  async getAccountById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const account = await prisma.shippingAccount.findUnique({
        where: { id },
        include: {
          company: true,
          stores: {
            select: {
              id: true,
              storeName: true,
              storeIdentifier: true,
              isActive: true
            }
          }
        }
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Shipping account not found'
        });
      }

      // Remove sensitive credentials from response
      const sanitizedAccount = {
        ...account,
        credentials: undefined,
        hasCredentials: !!account.credentials
      };

      res.json({
        success: true,
        data: sanitizedAccount
      });
    } catch (error: any) {
      console.error('Error fetching shipping account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shipping account',
        message: error.message
      });
    }
  }

  /**
   * Create a new shipping account
   * POST /api/v1/shipping/accounts
   */
  async createAccount(req: Request, res: Response) {
    try {
      const { name, companyId, credentials, baseUrl, isPrimary, isActive } = req.body;

      // Validate required fields
      if (!name || !companyId || !credentials) {
        return res.status(400).json({
          success: false,
          error: 'Name, companyId, and credentials are required'
        });
      }

      // Verify company exists
      const company = await prisma.shippingCompany.findUnique({
        where: { id: companyId }
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Shipping company not found'
        });
      }

      // If setting as primary, unset other primary accounts for this company
      if (isPrimary) {
        await prisma.shippingAccount.updateMany({
          where: {
            companyId,
            isPrimary: true
          },
          data: {
            isPrimary: false
          }
        });
      }

      const account = await prisma.shippingAccount.create({
        data: {
          name,
          companyId,
          credentials,
          baseUrl: baseUrl || null,
          isPrimary: isPrimary || false,
          isActive: isActive !== undefined ? isActive : true
        },
        include: {
          company: true
        }
      });

      res.status(201).json({
        success: true,
        data: {
          ...account,
          credentials: undefined,
          hasCredentials: true
        },
        message: 'Shipping account created successfully'
      });
    } catch (error: any) {
      console.error('Error creating shipping account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create shipping account',
        message: error.message
      });
    }
  }

  /**
   * Update a shipping account
   * PUT /api/v1/shipping/accounts/:id
   */
  async updateAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, credentials, baseUrl, isPrimary, isActive } = req.body;

      // Check if account exists
      const existingAccount = await prisma.shippingAccount.findUnique({
        where: { id }
      });

      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          error: 'Shipping account not found'
        });
      }

      // If setting as primary, unset other primary accounts for this company
      if (isPrimary && !existingAccount.isPrimary) {
        await prisma.shippingAccount.updateMany({
          where: {
            companyId: existingAccount.companyId,
            isPrimary: true,
            id: { not: id }
          },
          data: {
            isPrimary: false
          }
        });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (credentials) updateData.credentials = credentials;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (isPrimary !== undefined) updateData.isPrimary = isPrimary;
      if (isActive !== undefined) updateData.isActive = isActive;

      const account = await prisma.shippingAccount.update({
        where: { id },
        data: updateData,
        include: {
          company: true
        }
      });

      res.json({
        success: true,
        data: {
          ...account,
          credentials: undefined,
          hasCredentials: true
        },
        message: 'Shipping account updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating shipping account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shipping account',
        message: error.message
      });
    }
  }

  /**
   * Soft delete a shipping account
   * DELETE /api/v1/shipping/accounts/:id
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if account exists
      const account = await prisma.shippingAccount.findUnique({
        where: { id },
        include: {
          stores: true
        }
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Shipping account not found'
        });
      }

      // Check if account is linked to any stores
      if (account.stores.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete account that is linked to stores',
          linkedStores: account.stores.map(s => s.storeName)
        });
      }

      // Soft delete by setting isActive to false
      await prisma.shippingAccount.update({
        where: { id },
        data: {
          isActive: false
        }
      });

      res.json({
        success: true,
        message: 'Shipping account deactivated successfully'
      });
    } catch (error: any) {
      console.error('Error deleting shipping account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete shipping account',
        message: error.message
      });
    }
  }

  /**
   * Test connection for a shipping account
   * POST /api/v1/shipping/accounts/:id/test
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const account = await prisma.shippingAccount.findUnique({
        where: { id },
        include: {
          company: true
        }
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Shipping account not found'
        });
      }

      // Create provider instance
      const provider = ShippingProviderFactory.createProvider(
        account.company.slug,
        account.credentials as Record<string, any>,
        this.redis,
        account.baseUrl || undefined
      );

      // Test connection
      const startTime = Date.now();
      const isConnected = await provider.testConnection();
      const responseTime = Date.now() - startTime;

      // Update test results
      await prisma.shippingAccount.update({
        where: { id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: isConnected ? 'success' : 'error',
          lastTestError: isConnected ? null : 'Connection test failed'
        }
      });

      res.json({
        success: true,
        data: {
          accountId: id,
          accountName: account.name,
          companyName: account.company.name,
          isConnected,
          responseTime,
          testedAt: new Date()
        },
        message: isConnected 
          ? 'Connection test successful' 
          : 'Connection test failed'
      });
    } catch (error: any) {
      console.error('Error testing connection:', error);

      // Update test results with error
      try {
        await prisma.shippingAccount.update({
          where: { id: req.params.id },
          data: {
            lastTestAt: new Date(),
            lastTestStatus: 'error',
            lastTestError: error.message
          }
        });
      } catch (updateError) {
        console.error('Error updating test results:', updateError);
      }

      res.status(500).json({
        success: false,
        error: 'Connection test failed',
        message: error.message
      });
    }
  }

  /**
   * Test connection with credentials (without saving)
   * POST /api/v1/shipping/accounts/test-credentials
   */
  async testCredentials(req: Request, res: Response) {
    try {
      const { companySlug, credentials, baseUrl } = req.body;

      if (!companySlug || !credentials) {
        return res.status(400).json({
          success: false,
          error: 'Company slug and credentials are required'
        });
      }

      // Verify company exists
      const company = await prisma.shippingCompany.findUnique({
        where: { slug: companySlug }
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Shipping company not found'
        });
      }

      // Create provider instance
      const provider = ShippingProviderFactory.createProvider(
        companySlug,
        credentials,
        this.redis,
        baseUrl
      );

      // Test connection
      const startTime = Date.now();
      const isConnected = await provider.testConnection();
      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          companyName: company.name,
          companySlug,
          isConnected,
          responseTime,
          testedAt: new Date()
        },
        message: isConnected 
          ? 'Credentials are valid' 
          : 'Credentials test failed'
      });
    } catch (error: any) {
      console.error('Error testing credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Credentials test failed',
        message: error.message
      });
    }
  }
}