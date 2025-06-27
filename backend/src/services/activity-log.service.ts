import { PrismaClient, ActionType, LogLevel, UserRole } from '@prisma/client';
import { CreateActivityLogRequest, ActivityLogFilters, ActivityLogWithUser, ACTIVITY_ACTIONS } from '../types';

const prisma = new PrismaClient();

export class ActivityLogService {
  private static readonly MAX_LOGS = 6000;

  /**
   * Create a new activity log entry with automatic rotation
   */
  static async createLog(logData: CreateActivityLogRequest): Promise<void> {
    try {
      // Create the new log entry
      await prisma.activityLog.create({
        data: {
          userId: logData.userId,
          userName: logData.userName,
          userRole: logData.userRole as UserRole,
          sessionId: logData.sessionId,
          action: logData.action,
          actionType: logData.actionType,
          description: logData.description,
          logLevel: logData.logLevel || LogLevel.INFO,
          resourceType: logData.resourceType,
          resourceId: logData.resourceId,
          oldValues: logData.oldValues,
          newValues: logData.newValues,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
          endpoint: logData.endpoint,
          httpMethod: logData.httpMethod,
          statusCode: logData.statusCode,
          metadata: logData.metadata,
        },
      });

      // Check if we need to rotate logs (remove old ones)
      await this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Failed to create activity log:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  /**
   * Rotate logs if we exceed the maximum limit
   */
  private static async rotateLogsIfNeeded(): Promise<void> {
    try {
      const totalLogs = await prisma.activityLog.count();
      
      if (totalLogs > this.MAX_LOGS) {
        const excessLogs = totalLogs - this.MAX_LOGS;
        
        // Get the oldest logs to delete
        const oldestLogs = await prisma.activityLog.findMany({
          select: { id: true },
          orderBy: { timestamp: 'asc' },
          take: excessLogs,
        });

        if (oldestLogs.length > 0) {
          const idsToDelete = oldestLogs.map(log => log.id);
          
          await prisma.activityLog.deleteMany({
            where: {
              id: { in: idsToDelete },
            },
          });

          console.log(`🗑️ Rotated ${excessLogs} old activity logs to maintain ${this.MAX_LOGS} limit`);
        }
      }
    } catch (error) {
      console.error('Failed to rotate activity logs:', error);
    }
  }

  /**
   * Get activity logs with filtering and pagination
   */
  static async getLogs(
    filters: ActivityLogFilters = {},
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'timestamp',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      // Always exclude VIEW_PROFILE and PROFILE-related actions
      action: {
        not: {
          contains: 'PROFILE'
        }
      }
    };

    // Apply filters
    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.actionType) {
      where.actionType = filters.actionType;
    }

    if (filters.logLevel) {
      where.logLevel = filters.logLevel;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.timestamp.lte = filters.dateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { userName: { contains: filters.search, mode: 'insensitive' } },
        { resourceType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs as ActivityLogWithUser[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get activity logs for a specific user
   */
  static async getUserLogs(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    return this.getLogs({ userId }, page, limit);
  }

  /**
   * Get activity logs for a specific resource
   */
  static async getResourceLogs(
    resourceType: string,
    resourceId: string,
    page: number = 1,
    limit: number = 20
  ) {
    return this.getLogs({ resourceType, resourceId }, page, limit);
  }

  /**
   * Get system logs (no specific user)
   */
  static async getSystemLogs(
    page: number = 1,
    limit: number = 50
  ) {
    const filters: ActivityLogFilters = {
      actionType: ActionType.SYSTEM,
    };
    return this.getLogs(filters, page, limit);
  }

  /**
   * Get error logs
   */
  static async getErrorLogs(
    page: number = 1,
    limit: number = 50
  ) {
    const filters: ActivityLogFilters = {
      logLevel: LogLevel.ERROR,
    };
    return this.getLogs(filters, page, limit);
  }

  /**
   * Get authentication logs
   */
  static async getAuthLogs(
    page: number = 1,
    limit: number = 50
  ) {
    const filters: ActivityLogFilters = {
      actionType: ActionType.AUTHENTICATION,
    };
    return this.getLogs(filters, page, limit);
  }

  /**
   * Delete old logs (for cleanup)
   */
  static async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {
      // Always exclude PROFILE-related actions from stats
      action: {
        not: {
          contains: 'PROFILE'
        }
      }
    };
    
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = dateFrom;
      if (dateTo) where.timestamp.lte = dateTo;
    }

    const [
      totalLogs,
      logsByLevel,
      logsByActionType,
      topUsers,
    ] = await Promise.all([
      // Total logs count
      prisma.activityLog.count({ where }),
      
      // Logs by level
      prisma.activityLog.groupBy({
        by: ['logLevel'],
        where,
        _count: {
          id: true,
        },
      }),
      
      // Logs by action type
      prisma.activityLog.groupBy({
        by: ['actionType'],
        where,
        _count: {
          id: true,
        },
      }),
      
      // Top active users
      prisma.activityLog.groupBy({
        by: ['userId', 'userName'],
        where: {
          ...where,
          userId: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      logsByLevel: logsByLevel.reduce((acc, item) => {
        acc[item.logLevel] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      logsByActionType: logsByActionType.reduce((acc, item) => {
        acc[item.actionType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      topUsers: topUsers.map(user => ({
        userId: user.userId,
        userName: user.userName,
        activityCount: user._count.id,
      })),
    };
  }
}

// Helper functions for common logging scenarios
export const logUserAction = async (
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  actionType: ActionType,
  description: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    logLevel?: LogLevel;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    httpMethod?: string;
    statusCode?: number;
    sessionId?: string;
  } = {}
) => {
  await ActivityLogService.createLog({
    userId,
    userName,
    userRole: userRole as string,
    action,
    actionType,
    description,
    logLevel: options.logLevel || LogLevel.INFO,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    oldValues: options.oldValues,
    newValues: options.newValues,
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    endpoint: options.endpoint,
    httpMethod: options.httpMethod,
    statusCode: options.statusCode,
    sessionId: options.sessionId,
  });
};

export const logSystemEvent = async (
  action: string,
  description: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
    logLevel?: LogLevel;
  } = {}
) => {
  await ActivityLogService.createLog({
    action,
    actionType: ActionType.SYSTEM,
    description,
    logLevel: options.logLevel || LogLevel.INFO,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    metadata: options.metadata,
  });
};

export const logError = async (
  error: Error,
  context: {
    userId?: string;
    userName?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    endpoint?: string;
    httpMethod?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  } = {}
) => {
  await ActivityLogService.createLog({
    userId: context.userId,
    userName: context.userName,
    action: context.action || 'ERROR_OCCURRED',
    actionType: ActionType.ERROR,
    description: error.message,
    logLevel: LogLevel.ERROR,
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    endpoint: context.endpoint,
    httpMethod: context.httpMethod,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      ...context.metadata,
      errorStack: error.stack,
      errorName: error.name,
    },
  });
};