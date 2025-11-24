import { 
  PrismaClient, 
  TicketCategory, 
  TicketStatus, 
  UserRole,
  QualityReviewStage,
  QualitySeverity,
  QualityDecision
} from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export class QualityService {
  /**
   * Get all QUALITY_CONTROL tickets with filters
   */
  static async getQualityTickets(userId: string, filters?: {
    status?: TicketStatus;
    stage?: QualityReviewStage;
    severity?: QualitySeverity;
    decision?: QualityDecision;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // Check user role for access control
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Only QUALITY_AGENT, TEAM_MANAGER, and ADMIN can access
      const allowedRoles: UserRole[] = [UserRole.QUALITY_AGENT, UserRole.TEAM_MANAGER, UserRole.ADMIN];
      if (!allowedRoles.includes(user.role)) {
        throw new Error('Access denied: Insufficient permissions');
      }

      // Build where clause
      const where: any = {
        category: TicketCategory.QUALITY_CONTROL
      };

      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.stage) {
        where.qualityReviewStage = filters.stage;
      }
      if (filters?.severity) {
        where.qualitySeverity = filters.severity;
      }
      if (filters?.decision) {
        where.qualityDecision = filters.decision;
      }

      // Quality agents see only unassigned or assigned to them
      if (user.role === UserRole.QUALITY_AGENT) {
        where.OR = [
          { qualityReviewerId: userId },
          { qualityReviewerId: null }
        ];
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
          include: {
            order: {
              select: {
                reference: true,
                status: true,
                customer: {
                  select: {
                    fullName: true,
                    telephone: true,
                    wilaya: true,
                    commune: true,
                  }
                }
              }
            },
            reporter: {
              select: {
                id: true,
                name: true,
                role: true,
                agentCode: true,
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            },
            qualityReviewer: {
              select: {
                id: true,
                name: true,
                role: true,
              }
            },
            _count: {
              select: {
                messages: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit,
        }),
        prisma.ticket.count({ where })
      ]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting quality tickets:', error);
      throw error;
    }
  }

  /**
   * Get single quality ticket by ID with full details
   */
  static async getQualityTicketById(ticketId: string, userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const allowedRoles: UserRole[] = [UserRole.QUALITY_AGENT, UserRole.TEAM_MANAGER, UserRole.ADMIN];
      if (!allowedRoles.includes(user.role)) {
        throw new Error('Access denied: Insufficient permissions');
      }

      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          category: TicketCategory.QUALITY_CONTROL
        },
        include: {
          order: {
            select: {
              reference: true,
              status: true,
              total: true,
              customer: {
                select: {
                  fullName: true,
                  telephone: true,
                  wilaya: true,
                  commune: true,
                  address: true,
                }
              },
              items: {
                select: {
                  title: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                }
              }
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              role: true,
              agentCode: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          },
          qualityReviewer: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Quality ticket not found');
      }

      // Quality agents can only see tickets assigned to them or unassigned
      if (user.role === UserRole.QUALITY_AGENT) {
        if (ticket.qualityReviewerId && ticket.qualityReviewerId !== userId) {
          throw new Error('Access denied: Ticket assigned to another quality agent');
        }
      }

      return ticket;
    } catch (error) {
      console.error('Error getting quality ticket by ID:', error);
      throw error;
    }
  }

  /**
   * Update quality review stage
   */
  static async updateQualityReviewStage(
    ticketId: string,
    userId: string,
    stage: QualityReviewStage
  ) {
    try {
      const ticket = await this.getQualityTicketById(ticketId, userId);

      // Auto-assign to quality agent if not assigned
      const updateData: any = {
        qualityReviewStage: stage,
        updatedAt: new Date()
      };

      if (!ticket.qualityReviewerId) {
        updateData.qualityReviewerId = userId;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          order: {
            select: {
              reference: true,
              customer: {
                select: {
                  fullName: true,
                  telephone: true,
                }
              }
            }
          },
          qualityReviewer: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        }
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error updating quality review stage:', error);
      throw error;
    }
  }

  /**
   * Update quality severity
   */
  static async updateQualitySeverity(
    ticketId: string,
    userId: string,
    severity: QualitySeverity
  ) {
    try {
      const ticket = await this.getQualityTicketById(ticketId, userId);

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qualitySeverity: severity,
          updatedAt: new Date()
        }
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error updating quality severity:', error);
      throw error;
    }
  }

  /**
   * Add quality inspection note
   */
  static async addQualityInspectionNote(
    ticketId: string,
    userId: string,
    data: {
      severity: QualitySeverity;
      notes: string;
      metrics?: any;
    }
  ) {
    try {
      const ticket = await this.getQualityTicketById(ticketId, userId);

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qualitySeverity: data.severity,
          qualityNotes: data.notes,
          qualityMetrics: data.metrics || ticket.qualityMetrics,
          qualityReviewerId: ticket.qualityReviewerId || userId,
          updatedAt: new Date()
        }
      });

      // Add message to ticket
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: `Quality Inspection Note (${data.severity}):\n${data.notes}`,
          isInternal: true
        }
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error adding quality inspection note:', error);
      throw error;
    }
  }

  /**
   * Approve quality ticket
   */
  static async approveQualityTicket(
    ticketId: string,
    userId: string,
    approvalNotes: string
  ) {
    try {
      if (!approvalNotes || approvalNotes.trim().length === 0) {
        throw new Error('Approval notes are mandatory');
      }

      const ticket = await this.getQualityTicketById(ticketId, userId);

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qualityDecision: QualityDecision.APPROVED,
          qualityReviewStage: QualityReviewStage.RESOLUTION,
          status: TicketStatus.RESOLVED,
          qualityReviewerId: userId,
          qualityReviewedAt: new Date(),
          resolvedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Add approval message
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: `✅ QUALITY APPROVED\n\n${approvalNotes}`,
          isInternal: false
        }
      });

      // Notify reporter
      if (ticket.reporterId) {
        await notificationService.createNotification({
          userId: ticket.reporterId,
          orderId: ticket.orderId,
          type: 'SYSTEM_ALERT',
          title: '✅ Quality Approved',
          message: `Quality ticket for order ${ticket.order.reference} has been approved`
        });
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error approving quality ticket:', error);
      throw error;
    }
  }

  /**
   * Reject quality ticket
   */
  static async rejectQualityTicket(
    ticketId: string,
    userId: string,
    rejectionReason: string
  ) {
    try {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Rejection reason is mandatory');
      }

      const ticket = await this.getQualityTicketById(ticketId, userId);

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qualityDecision: QualityDecision.REJECTED,
          qualityReviewStage: QualityReviewStage.RESOLUTION,
          status: TicketStatus.RESOLVED,
          qualityReviewerId: userId,
          qualityReviewedAt: new Date(),
          resolvedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Add rejection message
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: `❌ QUALITY REJECTED\n\nReason: ${rejectionReason}`,
          isInternal: false
        }
      });

      // Notify reporter
      if (ticket.reporterId) {
        await notificationService.createNotification({
          userId: ticket.reporterId,
          orderId: ticket.orderId,
          type: 'SYSTEM_ALERT',
          title: '❌ Quality Rejected',
          message: `Quality ticket for order ${ticket.order.reference} has been rejected`
        });
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error rejecting quality ticket:', error);
      throw error;
    }
  }

  /**
   * Escalate quality ticket to Team Manager
   */
  static async escalateQualityTicket(
    ticketId: string,
    userId: string,
    escalationReason: string
  ) {
    try {
      if (!escalationReason || escalationReason.trim().length === 0) {
        throw new Error('Escalation reason is mandatory');
      }

      const ticket = await this.getQualityTicketById(ticketId, userId);

      // Find a team manager to escalate to
      const teamManager = await prisma.user.findFirst({
        where: {
          role: UserRole.TEAM_MANAGER,
          isActive: true
        }
      });

      if (!teamManager) {
        throw new Error('No team manager available for escalation');
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          qualityDecision: QualityDecision.ESCALATED,
          status: TicketStatus.IN_PROGRESS,
          assigneeId: teamManager.id,
          qualityReviewerId: userId,
          updatedAt: new Date()
        }
      });

      // Add escalation message
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message: `⬆️ ESCALATED TO TEAM MANAGER\n\nReason: ${escalationReason}`,
          isInternal: true
        }
      });

      // Notify team manager
      await notificationService.createNotification({
        userId: teamManager.id,
        orderId: ticket.orderId,
        type: 'SYSTEM_ALERT',
        title: '⬆️ Quality Ticket Escalated',
        message: `Quality ticket for order ${ticket.order.reference} requires your attention`
      });

      return updatedTicket;
    } catch (error) {
      console.error('Error escalating quality ticket:', error);
      throw error;
    }
  }

  /**
   * Get quality statistics for a user
   */
  static async getQualityStatistics(userId: string, period?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const allowedRoles: UserRole[] = [UserRole.QUALITY_AGENT, UserRole.TEAM_MANAGER, UserRole.ADMIN];
      if (!allowedRoles.includes(user.role)) {
        throw new Error('Access denied: Insufficient permissions');
      }

      const where: any = {
        category: TicketCategory.QUALITY_CONTROL
      };

      // Quality agents see only their own stats
      if (user.role === UserRole.QUALITY_AGENT) {
        where.qualityReviewerId = userId;
      }

      // Apply date filters
      if (period?.startDate || period?.endDate) {
        where.createdAt = {};
        if (period.startDate) {
          where.createdAt.gte = period.startDate;
        }
        if (period.endDate) {
          where.createdAt.lte = period.endDate;
        }
      }

      const [
        pendingReviews,
        completedToday,
        completedWeek,
        completedMonth,
        allReviewed,
        issuesBySeverity,
        decisionBreakdown
      ] = await Promise.all([
        // Pending reviews
        prisma.ticket.count({
          where: {
            ...where,
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
            OR: [
              { qualityDecision: null },
              { qualityDecision: QualityDecision.PENDING }
            ]
          }
        }),
        // Completed today
        prisma.ticket.count({
          where: {
            ...where,
            qualityReviewedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        // Completed this week
        prisma.ticket.count({
          where: {
            ...where,
            qualityReviewedAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          }
        }),
        // Completed this month
        prisma.ticket.count({
          where: {
            ...where,
            qualityReviewedAt: {
              gte: new Date(new Date().setDate(1))
            }
          }
        }),
        // All reviewed tickets for calculations
        prisma.ticket.findMany({
          where: {
            ...where,
            qualityReviewedAt: { not: null }
          },
          select: {
            qualityDecision: true,
            qualitySeverity: true,
            createdAt: true,
            qualityReviewedAt: true
          }
        }),
        // Issues by severity
        prisma.ticket.groupBy({
          by: ['qualitySeverity'],
          where: {
            ...where,
            qualitySeverity: { not: null }
          },
          _count: true
        }),
        // Decision breakdown
        prisma.ticket.groupBy({
          by: ['qualityDecision'],
          where: {
            ...where,
            qualityDecision: { not: null }
          },
          _count: true
        })
      ]);

      // Calculate approval rate
      const approvedCount = allReviewed.filter(t => t.qualityDecision === QualityDecision.APPROVED).length;
      const approvalRate = allReviewed.length > 0 ? (approvedCount / allReviewed.length) * 100 : 0;

      // Calculate average review time (in hours)
      const reviewTimes = allReviewed
        .filter(t => t.qualityReviewedAt)
        .map(t => {
          const created = new Date(t.createdAt).getTime();
          const reviewed = new Date(t.qualityReviewedAt!).getTime();
          return (reviewed - created) / (1000 * 60 * 60); // Convert to hours
        });
      const averageReviewTime = reviewTimes.length > 0
        ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
        : 0;

      // Format issues by severity
      const issuesBySeverityMap: Record<string, number> = {};
      issuesBySeverity.forEach(item => {
        if (item.qualitySeverity) {
          issuesBySeverityMap[item.qualitySeverity] = item._count;
        }
      });

      // Format decision breakdown
      const decisionBreakdownMap: Record<string, number> = {};
      decisionBreakdown.forEach(item => {
        if (item.qualityDecision) {
          decisionBreakdownMap[item.qualityDecision] = item._count;
        }
      });

      return {
        pendingReviews,
        completedToday,
        completedWeek,
        completedMonth,
        approvalRate: Math.round(approvalRate * 10) / 10,
        averageReviewTime: Math.round(averageReviewTime * 10) / 10,
        issuesBySeverity: issuesBySeverityMap,
        decisionBreakdown: decisionBreakdownMap,
        totalReviewed: allReviewed.length
      };
    } catch (error) {
      console.error('Error getting quality statistics:', error);
      throw error;
    }
  }

  /**
   * Get quality trends over time
   */
  static async getQualityTrends(userId: string, days: number = 30) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const allowedRoles: UserRole[] = [UserRole.QUALITY_AGENT, UserRole.TEAM_MANAGER, UserRole.ADMIN];
      if (!allowedRoles.includes(user.role)) {
        throw new Error('Access denied: Insufficient permissions');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        category: TicketCategory.QUALITY_CONTROL,
        qualityReviewedAt: {
          gte: startDate
        }
      };

      if (user.role === UserRole.QUALITY_AGENT) {
        where.qualityReviewerId = userId;
      }

      const tickets = await prisma.ticket.findMany({
        where,
        select: {
          qualityReviewedAt: true,
          qualityDecision: true,
          qualitySeverity: true
        },
        orderBy: {
          qualityReviewedAt: 'asc'
        }
      });

      // Group by date
      const trendsByDate: Record<string, any> = {};
      tickets.forEach(ticket => {
        if (ticket.qualityReviewedAt) {
          const date = ticket.qualityReviewedAt.toISOString().split('T')[0];
          if (!trendsByDate[date]) {
            trendsByDate[date] = {
              date,
              total: 0,
              approved: 0,
              rejected: 0,
              escalated: 0,
              minor: 0,
              moderate: 0,
              major: 0,
              critical: 0
            };
          }
          trendsByDate[date].total++;
          if (ticket.qualityDecision === QualityDecision.APPROVED) trendsByDate[date].approved++;
          if (ticket.qualityDecision === QualityDecision.REJECTED) trendsByDate[date].rejected++;
          if (ticket.qualityDecision === QualityDecision.ESCALATED) trendsByDate[date].escalated++;
          if (ticket.qualitySeverity === QualitySeverity.MINOR) trendsByDate[date].minor++;
          if (ticket.qualitySeverity === QualitySeverity.MODERATE) trendsByDate[date].moderate++;
          if (ticket.qualitySeverity === QualitySeverity.MAJOR) trendsByDate[date].major++;
          if (ticket.qualitySeverity === QualitySeverity.CRITICAL) trendsByDate[date].critical++;
        }
      });

      return Object.values(trendsByDate);
    } catch (error) {
      console.error('Error getting quality trends:', error);
      throw error;
    }
  }

  /**
   * Get agent performance comparison
   */
  static async getAgentPerformanceComparison(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Only TEAM_MANAGER and ADMIN can see comparison
      if (user.role !== UserRole.TEAM_MANAGER && user.role !== UserRole.ADMIN) {
        throw new Error('Access denied: Only managers can view performance comparison');
      }

      const qualityAgents = await prisma.user.findMany({
        where: {
          role: UserRole.QUALITY_AGENT,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          agentCode: true
        }
      });

      const performanceData = await Promise.all(
        qualityAgents.map(async (agent) => {
          const stats = await this.getQualityStatistics(agent.id);
          return {
            agentId: agent.id,
            agentName: agent.name,
            agentCode: agent.agentCode,
            ...stats
          };
        })
      );

      return performanceData.sort((a, b) => b.totalReviewed - a.totalReviewed);
    } catch (error) {
      console.error('Error getting agent performance comparison:', error);
      throw error;
    }
  }
}