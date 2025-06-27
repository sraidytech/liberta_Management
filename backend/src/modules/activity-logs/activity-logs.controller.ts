import { Request, Response } from 'express';
import { ActivityLogService } from '../../services/activity-log.service';
import { ActivityLogFilters, ActivityLogQuery } from '../../types';
import { ActionType, LogLevel } from '@prisma/client';

export class ActivityLogsController {
  /**
   * Get activity logs with filtering and pagination
   */
  static async getLogs(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        userId,
        actionType,
        logLevel,
        resourceType,
        resourceId,
        dateFrom,
        dateTo,
        search,
      } = req.query;

      const filters: ActivityLogFilters = {};

      if (userId) filters.userId = userId as string;
      if (actionType) filters.actionType = actionType as ActionType;
      if (logLevel) filters.logLevel = logLevel as LogLevel;
      if (resourceType) filters.resourceType = resourceType as string;
      if (resourceId) filters.resourceId = resourceId as string;
      if (search) filters.search = search as string;

      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom as string);
      }
      if (dateTo) {
        filters.dateTo = new Date(dateTo as string);
      }

      const result = await ActivityLogService.getLogs(
        filters,
        parseInt(page as string),
        parseInt(limit as string),
        sortBy as string,
        sortOrder as 'asc' | 'desc'
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get activity logs for a specific user
   */
  static async getUserLogs(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await ActivityLogService.getUserLogs(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get activity logs for a specific resource
   */
  static async getResourceLogs(req: Request, res: Response) {
    try {
      const { resourceType, resourceId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await ActivityLogService.getResourceLogs(
        resourceType,
        resourceId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching resource activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource activity logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get system logs
   */
  static async getSystemLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const result = await ActivityLogService.getSystemLogs(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching system logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get error logs
   */
  static async getErrorLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const result = await ActivityLogService.getErrorLogs(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching error logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch error logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get authentication logs
   */
  static async getAuthLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;

      const result = await ActivityLogService.getAuthLogs(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching authentication logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch authentication logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (dateFrom) {
        fromDate = new Date(dateFrom as string);
      }
      if (dateTo) {
        toDate = new Date(dateTo as string);
      }

      const stats = await ActivityLogService.getActivityStats(fromDate, toDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching activity statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete old logs (admin only)
   */
  static async deleteOldLogs(req: Request, res: Response) {
    try {
      const { daysToKeep = 90 } = req.body;

      const deletedCount = await ActivityLogService.deleteOldLogs(
        parseInt(daysToKeep)
      );

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} old log entries`,
        deletedCount,
      });
    } catch (error) {
      console.error('Error deleting old logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete old logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get available filter options
   */
  static async getFilterOptions(req: Request, res: Response) {
    try {
      const actionTypes = Object.values(ActionType);
      const logLevels = Object.values(LogLevel);

      res.json({
        success: true,
        data: {
          actionTypes,
          logLevels,
        },
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch filter options',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}