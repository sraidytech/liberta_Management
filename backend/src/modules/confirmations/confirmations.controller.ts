import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class ConfirmationsController {
  
  /**
   * Get confirmation data for an order
   * GET /api/confirmations/order/:orderId
   */
  async getOrderConfirmation(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      
      const confirmation = await prisma.orderConfirmation.findUnique({
        where: { orderId },
        include: {
          order: {
            select: {
              reference: true,
              status: true,
              customer: {
                select: {
                  fullName: true,
                  telephone: true
                }
              }
            }
          }
        }
      });
      
      if (!confirmation) {
        return res.status(404).json({ error: 'Confirmation not found' });
      }
      
      return res.json(confirmation);
    } catch (error) {
      console.error('Error fetching confirmation:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get confirmations by confirmator
   * GET /api/confirmations/confirmator/:confirmatorId
   */
  async getConfirmationsByConfirmator(req: Request, res: Response): Promise<Response> {
    try {
      const { confirmatorId } = req.params;
      const { storeIdentifier, startDate, endDate, page = '1', limit = '50' } = req.query;
      
      const where: any = {
        confirmatorId: parseInt(confirmatorId)
      };
      
      if (storeIdentifier) {
        where.storeIdentifier = storeIdentifier;
      }
      
      if (startDate || endDate) {
        where.confirmedAt = {};
        if (startDate) where.confirmedAt.gte = new Date(startDate as string);
        if (endDate) where.confirmedAt.lte = new Date(endDate as string);
      }
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const [confirmations, total] = await Promise.all([
        prisma.orderConfirmation.findMany({
          where,
          orderBy: { confirmedAt: 'desc' },
          skip,
          take: parseInt(limit as string)
        }),
        prisma.orderConfirmation.count({ where })
      ]);
      
      return res.json({
        data: confirmations,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error fetching confirmations:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get confirmation statistics
   * GET /api/confirmations/stats
   */
  async getConfirmationStats(req: Request, res: Response): Promise<Response> {
    try {
      const { storeIdentifier, startDate, endDate } = req.query;
      
      const where: any = {};
      
      if (storeIdentifier) {
        where.storeIdentifier = storeIdentifier;
      }
      
      if (startDate || endDate) {
        where.confirmedAt = {};
        if (startDate) where.confirmedAt.gte = new Date(startDate as string);
        if (endDate) where.confirmedAt.lte = new Date(endDate as string);
      }
      
      // Get confirmator statistics
      const confirmatorStats = await prisma.orderConfirmation.groupBy({
        by: ['confirmatorName', 'storeIdentifier'],
        where,
        _count: true,
        orderBy: {
          _count: {
            confirmatorName: 'desc'
          }
        }
      });
      
      // Get confirmation state distribution
      const stateStats = await prisma.orderConfirmation.groupBy({
        by: ['confirmationState', 'storeIdentifier'],
        where,
        _count: true
      });
      
      // Get total counts
      const totalConfirmations = await prisma.orderConfirmation.count({ where });
      const withConfirmator = await prisma.orderConfirmation.count({
        where: { ...where, confirmatorId: { not: null } }
      });
      
      return res.json({
        total: totalConfirmations,
        withConfirmator,
        withoutConfirmator: totalConfirmations - withConfirmator,
        confirmatorStats,
        stateStats
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get confirmator performance with confirmation rates
   * GET /api/confirmations/performance
   * Query params:
   * - storeIdentifier: Filter by specific store
   * - aggregated: 'true' to aggregate by confirmator across all stores (default: true)
   * - startDate, endDate: Date range filter
   */
  async getConfirmatorPerformance(req: Request, res: Response): Promise<Response> {
    try {
      const { storeIdentifier, startDate, endDate, aggregated = 'true' } = req.query;
      
      const where: any = {};
      
      if (storeIdentifier) {
        where.storeIdentifier = storeIdentifier;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }
      
      const isAggregated = aggregated === 'true';
      
      if (isAggregated) {
        // AGGREGATED VIEW: Group by confirmator across all stores
        const confirmatorData = await prisma.orderConfirmation.groupBy({
          by: ['confirmatorId', 'confirmatorName'],
          where: {
            ...where,
            confirmatorId: { not: null }
          },
          _count: true
        });
        
        // Calculate confirmation rates for each confirmator (aggregated)
        const performance = await Promise.all(
          confirmatorData.map(async (confirmator) => {
            // Total orders across all stores for this confirmator
            const totalOrders = await prisma.orderConfirmation.count({
              where: {
                ...where,
                confirmatorId: confirmator.confirmatorId
              }
            });
            
            // Confirmed orders across all stores
            const confirmed = await prisma.orderConfirmation.count({
              where: {
                ...where,
                confirmatorId: confirmator.confirmatorId,
                confirmationState: { not: null, notIn: ['-', 'N/A', ''] }
              }
            });
            
            // Get stores this confirmator works in
            const stores = await prisma.orderConfirmation.groupBy({
              by: ['storeIdentifier'],
              where: {
                ...where,
                confirmatorId: confirmator.confirmatorId
              }
            });
            
            // Calculate confirmation rate: (confirmed / total) * 100
            const confirmationRate = totalOrders > 0
              ? ((confirmed / totalOrders) * 100)
              : 0;
            
            return {
              confirmatorId: confirmator.confirmatorId,
              confirmatorName: confirmator.confirmatorName,
              storeIdentifier: 'ALL', // Indicates aggregated data
              stores: stores.map(s => s.storeIdentifier), // List of stores
              totalOrders,
              totalConfirmed: confirmed,
              confirmationRate: parseFloat(confirmationRate.toFixed(2))
            };
          })
        );
        
        // Sort by confirmation rate descending
        performance.sort((a, b) => b.confirmationRate - a.confirmationRate);
        
        // Calculate unique confirmators count
        const uniqueConfirmators = new Set(performance.map(p => p.confirmatorId)).size;
        
        return res.json({
          data: performance,
          summary: {
            totalConfirmators: uniqueConfirmators,
            averageRate: performance.length > 0
              ? (performance.reduce((sum, p) => sum + p.confirmationRate, 0) / performance.length).toFixed(2)
              : '0.00'
          }
        });
      } else {
        // PER-STORE VIEW: Group by confirmator AND store
        const confirmatorData = await prisma.orderConfirmation.groupBy({
          by: ['confirmatorId', 'confirmatorName', 'storeIdentifier'],
          where: {
            ...where,
            confirmatorId: { not: null }
          },
          _count: true
        });
        
        // Calculate confirmation rates for each confirmator per store
        const performance = await Promise.all(
          confirmatorData.map(async (confirmator) => {
            // Total orders for this confirmator in this store
            const totalOrders = await prisma.orderConfirmation.count({
              where: {
                ...where,
                confirmatorId: confirmator.confirmatorId,
                storeIdentifier: confirmator.storeIdentifier
              }
            });
            
            // Confirmed orders in this store
            const confirmed = await prisma.orderConfirmation.count({
              where: {
                ...where,
                confirmatorId: confirmator.confirmatorId,
                storeIdentifier: confirmator.storeIdentifier,
                confirmationState: { not: null, notIn: ['-', 'N/A', ''] }
              }
            });
            
            // Calculate confirmation rate: (confirmed / total) * 100
            const confirmationRate = totalOrders > 0
              ? ((confirmed / totalOrders) * 100)
              : 0;
            
            return {
              confirmatorId: confirmator.confirmatorId,
              confirmatorName: confirmator.confirmatorName,
              storeIdentifier: confirmator.storeIdentifier,
              stores: [confirmator.storeIdentifier],
              totalOrders,
              totalConfirmed: confirmed,
              confirmationRate: parseFloat(confirmationRate.toFixed(2))
            };
          })
        );
        
        // Sort by confirmation rate descending
        performance.sort((a, b) => b.confirmationRate - a.confirmationRate);
        
        return res.json({
          data: performance,
          summary: {
            totalConfirmators: performance.length,
            averageRate: performance.length > 0
              ? (performance.reduce((sum, p) => sum + p.confirmationRate, 0) / performance.length).toFixed(2)
              : '0.00'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching confirmator performance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get paginated list of confirmations
   * GET /api/confirmations/list
   */
  async getConfirmationsList(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        storeIdentifier, 
        confirmationState,
        startDate, 
        endDate, 
        page = '1', 
        limit = '50',
        search
      } = req.query;
      
      const where: any = {};
      
      if (storeIdentifier) {
        where.storeIdentifier = storeIdentifier;
      }
      
      if (confirmationState) {
        where.confirmationState = confirmationState;
      }
      
      if (startDate || endDate) {
        where.confirmedAt = {};
        if (startDate) where.confirmedAt.gte = new Date(startDate as string);
        if (endDate) where.confirmedAt.lte = new Date(endDate as string);
      }
      
      if (search) {
        where.OR = [
          { orderReference: { contains: search as string, mode: 'insensitive' } },
          { confirmatorName: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const [confirmations, total] = await Promise.all([
        prisma.orderConfirmation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
          include: {
            order: {
              select: {
                reference: true,
                status: true
              }
            }
          }
        }),
        prisma.orderConfirmation.count({ where })
      ]);
      
      return res.json({
        data: confirmations,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error fetching confirmations list:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get list of all stores with confirmations
   * GET /api/confirmations/stores
   */
  async getStores(req: Request, res: Response): Promise<Response> {
    try {
      const stores = await prisma.orderConfirmation.groupBy({
        by: ['storeIdentifier'],
        _count: {
          storeIdentifier: true
        },
        orderBy: {
          storeIdentifier: 'asc'
        }
      });

      return res.json({
        data: stores.map(s => ({
          identifier: s.storeIdentifier,
          count: s._count.storeIdentifier
        }))
      });
    } catch (error) {
      console.error('Error fetching stores:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}