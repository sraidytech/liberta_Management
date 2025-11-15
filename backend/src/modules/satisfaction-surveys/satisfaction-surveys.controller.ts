import { Request, Response } from 'express';
import { satisfactionSurveyService } from '@/services/satisfaction-survey.service';
import { satisfactionAnalyticsService } from '@/services/satisfaction-analytics.service';

export class SatisfactionSurveysController {
  /**
   * Create a new satisfaction survey
   * POST /api/v1/satisfaction-surveys
   */
  async createSurvey(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const {
        orderId,
        overallRating,
        deliverySpeedRating,
        productQualityRating,
        agentServiceRating,
        packagingRating,
        customerComments,
        internalNotes,
      } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Order ID is required' },
        });
      }

      const survey = await satisfactionSurveyService.createSurvey(
        {
          orderId,
          overallRating,
          deliverySpeedRating,
          productQualityRating,
          agentServiceRating,
          packagingRating,
          customerComments,
          internalNotes,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: survey,
        message: 'Satisfaction survey created successfully',
      });
    } catch (error) {
      console.error('Error creating satisfaction survey:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create satisfaction survey',
        },
      });
    }
  }

  /**
   * Update existing survey (re-survey)
   * PUT /api/v1/satisfaction-surveys/:orderId
   */
  async updateSurvey(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Unauthorized' },
        });
      }

      const { orderId } = req.params;
      const {
        overallRating,
        deliverySpeedRating,
        productQualityRating,
        agentServiceRating,
        packagingRating,
        customerComments,
        internalNotes,
      } = req.body;

      const survey = await satisfactionSurveyService.updateSurvey(
        orderId,
        {
          orderId,
          overallRating,
          deliverySpeedRating,
          productQualityRating,
          agentServiceRating,
          packagingRating,
          customerComments,
          internalNotes,
        },
        userId
      );

      res.json({
        success: true,
        data: survey,
        message: 'Satisfaction survey updated successfully',
      });
    } catch (error) {
      console.error('Error updating satisfaction survey:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update satisfaction survey',
        },
      });
    }
  }

  /**
   * Get survey by order ID
   * GET /api/v1/satisfaction-surveys/order/:orderId
   */
  async getSurveyByOrderId(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const survey = await satisfactionSurveyService.getSurveyByOrderId(orderId);

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: { message: 'Survey not found for this order' },
        });
      }

      res.json({
        success: true,
        data: survey,
      });
    } catch (error) {
      console.error('Error fetching survey:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch survey',
        },
      });
    }
  }

  /**
   * Get survey history for an order
   * GET /api/v1/satisfaction-surveys/order/:orderId/history
   */
  async getSurveyHistory(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const history = await satisfactionSurveyService.getSurveyHistory(orderId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching survey history:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch survey history',
        },
      });
    }
  }

  /**
   * List surveys with filters
   * GET /api/v1/satisfaction-surveys
   */
  async listSurveys(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '20',
        orderId,
        customerId,
        collectedById,
        minRating,
        maxRating,
        dateFrom,
        dateTo,
        sortBy = 'date',
      } = req.query;

      const filters = {
        orderId: orderId as string,
        customerId: customerId as string,
        collectedById: collectedById as string,
        minRating: minRating ? parseInt(minRating as string) : undefined,
        maxRating: maxRating ? parseInt(maxRating as string) : undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      const result = await satisfactionSurveyService.listSurveys(
        filters,
        parseInt(page as string),
        parseInt(limit as string),
        sortBy as 'date' | 'rating'
      );

      res.json({
        success: true,
        data: result.surveys,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error listing surveys:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to list surveys',
        },
      });
    }
  }

  /**
   * Get orders without surveys (for reminders)
   * GET /api/v1/satisfaction-surveys/missing
   */
  async getOrdersWithoutSurveys(req: Request, res: Response) {
    try {
      const { limit = '50' } = req.query;

      const orders = await satisfactionSurveyService.getOrdersWithoutSurveys(
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error('Error fetching orders without surveys:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch orders without surveys',
        },
      });
    }
  }

  /**
   * Delete survey (admin only)
   * DELETE /api/v1/satisfaction-surveys/:id
   */
  async deleteSurvey(req: Request, res: Response) {
    try {
      const userRole = req.user?.role;
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: { message: 'Only administrators can delete surveys' },
        });
      }

      const { id } = req.params;

      await satisfactionSurveyService.deleteSurvey(id);

      res.json({
        success: true,
        message: 'Survey deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting survey:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete survey',
        },
      });
    }
  }

  /**
   * Get satisfaction overview metrics
   * GET /api/v1/satisfaction-surveys/analytics/overview
   */
  async getOverviewMetrics(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const metrics = await satisfactionAnalyticsService.getOverviewMetrics(dateRange);

      // Get trend data
      const trendData = await satisfactionAnalyticsService.getTrendData('daily', dateRange);

      res.json({
        success: true,
        data: {
          ...metrics,
          trendData,
        },
      });
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch overview metrics',
        },
      });
    }
  }

  /**
   * Get agent performance metrics
   * GET /api/v1/satisfaction-surveys/analytics/agents
   */
  async getAgentPerformance(req: Request, res: Response) {
    try {
      const { agentId, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const agents = await satisfactionAnalyticsService.getAgentPerformance(
        agentId as string,
        dateRange
      );

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch agent performance',
        },
      });
    }
  }

  /**
   * Get store performance metrics
   * GET /api/v1/satisfaction-surveys/analytics/stores
   */
  async getStorePerformance(req: Request, res: Response) {
    try {
      const { storeId, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const stores = await satisfactionAnalyticsService.getStorePerformance(
        storeId as string,
        dateRange
      );

      res.json({
        success: true,
        data: stores,
      });
    } catch (error) {
      console.error('Error fetching store performance:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch store performance',
        },
      });
    }
  }

  /**
   * Get product satisfaction metrics
   * GET /api/v1/satisfaction-surveys/analytics/products
   */
  async getProductSatisfaction(req: Request, res: Response) {
    try {
      const { productName, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const products = await satisfactionAnalyticsService.getProductSatisfaction(
        productName as string,
        dateRange
      );

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error('Error fetching product satisfaction:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch product satisfaction',
        },
      });
    }
  }

  /**
   * Get wilaya satisfaction metrics
   * GET /api/v1/satisfaction-surveys/analytics/wilayas
   */
  async getWilayaSatisfaction(req: Request, res: Response) {
    try {
      const { wilaya, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const wilayas = await satisfactionAnalyticsService.getWilayaSatisfaction(
        wilaya as string,
        dateRange
      );

      res.json({
        success: true,
        data: wilayas,
      });
    } catch (error) {
      console.error('Error fetching wilaya satisfaction:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch wilaya satisfaction',
        },
      });
    }
  }

  /**
   * Get low ratings
   * GET /api/v1/satisfaction-surveys/analytics/low-ratings
   */
  async getLowRatings(req: Request, res: Response) {
    try {
      const { threshold = '3', limit = '50' } = req.query;

      const lowRatings = await satisfactionAnalyticsService.getLowRatings(
        parseInt(threshold as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: lowRatings,
      });
    } catch (error) {
      console.error('Error fetching low ratings:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch low ratings',
        },
      });
    }
  }
}

export const satisfactionSurveysController = new SatisfactionSurveysController();