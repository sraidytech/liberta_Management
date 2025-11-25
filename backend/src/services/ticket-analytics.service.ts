import { prisma } from '@/config/database';
import { Prisma, TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export class TicketAnalyticsService {
  /**
   * Get comprehensive ticket analytics overview
   */
  async getOverviewMetrics(dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {};

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    // Get all tickets with counts
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      criticalTickets,
      highPriorityTickets,
      urgentTickets
    ] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.CLOSED } }),
      prisma.ticket.count({
        where: {
          ...where,
          category: {
            in: [TicketCategory.EXCHANGE, TicketCategory.REFUND, TicketCategory.QUALITY_CONTROL]
          }
        }
      }),
      prisma.ticket.count({ where: { ...where, priority: TicketPriority.HIGH } }),
      prisma.ticket.count({ where: { ...where, priority: TicketPriority.URGENT } })
    ]);

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        ...where,
        status: TicketStatus.RESOLVED,
        resolvedAt: { not: null }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      }
    });

    let averageResolutionTime = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalTime = resolvedTicketsWithTime.reduce((sum, ticket) => {
        const resolutionTime = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
        return sum + resolutionTime;
      }, 0);
      averageResolutionTime = Math.round(totalTime / resolvedTicketsWithTime.length / (1000 * 60 * 60)); // Convert to hours
    }

    return {
      totalTickets,
      byStatus: {
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      },
      byPriority: {
        critical: criticalTickets,
        high: highPriorityTickets,
        urgent: urgentTickets
      },
      averageResolutionTimeHours: averageResolutionTime,
      activeTickets: openTickets + inProgressTickets
    };
  }

  /**
   * Get ticket distribution by category
   */
  async getCategoryDistribution(dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {};

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const tickets = await prisma.ticket.groupBy({
      by: ['category'],
      where,
      _count: {
        id: true
      }
    });

    return tickets.map(item => ({
      category: item.category,
      count: item._count.id
    }));
  }

  /**
   * Get ticket distribution by priority
   */
  async getPriorityDistribution(dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {};

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const tickets = await prisma.ticket.groupBy({
      by: ['priority'],
      where,
      _count: {
        id: true
      }
    });

    return tickets.map(item => ({
      priority: item.priority,
      count: item._count.id
    }));
  }

  /**
   * Get ticket trends over time
   */
  async getTrendData(period: 'daily' | 'weekly' | 'monthly', dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {};

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by period
    const grouped = new Map<string, { created: number; resolved: number }>();

    tickets.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      let key: string;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { created: 0, resolved: 0 };
      existing.created++;
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        existing.resolved++;
      }
      grouped.set(key, existing);
    });

    // Convert to array
    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      created: data.created,
      resolved: data.resolved
    }));
  }

  /**
   * Get agent ticket creation analysis
   * Shows how many tickets each agent created in each category
   */
  async getAgentTicketAnalysis(agentId?: string, dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {};

    if (agentId) {
      where.reporterId = agentId;
    }

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            agentCode: true,
            role: true
          }
        }
      }
    });

    // Group by agent
    const agentMap = new Map<string, {
      agent: any;
      totalTickets: number;
      byCategory: Record<string, number>;
      byPriority: Record<string, number>;
      byStatus: Record<string, number>;
      criticalTickets: number;
      resolvedTickets: number;
      averageResolutionTimeHours: number;
      resolutionTimes: number[];
    }>();

    tickets.forEach(ticket => {
      const agentId = ticket.reporterId;

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agent: ticket.reporter,
          totalTickets: 0,
          byCategory: {},
          byPriority: {},
          byStatus: {},
          criticalTickets: 0,
          resolvedTickets: 0,
          averageResolutionTimeHours: 0,
          resolutionTimes: []
        });
      }

      const agentData = agentMap.get(agentId)!;
      agentData.totalTickets++;

      // Count by category
      agentData.byCategory[ticket.category] = (agentData.byCategory[ticket.category] || 0) + 1;

      // Count by priority
      agentData.byPriority[ticket.priority] = (agentData.byPriority[ticket.priority] || 0) + 1;

      // Count by status
      agentData.byStatus[ticket.status] = (agentData.byStatus[ticket.status] || 0) + 1;

      // Count critical tickets
      const criticalCategories: TicketCategory[] = [TicketCategory.EXCHANGE, TicketCategory.REFUND, TicketCategory.QUALITY_CONTROL];
      if (criticalCategories.includes(ticket.category)) {
        agentData.criticalTickets++;
      }

      // Count resolved tickets and calculate resolution time
      if (ticket.status === TicketStatus.RESOLVED && ticket.resolvedAt) {
        agentData.resolvedTickets++;
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        agentData.resolutionTimes.push(resolutionTime);
      }
    });

    // Calculate average resolution times and format data
    const agents = Array.from(agentMap.values()).map(data => {
      let averageResolutionTimeHours = 0;
      if (data.resolutionTimes.length > 0) {
        const totalTime = data.resolutionTimes.reduce((sum, time) => sum + time, 0);
        averageResolutionTimeHours = Math.round(totalTime / data.resolutionTimes.length / (1000 * 60 * 60));
      }

      return {
        agentId: data.agent.id,
        agentName: data.agent.name,
        agentCode: data.agent.agentCode,
        agentEmail: data.agent.email,
        agentRole: data.agent.role,
        totalTickets: data.totalTickets,
        byCategory: data.byCategory,
        byPriority: data.byPriority,
        byStatus: data.byStatus,
        criticalTickets: data.criticalTickets,
        resolvedTickets: data.resolvedTickets,
        averageResolutionTimeHours,
        resolutionRate: data.totalTickets > 0 
          ? Math.round((data.resolvedTickets / data.totalTickets) * 100) 
          : 0
      };
    });

    // Sort by total tickets descending
    agents.sort((a, b) => b.totalTickets - a.totalTickets);

    return agents;
  }

  /**
   * Get ticket aging analysis (tickets open for X days)
   */
  async getTicketAging(dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {
      status: {
        in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_RESPONSE]
      }
    };

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        priority: true,
        category: true
      }
    });

    const now = new Date();
    const aging = {
      lessThan24Hours: 0,
      oneToThreeDays: 0,
      threeToSevenDays: 0,
      moreThanSevenDays: 0
    };

    tickets.forEach(ticket => {
      const ageInHours = (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (ageInHours < 24) {
        aging.lessThan24Hours++;
      } else if (ageInHours < 72) {
        aging.oneToThreeDays++;
      } else if (ageInHours < 168) {
        aging.threeToSevenDays++;
      } else {
        aging.moreThanSevenDays++;
      }
    });

    return aging;
  }

  /**
   * Get critical tickets summary
   */
  async getCriticalTicketsSummary(dateRange?: DateRange) {
    const where: Prisma.TicketWhereInput = {
      category: {
        in: [TicketCategory.EXCHANGE, TicketCategory.REFUND, TicketCategory.QUALITY_CONTROL]
      }
    };

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = dateRange.from;
      if (dateRange.to) where.createdAt.lte = dateRange.to;
    }

    const [total, open, resolved] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { ...where, status: TicketStatus.RESOLVED } })
    ]);

    return {
      total,
      open,
      resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }
}

export const ticketAnalyticsService = new TicketAnalyticsService();