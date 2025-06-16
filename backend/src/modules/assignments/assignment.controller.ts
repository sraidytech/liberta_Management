import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AgentAssignmentService } from '@/services/agent-assignment.service';
import redis from '@/config/redis';

const prisma = new PrismaClient();

const assignmentService = new AgentAssignmentService(redis);

export class AssignmentController {
  /**
   * Manually trigger assignment of unassigned orders
   */
  async triggerAssignment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Only allow ADMIN and TEAM_MANAGER to trigger assignments
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to trigger assignments'
          }
        });
      }

      const result = await assignmentService.autoAssignUnassignedOrders();

      // Emit socket event if available
      const io = (global as any).io;
      if (io) {
        io.to('managers').emit('assignment_completed', {
          managerId: userId,
          result: result
        });
        
        if (result.successfulAssignments > 0) {
          io.to('agents').emit('new_assignments', {
            count: result.successfulAssignments,
            source: 'manual'
          });
        }
      }

      res.json({
        success: true,
        data: result,
        message: `Assignment completed: ${result.successfulAssignments} orders assigned`
      });
    } catch (error) {
      console.error('Manual assignment trigger error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to trigger assignment'
        }
      });
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(req: Request, res: Response) {
    try {
      console.log('📊 Getting assignment stats...');
      const stats = await assignmentService.getAssignmentStats();
      console.log('📊 Assignment stats retrieved:', stats);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Get assignment stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch assignment statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Manually reassign an order to a specific agent
   */
  async reassignOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { agentId } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!orderId || !agentId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Order ID and Agent ID are required'
          }
        });
      }

      // Only allow ADMIN and TEAM_MANAGER to reassign orders
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to reassign orders'
          }
        });
      }

      const result = await assignmentService.reassignOrder(orderId, agentId, userId);

      if (result.success) {
        // Emit socket event if available
        const io = (global as any).io;
        if (io) {
          io.to(`user_${agentId}`).emit('order_reassigned', {
            orderId: orderId,
            message: result.message
          });
        }
      }

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Manual reassignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to reassign order'
        }
      });
    }
  }

  /**
   * Manually assign an order to a specific agent
   */
  async manualAssignOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { agentId } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!orderId || !agentId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Order ID and Agent ID are required'
          }
        });
      }

      // Only allow ADMIN and TEAM_MANAGER to manually assign orders
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to manually assign orders'
          }
        });
      }

      const result = await assignmentService.manualAssignOrder(orderId, agentId, userId);

      if (result.success) {
        // Emit socket event if available
        const io = (global as any).io;
        if (io) {
          io.to(`user_${agentId}`).emit('order_assigned', {
            orderId: orderId,
            message: result.message
          });
        }
      }

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Manual assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to manually assign order'
        }
      });
    }
  }

  /**
   * Get available agents for manual assignment
   */
  async getAvailableAgents(req: Request, res: Response) {
    try {
      const userRole = (req as any).user?.role;

      // Only allow ADMIN and TEAM_MANAGER to view agents
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to view agents'
          }
        });
      }

      const agents = await assignmentService.getAgentsForManualAssignment();

      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error('Get available agents error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch available agents'
        }
      });
    }
  }

  /**
   * Update agent availability status
   */
  async updateAgentAvailability(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { availability } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!agentId || !availability) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Agent ID and availability status are required'
          }
        });
      }

      // Allow agents to update their own status, or managers to update any agent
      if (userId !== agentId && !['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to update agent availability'
          }
        });
      }

      const validStatuses = ['ONLINE', 'BUSY', 'BREAK', 'OFFLINE'];
      if (!validStatuses.includes(availability)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid availability status'
          }
        });
      }

      // Update agent availability directly
      await prisma.user.update({
        where: { id: agentId },
        data: { availability }
      });

      // Log the availability change
      await prisma.agentActivity.create({
        data: {
          agentId: agentId,
          activityType: availability === 'ONLINE' ? 'LOGIN' :
                       availability === 'OFFLINE' ? 'LOGOUT' :
                       availability === 'BREAK' ? 'BREAK_STARTED' : 'STATUS_CHANGED',
          description: `Agent availability changed to ${availability}`
        }
      });

      const success = true;

      if (success) {
        // Update agent activity in Redis if they're going online
        if (availability === 'ONLINE') {
          await assignmentService.updateAgentActivity(agentId);
        } else if (availability === 'OFFLINE') {
          await assignmentService.setAgentOffline(agentId);
        }

        // Emit socket event if available
        const io = (global as any).io;
        if (io) {
          io.to('managers').emit('agent_availability_changed', {
            agentId: agentId,
            availability: availability
          });
        }
      }

      res.json({
        success: success,
        message: success ? 'Agent availability updated successfully' : 'Failed to update agent availability'
      });
    } catch (error) {
      console.error('Update agent availability error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update agent availability'
        }
      });
    }
  }

  /**
   * Get agent workload distribution
   */
  async getAgentWorkloads(req: Request, res: Response) {
    try {
      const stats = await assignmentService.getAssignmentStats();

      res.json({
        success: true,
        data: {
          agentWorkloads: stats.agentWorkloads,
          summary: {
            totalAgents: stats.totalAgents,
            onlineAgents: stats.onlineAgents,
            offlineAgents: stats.offlineAgents,
            averageUtilization: stats.agentWorkloads.length > 0 
              ? stats.agentWorkloads.reduce((sum, agent) => sum + agent.utilizationRate, 0) / stats.agentWorkloads.length 
              : 0
          }
        }
      });
    } catch (error) {
      console.error('Get agent workloads error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch agent workloads'
        }
      });
    }
  }

  /**
   * Force redistribute orders from offline agents
   */
  async redistributeOrders(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userRole = (req as any).user?.role;

      // Only allow ADMIN and TEAM_MANAGER to force redistribution
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to redistribute orders'
          }
        });
      }

      const result = await assignmentService.redistributeAgentOrders(agentId);

      // Emit socket event if available
      const io = (global as any).io;
      if (io && result.redistributed > 0) {
        io.to('agents').emit('orders_redistributed', {
          count: result.redistributed,
          fromAgentId: agentId
        });
      }

      res.json({
        success: true,
        data: result,
        message: `Redistributed ${result.redistributed} orders from agent`
      });
    } catch (error) {
      console.error('Redistribute orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to redistribute orders'
        }
      });
    }
  }

  /**
   * Get assignment history and analytics
   */
  async getAssignmentAnalytics(req: Request, res: Response) {
    try {
      const { period = '7d' } = req.query;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get assignment analytics from database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const [assignmentActivities, totalAssignments, agentPerformance] = await Promise.all([
        // Get assignment activities
        prisma.agentActivity.findMany({
          where: {
            activityType: 'ORDER_ASSIGNED',
            createdAt: {
              gte: startDate
            }
          },
          include: {
            agent: {
              select: {
                name: true,
                agentCode: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),

        // Get total assignments count
        prisma.order.count({
          where: {
            assignedAt: {
              gte: startDate
            },
            assignedAgentId: {
              not: null
            }
          }
        }),

        // Get agent performance
        prisma.user.findMany({
          where: {
            role: 'AGENT_SUIVI',
            isActive: true
          },
          select: {
            id: true,
            name: true,
            agentCode: true,
            assignedOrders: {
              where: {
                assignedAt: {
                  gte: startDate
                }
              },
              select: {
                id: true,
                status: true,
                assignedAt: true
              }
            }
          }
        })
      ]);

      const analytics = {
        period: period,
        totalAssignments,
        assignmentActivities: assignmentActivities.slice(0, 50), // Limit to 50 recent activities
        agentPerformance: agentPerformance.map((agent: any) => ({
          agentId: agent.id,
          agentName: agent.name || agent.agentCode || 'Unknown',
          agentCode: agent.agentCode,
          assignedCount: agent.assignedOrders.length,
          completedCount: agent.assignedOrders.filter((order: any) =>
            ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status)
          ).length,
          pendingCount: agent.assignedOrders.filter((order: any) =>
            ['ASSIGNED', 'IN_PROGRESS'].includes(order.status)
          ).length
        }))
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get assignment analytics error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch assignment analytics'
        }
      });
    }
  }

  /**
   * Mark agent as active for assignment purposes (when they log in)
   */
  async markAgentActive(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Agent ID is required'
          }
        });
      }

      // Allow agents to mark themselves as active, or managers to mark any agent
      if (userId !== agentId && !['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to mark agent as active'
          }
        });
      }

      await assignmentService.markAgentAsActive(agentId);

      res.json({
        success: true,
        message: 'Agent marked as active for assignments'
      });
    } catch (error) {
      console.error('Mark agent active error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to mark agent as active'
        }
      });
    }
  }

  /**
   * Test assignment system with a limited number of orders
   */
  async testAssignment(req: Request, res: Response) {
    try {
      const userRole = (req as any).user?.role;
      const { maxOrders = 10 } = req.body;

      // Only allow ADMIN and TEAM_MANAGER to test assignments
      if (!['ADMIN', 'TEAM_MANAGER'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to test assignments'
          }
        });
      }

      const result = await assignmentService.testAssignmentSystem(maxOrders);

      res.json({
        success: true,
        data: result,
        message: `Test completed: ${result.successfulAssignments} orders assigned out of ${result.totalProcessed} processed`
      });
    } catch (error) {
      console.error('Test assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test assignment system'
        }
      });
    }
  }
}