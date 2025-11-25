import { Request, Response } from 'express';
import { ticketAnalyticsService } from '../../services/ticket-analytics.service';

export class TicketAnalyticsController {
  /**
   * Get comprehensive ticket analytics
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
        categoryDistribution,
        priorityDistribution,
        trendData,
        agentAnalysis,
        ticketAging,
        criticalSummary
      ] = await Promise.all([
        ticketAnalyticsService.getOverviewMetrics(dateRange),
        ticketAnalyticsService.getCategoryDistribution(dateRange),
        ticketAnalyticsService.getPriorityDistribution(dateRange),
        ticketAnalyticsService.getTrendData('daily', dateRange),
        ticketAnalyticsService.getAgentTicketAnalysis(undefined, dateRange),
        ticketAnalyticsService.getTicketAging(dateRange),
        ticketAnalyticsService.getCriticalTicketsSummary(dateRange)
      ]);

      res.json({
        success: true,
        data: {
          overview,
          categoryDistribution,
          priorityDistribution,
          trends: {
            daily: trendData
          },
          agentAnalysis,
          ticketAging,
          criticalSummary
        }
      });
    } catch (error) {
      console.error('Error getting ticket analytics:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket analytics'
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

      const overview = await ticketAnalyticsService.getOverviewMetrics(dateRange);

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error getting ticket overview:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket overview'
      });
    }
  }

  /**
   * Get category distribution
   */
  static async getCategoryDistribution(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const distribution = await ticketAnalyticsService.getCategoryDistribution(dateRange);

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Error getting category distribution:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get category distribution'
      });
    }
  }

  /**
   * Get priority distribution
   */
  static async getPriorityDistribution(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const distribution = await ticketAnalyticsService.getPriorityDistribution(dateRange);

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Error getting priority distribution:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get priority distribution'
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

      const trendData = await ticketAnalyticsService.getTrendData(
        period as 'daily' | 'weekly' | 'monthly',
        dateRange
      );

      res.json({
        success: true,
        data: trendData
      });
    } catch (error) {
      console.error('Error getting ticket trends:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket trends'
      });
    }
  }

  /**
   * Get agent ticket analysis
   */
  static async getAgentAnalysis(req: Request, res: Response) {
    try {
      const { agentId, dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const agentAnalysis = await ticketAnalyticsService.getAgentTicketAnalysis(
        agentId as string | undefined,
        dateRange
      );

      res.json({
        success: true,
        data: agentAnalysis
      });
    } catch (error) {
      console.error('Error getting agent analysis:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get agent analysis'
      });
    }
  }

  /**
   * Get ticket aging analysis
   */
  static async getTicketAging(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const aging = await ticketAnalyticsService.getTicketAging(dateRange);

      res.json({
        success: true,
        data: aging
      });
    } catch (error) {
      console.error('Error getting ticket aging:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get ticket aging'
      });
    }
  }

  /**
   * Get critical tickets summary
   */
  static async getCriticalSummary(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      const dateRange = {
        from: dateFrom ? new Date(dateFrom as string) : undefined,
        to: dateTo ? new Date(dateTo as string) : undefined,
      };

      const summary = await ticketAnalyticsService.getCriticalTicketsSummary(dateRange);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting critical summary:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get critical summary'
      });
    }
  }
}