import { PrismaClient, TicketCategory, TicketPriority, TicketStatus, UserRole } from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export class TicketService {
  // Helper method to check if ticket category is critical
  static isCriticalCategory(category: TicketCategory): boolean {
    const criticalCategories = ['EXCHANGE', 'REFUND', 'QUALITY_CONTROL'];
    return criticalCategories.includes(category as string);
  }

  // Helper method to notify all supervisors (Team Managers + Coordinateurs)
  static async notifyAllSupervisors(ticketId: string, orderId: string, title: string, category: TicketCategory) {
    try {
      // Get all active Team Managers and Coordinateurs
      const supervisors = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.TEAM_MANAGER, UserRole.COORDINATEUR]
          },
          isActive: true,
        },
        select: { id: true }
      });

      // Send notification to each supervisor
      const notificationPromises = supervisors.map(supervisor =>
        notificationService.createNotification({
          userId: supervisor.id,
          orderId,
          type: 'SYSTEM_ALERT',
          title: `🚨 CRITICAL TICKET: ${category}`,
          message: `Critical ticket requires immediate attention: ${title}`,
        })
      );

      await Promise.all(notificationPromises);
      console.log(`✅ Notified ${supervisors.length} supervisors about critical ticket ${ticketId}`);
    } catch (error) {
      console.error('❌ Error notifying supervisors:', error);
    }
  }

  // Create a new ticket
  static async createTicket(data: {
    orderId: string;
    reporterId: string;
    title: string;
    category: TicketCategory;
    priority: TicketPriority;
    description: string;
    assigneeId?: string;
  }) {
    try {
      // Check if this is a critical ticket
      const isCritical = this.isCriticalCategory(data.category);
      
      // If critical, automatically set priority to HIGH or URGENT
      let priority = data.priority;
      if (isCritical && (priority === TicketPriority.LOW || priority === TicketPriority.MEDIUM)) {
        priority = TicketPriority.HIGH;
      }

      // If no assignee specified, auto-assign based on reporter's hierarchy
      let assigneeId = data.assigneeId;
      
      if (!assigneeId) {
        const autoAssignee = await this.getAutoAssignee(data.reporterId);
        assigneeId = autoAssignee || undefined;
      }

      const ticket = await prisma.ticket.create({
        data: {
          orderId: data.orderId,
          reporterId: data.reporterId,
          assigneeId,
          title: data.title,
          category: data.category,
          priority: priority, // Use the potentially updated priority
          description: data.description,
          status: TicketStatus.OPEN,
        },
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

      // Create initial message with the description
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: data.reporterId,
          message: data.description,
          isInternal: false,
        }
      });

      // If critical ticket, notify ALL supervisors
      if (isCritical) {
        await this.notifyAllSupervisors(ticket.id, data.orderId, data.title, data.category);
      } else {
        // For regular tickets, send notification to assignee if assigned
        if (assigneeId) {
          await this.createTicketNotification(ticket.id, assigneeId, 'NEW_TICKET');
        }
      }

      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw new Error('Failed to create ticket');
    }
  }

  // Get auto-assignee based on reporter's role and hierarchy
  static async getAutoAssignee(reporterId: string): Promise<string | null> {
    try {
      const reporter = await prisma.user.findUnique({
        where: { id: reporterId },
        select: { role: true }
      });

      if (!reporter) return null;

      // For agents, assign to team managers or coordinateurs
      if (reporter.role === UserRole.AGENT_SUIVI || reporter.role === UserRole.AGENT_CALL_CENTER) {
        const supervisors = await prisma.user.findMany({
          where: {
            role: {
              in: [UserRole.TEAM_MANAGER, UserRole.COORDINATEUR]
            },
            isActive: true,
          },
          select: { id: true },
          take: 1, // For now, just get the first available supervisor
        });

        return supervisors.length > 0 ? supervisors[0].id : null;
      }

      return null;
    } catch (error) {
      console.error('Error getting auto-assignee:', error);
      return null;
    }
  }

  // Get tickets for a user (either reported by them or assigned to them)
  static async getTicketsForUser(userId: string, filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    orderId?: string;
    orderReference?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // Check if user is admin first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      let where: any = {};
      
      // Role-based access control
      if (user?.role === UserRole.ADMIN) {
        // Admins see ALL tickets (no filter)
      } else if (user?.role === UserRole.TEAM_MANAGER || user?.role === UserRole.COORDINATEUR) {
        // Team Managers and Coordinateurs see ALL tickets (no filter)
        // This allows them to collaborate on all tickets
      } else {
        // Agents (AGENT_SUIVI, AGENT_CALL_CENTER) see only their own tickets
        where.OR = [
          { reporterId: userId },
          { assigneeId: userId }
        ];
      }

      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.priority) {
        where.priority = filters.priority;
      }
      if (filters?.category) {
        where.category = filters.category;
      }
      if (filters?.orderId) {
        where.orderId = filters.orderId;
      }
      if (filters?.orderReference) {
        where.order = {
          reference: filters.orderReference
        };
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
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
            _count: {
              select: {
                messages: true
              }
            }
          },
          orderBy: [
            { updatedAt: 'desc' },
            { priority: 'desc' }
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
      console.error('Error getting tickets for user:', error);
      throw new Error('Failed to get tickets');
    }
  }

  // Get critical tickets only (EXCHANGE, REFUND, QUALITY_CONTROL)
  static async getCriticalTickets(userId: string, filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      // Check user role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      // Only supervisors (Team Managers, Coordinateurs) and Admins can access critical tickets
      const allowedRoles = ['ADMIN', 'TEAM_MANAGER', 'COORDINATEUR'];
      if (!user || !allowedRoles.includes(user.role as string)) {
        throw new Error('Access denied: Only supervisors can view critical tickets');
      }

      let where: any = {
        category: {
          in: ['EXCHANGE', 'REFUND', 'QUALITY_CONTROL']
        }
      };

      if (filters?.status) {
        where.status = filters.status;
      }
      if (filters?.priority) {
        where.priority = filters.priority;
      }

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
          where,
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
      console.error('Error getting critical tickets:', error);
      throw new Error('Failed to get critical tickets');
    }
  }

  // Get ticket by ID with messages
  static async getTicketById(ticketId: string, userId: string) {
    try {
      // Check if user is admin first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      let whereClause: any = { id: ticketId };
      
      // Role-based access control
      if (user?.role === UserRole.ADMIN) {
        // Admins see ALL tickets (no additional filter)
      } else if (user?.role === UserRole.TEAM_MANAGER || user?.role === UserRole.COORDINATEUR) {
        // Team Managers and Coordinateurs see ALL tickets (no additional filter)
      } else {
        // Agents see only their own tickets
        whereClause.OR = [
          { reporterId: userId },
          { assigneeId: userId }
        ];
      }

      const ticket = await prisma.ticket.findFirst({
        where: whereClause,
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
        throw new Error('Ticket not found or access denied');
      }

      return ticket;
    } catch (error) {
      console.error('Error getting ticket by ID:', error);
      throw new Error('Failed to get ticket');
    }
  }

  // Add message to ticket
  static async addMessage(ticketId: string, senderId: string, message: string, isInternal: boolean = false) {
    try {
      // Check if user is admin first
      const user = await prisma.user.findUnique({
        where: { id: senderId },
        select: { role: true }
      });

      let whereClause: any = { id: ticketId };
      
      // If not admin, restrict access to only tickets they're involved in
      if (user?.role !== 'ADMIN') {
        whereClause.OR = [
          { reporterId: senderId },
          { assigneeId: senderId }
        ];
      }

      // Verify user has access to this ticket
      const ticket = await prisma.ticket.findFirst({
        where: whereClause
      });

      if (!ticket) {
        throw new Error('Ticket not found or access denied');
      }

      const ticketMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          message,
          isInternal,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        }
      });

      // Update ticket's updatedAt timestamp
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() }
      });

      // Notify the other party (reporter or assignee)
      const notifyUserId = ticket.reporterId === senderId ? ticket.assigneeId : ticket.reporterId;
      if (notifyUserId) {
        await this.createTicketNotification(ticketId, notifyUserId, 'TICKET_MESSAGE');
      }

      return ticketMessage;
    } catch (error) {
      console.error('Error adding message to ticket:', error);
      throw new Error('Failed to add message');
    }
  }

  // Update ticket status
  static async updateTicketStatus(ticketId: string, userId: string, status: TicketStatus) {
    try {
      // Check if user is admin first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      let whereClause: any = { id: ticketId };
      
      // If not admin, restrict access to only tickets they're involved in
      if (user?.role !== 'ADMIN') {
        whereClause.OR = [
          { reporterId: userId },
          { assigneeId: userId }
        ];
      }

      // Verify user has access to this ticket
      const ticket = await prisma.ticket.findFirst({
        where: whereClause
      });

      if (!ticket) {
        throw new Error('Ticket not found or access denied');
      }

      const updateData: any = { status };
      
      if (status === TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      } else if (status === TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          order: {
            select: {
              reference: true,
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        }
      });

      // Notify the other party about status change
      const notifyUserId = ticket.reporterId === userId ? ticket.assigneeId : ticket.reporterId;
      if (notifyUserId) {
        await this.createTicketNotification(ticketId, notifyUserId, 'TICKET_STATUS_CHANGE');
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw new Error('Failed to update ticket status');
    }
  }

  // Assign ticket to a user
  static async assignTicket(ticketId: string, assignerId: string, assigneeId: string) {
    try {
      // Verify assigner has permission (should be team manager, coordinateur, or admin)
      const assigner = await prisma.user.findUnique({
        where: { id: assignerId },
        select: { role: true }
      });

      if (!assigner || !['ADMIN', 'TEAM_MANAGER', 'COORDINATEUR'].includes(assigner.role)) {
        throw new Error('Insufficient permissions to assign tickets');
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { assigneeId },
        include: {
          order: {
            select: {
              reference: true,
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        }
      });

      // Notify the new assignee
      await this.createTicketNotification(ticketId, assigneeId, 'TICKET_ASSIGNED');

      return updatedTicket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw new Error('Failed to assign ticket');
    }
  }

  // Create notification for ticket events
  static async createTicketNotification(ticketId: string, userId: string, type: string) {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          order: {
            select: { reference: true }
          }
        }
      });

      if (!ticket) return;

      let title = '';
      let message = '';

      switch (type) {
        case 'NEW_TICKET':
          title = 'New Ticket Assigned';
          message = `A new ticket has been created for order ${ticket.order.reference}`;
          break;
        case 'TICKET_MESSAGE':
          title = 'New Ticket Message';
          message = `New message in ticket for order ${ticket.order.reference}`;
          break;
        case 'TICKET_STATUS_CHANGE':
          title = 'Ticket Status Updated';
          message = `Ticket status changed to ${ticket.status} for order ${ticket.order.reference}`;
          break;
        case 'TICKET_ASSIGNED':
          title = 'Ticket Assigned';
          message = `You have been assigned a ticket for order ${ticket.order.reference}`;
          break;
      }

      // Create notification using the notification service for real-time delivery
      await notificationService.createNotification({
        userId,
        orderId: ticket.orderId,
        type: 'SYSTEM_ALERT',
        title,
        message,
      });
    } catch (error) {
      console.error('Error creating ticket notification:', error);
    }
  }

  // Get ticket statistics for dashboard
  static async getTicketStats(userId: string, userRole: UserRole) {
    try {
      const where: any = {};

      // Filter based on user role
      if (userRole === UserRole.AGENT_SUIVI || userRole === UserRole.AGENT_CALL_CENTER) {
        where.reporterId = userId;
      } else if (userRole === UserRole.TEAM_MANAGER || userRole === UserRole.COORDINATEUR) {
        where.OR = [
          { assigneeId: userId },
          { reporterId: userId }
        ];
      }
      // Admin can see all tickets (no filter)

      const [total, open, inProgress, resolved, closed] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.count({ where: { ...where, status: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
        prisma.ticket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
        prisma.ticket.count({ where: { ...where, status: TicketStatus.CLOSED } }),
      ]);

      return {
        total,
        open,
        inProgress,
        resolved,
        closed,
        active: open + inProgress,
      };
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      throw new Error('Failed to get ticket statistics');
    }
  }

  // Get available assignees (coordinators and team leaders)
  static async getAvailableAssignees() {
    try {
      const assignees = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.COORDINATEUR, UserRole.TEAM_MANAGER]
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          role: true,
          agentCode: true,
        },
        orderBy: [
          { role: 'asc' },
          { name: 'asc' }
        ]
      });

      return assignees;
    } catch (error) {
      console.error('Error getting available assignees:', error);
      throw new Error('Failed to get available assignees');
    }
  }
}