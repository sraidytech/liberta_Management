import { Request, Response } from 'express';
import { satisfactionAnalyticsService } from '../../services/satisfaction-analytics.service';

export class SatisfactionAnalyticsController {
  /**
   * Get comprehensive satisfaction analytics overview
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      // Get all analytics data
      const [
        overview,
        trendData,
        agentPerformance,
        storePerformance,
        productSatisfaction,
        wilayaSatisfaction
      ] = await Promise.all([
        satisfactionAnalyticsService.getOverviewMetrics(dateRange),
        satisfactionAnalyticsService.getTrendData('daily', dateRange),
        satisfactionAnalyticsService.getAgentPerformance(undefined, dateRange),
        satisfactionAnalyticsService.getStorePerformance(undefined, dateRange),
        satisfactionAnalyticsService.getProductSatisfaction(undefined, dateRange),
        satisfactionAnalyticsService.getWilayaSatisfaction(undefined, dateRange)
      ]);

      res.json({
        success: true,
        data: {
          overview,
          trends: {
            daily: trendData
          },
          agentPerformance,
          storePerformance,
          productSatisfaction,
          wilayaSatisfaction
        }
      });
    } catch (error) {
      console.error('Error getting satisfaction analytics:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get satisfaction analytics'
      });
    }
  }

  /**
   * Get overview metrics only
   */
  static async getOverview(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const overview = await satisfactionAnalyticsService.getOverviewMetrics(dateRange);

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error getting satisfaction overview:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get satisfaction overview'
      });
    }
  }

  /**
   * Get trend data
   */
  static async getTrends(req: Request, res: Response) {
    try {
      const { period = 'daily', dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const trendData = await satisfactionAnalyticsService.getTrendData(
        period as 'daily' | 'weekly' | 'monthly',
        dateRange
      );

      res.json({
        success: true,
        data: trendData
      });
    } catch (error) {
      console.error('Error getting satisfaction trends:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get satisfaction trends'
      });
    }
  }

  /**
   * Get agent performance
   */
  static async getAgentPerformance(req: Request, res: Response) {
    try {
      const { agentId, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const agentPerformance = await satisfactionAnalyticsService.getAgentPerformance(
        agentId as string | undefined,
        dateRange
      );

      res.json({
        success: true,
        data: agentPerformance
      });
    } catch (error) {
      console.error('Error getting agent performance:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get agent performance'
      });
    }
  }

  /**
   * Get store performance
   */
  static async getStorePerformance(req: Request, res: Response) {
    try {
      const { storeId, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const storePerformance = await satisfactionAnalyticsService.getStorePerformance(
        storeId as string | undefined,
        dateRange
      );

      res.json({
        success: true,
        data: storePerformance
      });
    } catch (error) {
      console.error('Error getting store performance:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get store performance'
      });
    }
  }

  /**
   * Get product satisfaction
   */
  static async getProductSatisfaction(req: Request, res: Response) {
    try {
      const { productName, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const productSatisfaction = await satisfactionAnalyticsService.getProductSatisfaction(
        productName as string | undefined,
        dateRange
      );

      res.json({
        success: true,
        data: productSatisfaction
      });
    } catch (error) {
      console.error('Error getting product satisfaction:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get product satisfaction'
      });
    }
  }

  /**
   * Get wilaya satisfaction
   */
  static async getWilayaSatisfaction(req: Request, res: Response) {
    try {
      const { wilaya, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const wilayaSatisfaction = await satisfactionAnalyticsService.getWilayaSatisfaction(
        wilaya as string | undefined,
        dateRange
      );

      res.json({
        success: true,
        data: wilayaSatisfaction
      });
    } catch (error) {
      console.error('Error getting wilaya satisfaction:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get wilaya satisfaction'
      });
    }
  }
}