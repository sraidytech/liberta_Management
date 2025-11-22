/**
 * Shipping Companies Controller
 * 
 * Handles CRUD operations for shipping companies (Maystro, Guepex, Nord West)
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ShippingCompaniesController {
  /**
   * Get all shipping companies
   * GET /api/v1/shipping/companies
   */
  async getAllCompanies(req: Request, res: Response) {
    try {
      const companies = await prisma.shippingCompany.findMany({
        include: {
          accounts: {
            select: {
              id: true,
              name: true,
              isActive: true,
              isPrimary: true,
              lastUsed: true,
              requestCount: true,
              successCount: true,
              errorCount: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: companies
      });
    } catch (error: any) {
      console.error('Error fetching shipping companies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shipping companies',
        message: error.message
      });
    }
  }

  /**
   * Get a specific shipping company by ID
   * GET /api/v1/shipping/companies/:id
   */
  async getCompanyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.shippingCompany.findUnique({
        where: { id },
        include: {
          accounts: {
            select: {
              id: true,
              name: true,
              isActive: true,
              isPrimary: true,
              lastUsed: true,
              requestCount: true,
              successCount: true,
              errorCount: true,
              lastTestAt: true,
              lastTestStatus: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Shipping company not found'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error: any) {
      console.error('Error fetching shipping company:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shipping company',
        message: error.message
      });
    }
  }

  /**
   * Create a new shipping company (Admin only)
   * POST /api/v1/shipping/companies
   */
  async createCompany(req: Request, res: Response) {
    try {
      const { name, slug, isActive } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          error: 'Name and slug are required'
        });
      }

      // Check if company with same slug already exists
      const existingCompany = await prisma.shippingCompany.findUnique({
        where: { slug }
      });

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          error: 'A shipping company with this slug already exists'
        });
      }

      const company = await prisma.shippingCompany.create({
        data: {
          name,
          slug,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      res.status(201).json({
        success: true,
        data: company,
        message: 'Shipping company created successfully'
      });
    } catch (error: any) {
      console.error('Error creating shipping company:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create shipping company',
        message: error.message
      });
    }
  }

  /**
   * Update a shipping company (Admin only)
   * PUT /api/v1/shipping/companies/:id
   */
  async updateCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, slug, isActive } = req.body;

      // Check if company exists
      const existingCompany = await prisma.shippingCompany.findUnique({
        where: { id }
      });

      if (!existingCompany) {
        return res.status(404).json({
          success: false,
          error: 'Shipping company not found'
        });
      }

      // If slug is being changed, check for conflicts
      if (slug && slug !== existingCompany.slug) {
        const conflictingCompany = await prisma.shippingCompany.findUnique({
          where: { slug }
        });

        if (conflictingCompany) {
          return res.status(409).json({
            success: false,
            error: 'A shipping company with this slug already exists'
          });
        }
      }

      const company = await prisma.shippingCompany.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(isActive !== undefined && { isActive })
        }
      });

      res.json({
        success: true,
        data: company,
        message: 'Shipping company updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating shipping company:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shipping company',
        message: error.message
      });
    }
  }

  /**
   * Get shipping company statistics
   * GET /api/v1/shipping/companies/:id/stats
   */
  async getCompanyStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.shippingCompany.findUnique({
        where: { id },
        include: {
          accounts: true
        }
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Shipping company not found'
        });
      }

      // Calculate aggregate statistics
      const stats = {
        totalAccounts: company.accounts.length,
        activeAccounts: company.accounts.filter(a => a.isActive).length,
        totalRequests: company.accounts.reduce((sum, a) => sum + a.requestCount, 0),
        totalSuccess: company.accounts.reduce((sum, a) => sum + a.successCount, 0),
        totalErrors: company.accounts.reduce((sum, a) => sum + a.errorCount, 0),
        successRate: 0,
        lastUsed: company.accounts
          .filter(a => a.lastUsed)
          .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))[0]?.lastUsed || null
      };

      if (stats.totalRequests > 0) {
        stats.successRate = (stats.totalSuccess / stats.totalRequests) * 100;
      }

      res.json({
        success: true,
        data: {
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            isActive: company.isActive
          },
          stats
        }
      });
    } catch (error: any) {
      console.error('Error fetching company stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch company statistics',
        message: error.message
      });
    }
  }
}