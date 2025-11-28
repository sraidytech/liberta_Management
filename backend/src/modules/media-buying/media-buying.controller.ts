import { Request, Response } from 'express';
import { mediaBuyingService } from './media-buying.service';

class MediaBuyingController {
  // ============================================
  // AD SOURCES
  // ============================================

  async getSources(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const sources = await mediaBuyingService.getSources(includeInactive);
      
      res.json({
        success: true,
        data: sources,
      });
    } catch (error: any) {
      console.error('Error fetching sources:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async createSource(req: any, res: Response) {
    try {
      const source = await mediaBuyingService.createSource(req.body);
      
      res.status(201).json({
        success: true,
        data: source,
      });
    } catch (error: any) {
      console.error('Error creating source:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async updateSource(req: any, res: Response) {
    try {
      const { id } = req.params;
      const source = await mediaBuyingService.updateSource(id, req.body);
      
      res.json({
        success: true,
        data: source,
      });
    } catch (error: any) {
      console.error('Error updating source:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // ENTRIES
  // ============================================

  async getEntries(req: Request, res: Response) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sourceId: req.query.sourceId as string,
        storeId: req.query.storeId as string,
        productId: req.query.productId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await mediaBuyingService.getEntries(filters);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching entries:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getEntryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entry = await mediaBuyingService.getEntryById(id);
      
      if (!entry) {
        return res.status(404).json({
          success: false,
          error: { message: 'Entry not found' },
        });
      }

      res.json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Error fetching entry:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async createEntry(req: any, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const entry = await mediaBuyingService.createEntry(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Error creating entry:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async updateEntry(req: any, res: Response) {
    try {
      const { id } = req.params;
      const entry = await mediaBuyingService.updateEntry(id, req.body);
      
      res.json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      console.error('Error updating entry:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async deleteEntry(req: any, res: Response) {
    try {
      const { id } = req.params;
      await mediaBuyingService.deleteEntry(id);
      
      res.json({
        success: true,
        message: 'Entry deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  async getDashboardStats(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const stats = await mediaBuyingService.getDashboardStats(startDate, endDate);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getAnalyticsBySource(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const analytics = await mediaBuyingService.getAnalyticsBySource(startDate, endDate);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      console.error('Error fetching analytics by source:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getConversionAnalytics(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const analytics = await mediaBuyingService.getConversionAnalytics(startDate, endDate);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      console.error('Error fetching conversion analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // BUDGETS
  // ============================================

  async getBudgets(req: Request, res: Response) {
    try {
      const filters = {
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        sourceId: req.query.sourceId as string,
      };

      const budgets = await mediaBuyingService.getBudgets(filters);
      
      res.json({
        success: true,
        data: budgets,
      });
    } catch (error: any) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async createBudget(req: any, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const budget = await mediaBuyingService.createBudget(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: budget,
      });
    } catch (error: any) {
      console.error('Error creating budget:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async updateBudget(req: any, res: Response) {
    try {
      const { id } = req.params;
      const budget = await mediaBuyingService.updateBudget(id, req.body);
      
      res.json({
        success: true,
        data: budget,
      });
    } catch (error: any) {
      console.error('Error updating budget:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getBudgetStatus(req: Request, res: Response) {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      const status = await mediaBuyingService.getBudgetStatus(month, year);
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('Error fetching budget status:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // ALERTS
  // ============================================

  async getAlerts(req: Request, res: Response) {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const alerts = await mediaBuyingService.getAlerts(unreadOnly);
      
      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async markAlertAsRead(req: any, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const { id } = req.params;
      const alert = await mediaBuyingService.markAlertAsRead(id, req.user.id);
      
      res.json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      console.error('Error marking alert as read:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // CONVERSIONS
  // ============================================

  async linkLeadToOrder(req: any, res: Response) {
    try {
      const conversion = await mediaBuyingService.linkLeadToOrder(req.body);
      
      res.status(201).json({
        success: true,
        data: conversion,
      });
    } catch (error: any) {
      console.error('Error linking lead to order:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async unlinkLeadFromOrder(req: any, res: Response) {
    try {
      const { id } = req.params;
      await mediaBuyingService.unlinkLeadFromOrder(id);
      
      res.json({
        success: true,
        message: 'Conversion unlinked successfully',
      });
    } catch (error: any) {
      console.error('Error unlinking lead from order:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getConversions(req: Request, res: Response) {
    try {
      const entryId = req.query.entryId as string;
      const conversions = await mediaBuyingService.getConversions(entryId);
      
      res.json({
        success: true,
        data: conversions,
      });
    } catch (error: any) {
      console.error('Error fetching conversions:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // EXCHANGE RATES
  // ============================================

  async getExchangeRates(req: Request, res: Response) {
    try {
      const rates = await mediaBuyingService.getExchangeRates();
      
      res.json({
        success: true,
        data: rates,
      });
    } catch (error: any) {
      console.error('Error fetching exchange rates:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async getLatestExchangeRate(req: Request, res: Response) {
    try {
      const fromCurrency = (req.query.from as string) || 'USD';
      const toCurrency = (req.query.to as string) || 'DZD';
      
      const rate = await mediaBuyingService.getLatestExchangeRate(fromCurrency, toCurrency);
      
      res.json({
        success: true,
        data: rate,
      });
    } catch (error: any) {
      console.error('Error fetching latest exchange rate:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  async createExchangeRate(req: any, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const rate = await mediaBuyingService.createExchangeRate(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: rate,
      });
    } catch (error: any) {
      console.error('Error creating exchange rate:', error);
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
  }

  // ============================================
  // EXPORT
  // ============================================

  async exportData(req: Request, res: Response) {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'csv';
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sourceId: req.query.sourceId as string,
        storeId: req.query.storeId as string,
        productId: req.query.productId as string,
      };

      const data = await mediaBuyingService.exportData(format, filters);
      
      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `media-buying-export-${new Date().toISOString().split('T')[0]}.${format}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message },
      });
    }
  }
}

export const mediaBuyingController = new MediaBuyingController();