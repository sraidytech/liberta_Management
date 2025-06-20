import { PrismaClient, AgentAvailability, UserRole } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();

export interface AssignmentResult {
  success: boolean;
  assignedAgentId?: string;
  assignedAgentName?: string;
  message: string;
  orderId: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  agentCode: string;
  isActive: boolean;
  isOnline: boolean;
  currentOrders: number;
  maxOrders: number;
  lastActivity?: Date;
}

export class AgentAssignmentService {
  private redis: Redis;
  private readonly ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly ROUND_ROBIN_KEY = 'assignment:last_agent_index';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Assign a single order to an available AGENT_SUIVI using round-robin
   */
  async assignOrder(orderId: string): Promise<AssignmentResult> {
    try {
      // Check if order exists and is not already assigned
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { assignedAgent: true }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          orderId
        };
      }

      if (order.assignedAgentId) {
        return {
          success: false,
          message: `Order already assigned to ${order.assignedAgent?.name}`,
          orderId,
          assignedAgentId: order.assignedAgentId,
          assignedAgentName: order.assignedAgent?.name || 'Unknown'
        };
      }

      // Get available AGENT_SUIVI agents (mandatory assignment - always get agents)
      const availableAgents = await this.getAvailableAgents();

      if (availableAgents.length === 0) {
        return {
          success: false,
          message: 'No AGENT_SUIVI users found in the system',
          orderId
        };
      }

      // Select agent using round-robin
      const selectedAgent = await this.selectAgentRoundRobin(availableAgents);

      if (!selectedAgent) {
        return {
          success: false,
          message: 'Failed to select an agent',
          orderId
        };
      }

      // Perform the assignment
      await this.performAssignment(orderId, selectedAgent.id);

      return {
        success: true,
        assignedAgentId: selectedAgent.id,
        assignedAgentName: selectedAgent.name || selectedAgent.agentCode || 'Unknown',
        message: `Order assigned to ${selectedAgent.name || selectedAgent.agentCode}`,
        orderId
      };

    } catch (error) {
      console.error('Agent assignment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Assignment failed',
        orderId
      };
    }
  }

  /**
   * Assign multiple orders in batch
   */
  async assignOrdersBatch(orderIds: string[]): Promise<AssignmentResult[]> {
    const results: AssignmentResult[] = [];
    
    for (const orderId of orderIds) {
      const result = await this.assignOrder(orderId);
      results.push(result);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Auto-assign all unassigned orders
   */
  async autoAssignUnassignedOrders(): Promise<{
    totalProcessed: number;
    successfulAssignments: number;
    failedAssignments: number;
    results: AssignmentResult[];
  }> {
    // Get unassigned orders - only last 10,000 orders excluding delivered/cancelled ones
    const unassignedOrders = await prisma.order.findMany({
      where: {
        assignedAgentId: null,
        // Include orders with any shipping status except delivered/cancelled
        OR: [
          { shippingStatus: null },
          { shippingStatus: { notIn: ['Livré', 'livré', 'LIVRE', 'annulé', 'Annulé', 'ANNULE'] } }
        ]
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' }, // Get most recent orders first
      take: 10000 // Limit to last 10,000 orders
    });

    const orderIds = unassignedOrders.map(order => order.id);
    const results = await this.assignOrdersBatch(orderIds);

    const successfulAssignments = results.filter(r => r.success).length;
    const failedAssignments = results.filter(r => !r.success).length;

    console.log(`Auto-assignment completed: ${successfulAssignments} successful, ${failedAssignments} failed`);

    return {
      totalProcessed: results.length,
      successfulAssignments,
      failedAssignments,
      results
    };
  }

  /**
   * Get available AGENT_SUIVI agents based on capacity (not requiring online status)
   */
  private async getAvailableAgents(): Promise<AgentStatus[]> {
    // Get all active AGENT_SUIVI users
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'AGENT_SUIVI'
      },
      select: {
        id: true,
        name: true,
        agentCode: true,
        maxOrders: true,
        currentOrders: true
      }
    });

    const availableAgents: AgentStatus[] = [];

    for (const agent of agents) {
      // Check if agent has capacity based on TODAY's assignments only
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysAssignedOrdersCount = await prisma.order.count({
        where: {
          assignedAgentId: agent.id,
          assignedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      const hasCapacity = todaysAssignedOrdersCount < agent.maxOrders;

      // For mandatory assignment, include all agents even if they exceed daily limit
      // But prioritize those with capacity
      const isOnline = await this.isAgentOnline(agent.id);
      
      availableAgents.push({
        id: agent.id,
        name: agent.name || '',
        agentCode: agent.agentCode || '',
        isActive: true,
        isOnline: isOnline,
        currentOrders: todaysAssignedOrdersCount,
        maxOrders: agent.maxOrders,
        hasCapacity: hasCapacity
      } as AgentStatus & { hasCapacity: boolean });
    }

    // Sort agents: those with capacity first, then by current orders (ascending)
    availableAgents.sort((a, b) => {
      const aHasCapacity = (a as any).hasCapacity;
      const bHasCapacity = (b as any).hasCapacity;
      
      if (aHasCapacity && !bHasCapacity) return -1;
      if (!aHasCapacity && bHasCapacity) return 1;
      
      return a.currentOrders - b.currentOrders;
    });

    return availableAgents;
  }

  /**
   * Check if an agent is online based on socket connection and recent activity
   */
  private async isAgentOnline(agentId: string): Promise<boolean> {
    try {
      // Check if agent has an active socket connection
      const socketKey = `socket:agent:${agentId}`;
      const socketId = await this.redis.get(socketKey);
      
      if (!socketId) {
        return false;
      }

      // Check last activity timestamp
      const activityKey = `activity:agent:${agentId}`;
      const lastActivity = await this.redis.get(activityKey);
      
      if (!lastActivity) {
        return false;
      }

      const lastActivityTime = new Date(lastActivity);
      const now = new Date();
      const timeDiff = now.getTime() - lastActivityTime.getTime();

      return timeDiff <= this.ACTIVITY_TIMEOUT;
    } catch (error) {
      console.error('Error checking agent online status:', error);
      return false;
    }
  }

  /**
   * Round-robin agent selection
   */
  private async selectAgentRoundRobin(agents: AgentStatus[]): Promise<AgentStatus | null> {
    if (agents.length === 0) return null;

    // Get the last assigned agent index from Redis
    const lastIndex = await this.redis.get(this.ROUND_ROBIN_KEY);
    
    let nextIndex = 0;
    if (lastIndex !== null) {
      nextIndex = (parseInt(lastIndex) + 1) % agents.length;
    }

    // Update the index in Redis
    await this.redis.set(this.ROUND_ROBIN_KEY, nextIndex.toString());

    return agents[nextIndex];
  }

  /**
   * Perform the actual assignment in the database
   */
  private async performAssignment(orderId: string, agentId: string, adminId?: string) {
    return await prisma.$transaction(async (tx) => {
      // Update the order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          assignedAgentId: agentId,
          assignedAt: new Date(),
          status: 'ASSIGNED'
        }
      });

      // Increment agent's current orders count
      await tx.user.update({
        where: { id: agentId },
        data: {
          currentOrders: {
            increment: 1
          }
        }
      });

      // Create activity log
      await tx.agentActivity.create({
        data: {
          agentId: agentId,
          orderId: orderId,
          activityType: 'ORDER_ASSIGNED',
          description: adminId
            ? `Order manually assigned by admin (${adminId})`
            : 'Order automatically assigned via round-robin system'
        }
      });

      // Create notification for the agent
      await tx.notification.create({
        data: {
          userId: agentId,
          orderId: orderId,
          type: 'ORDER_ASSIGNMENT',
          title: 'New Order Assigned',
          message: `Order ${updatedOrder.reference} has been automatically assigned to you`
        }
      });

      return updatedOrder;
    });
  }

  /**
   * Manually assign an order to a specific agent (for admin use)
   */
  async manualAssignOrder(orderId: string, agentId: string, adminId?: string): Promise<AssignmentResult> {
    try {
      // Check if order exists
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { assignedAgent: true }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          orderId
        };
      }

      // Check if agent exists and is AGENT_SUIVI
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, agentCode: true, role: true, isActive: true }
      });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          orderId
        };
      }

      if (agent.role !== 'AGENT_SUIVI') {
        return {
          success: false,
          message: 'Selected user is not an AGENT_SUIVI',
          orderId
        };
      }

      if (!agent.isActive) {
        return {
          success: false,
          message: 'Selected agent is not active',
          orderId
        };
      }

      // If order is already assigned, handle reassignment
      if (order.assignedAgentId) {
        if (order.assignedAgentId === agentId) {
          return {
            success: false,
            message: `Order is already assigned to ${agent.name || agent.agentCode}`,
            orderId,
            assignedAgentId: agentId,
            assignedAgentName: agent.name || agent.agentCode || 'Unknown'
          };
        }

        // Reassign to new agent
        await this.performReassignment(orderId, order.assignedAgentId, agentId, adminId);
        
        return {
          success: true,
          assignedAgentId: agentId,
          assignedAgentName: agent.name || agent.agentCode || 'Unknown',
          message: `Order reassigned from ${order.assignedAgent?.name || 'previous agent'} to ${agent.name || agent.agentCode}`,
          orderId
        };
      } else {
        // Assign to agent for the first time
        await this.performAssignment(orderId, agentId, adminId);
        
        return {
          success: true,
          assignedAgentId: agentId,
          assignedAgentName: agent.name || agent.agentCode || 'Unknown',
          message: `Order manually assigned to ${agent.name || agent.agentCode}`,
          orderId
        };
      }

    } catch (error) {
      console.error('Manual assignment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Manual assignment failed',
        orderId
      };
    }
  }

  /**
   * Get list of all available agents for manual assignment
   */
  async getAgentsForManualAssignment(): Promise<{
    id: string;
    name: string;
    agentCode: string;
    isActive: boolean;
    isOnline: boolean;
    todaysOrders: number;
    maxOrders: number;
    utilizationRate: number;
  }[]> {
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT_SUIVI',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        agentCode: true,
        isActive: true,
        maxOrders: true
      },
      orderBy: { name: 'asc' }
    });

    const agentStats = [];

    for (const agent of agents) {
      // Get today's assignments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysOrders = await prisma.order.count({
        where: {
          assignedAgentId: agent.id,
          assignedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      const isOnline = await this.isAgentOnline(agent.id);
      const utilizationRate = Math.round((todaysOrders / agent.maxOrders) * 100);

      agentStats.push({
        id: agent.id,
        name: agent.name || agent.agentCode || 'Unknown',
        agentCode: agent.agentCode || '',
        isActive: agent.isActive,
        isOnline,
        todaysOrders,
        maxOrders: agent.maxOrders,
        utilizationRate
      });
    }

    // Sort by utilization rate (ascending) to show least loaded agents first
    return agentStats.sort((a, b) => a.utilizationRate - b.utilizationRate);
  }


  /**
   * Handle reassignment between agents
   */
  private async performReassignment(orderId: string, oldAgentId: string, newAgentId: string, adminId?: string) {
    return await prisma.$transaction(async (tx) => {
      // Update the order
      await tx.order.update({
        where: { id: orderId },
        data: {
          assignedAgentId: newAgentId,
          assignedAt: new Date(),
          status: 'ASSIGNED'
        }
      });

      // Create activity log for reassignment
      await tx.agentActivity.create({
        data: {
          agentId: newAgentId,
          orderId: orderId,
          activityType: 'ORDER_ASSIGNED',
          description: adminId
            ? `Order reassigned by admin (${adminId}) from agent ${oldAgentId}`
            : `Order reassigned from agent ${oldAgentId}`
        }
      });
    });
  }

  /**
   * Update agent online status and activity timestamp
   */
  async updateAgentActivity(agentId: string, socketId?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Update last activity timestamp
      await this.redis.set(`activity:agent:${agentId}`, now);
      
      // Update socket connection if provided
      if (socketId) {
        await this.redis.set(`socket:agent:${agentId}`, socketId);
      }
    } catch (error) {
      console.error('Error updating agent activity:', error);
    }
  }

  /**
   * Mark agent as active when they log in (for assignment purposes)
   */
  async markAgentAsActive(agentId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Set activity timestamp to mark them as recently active
      await this.redis.set(`activity:agent:${agentId}`, now);
      
      // Update their availability to ONLINE in database
      await prisma.user.update({
        where: { id: agentId },
        data: { availability: 'ONLINE' }
      });

      console.log(`✅ Agent ${agentId} marked as active for assignments`);
    } catch (error) {
      console.error('Error marking agent as active:', error);
    }
  }

  /**
   * Test assignment system - assign a batch of unassigned orders
   */
  async testAssignmentSystem(maxOrders: number = 10): Promise<{
    totalProcessed: number;
    successfulAssignments: number;
    failedAssignments: number;
    results: AssignmentResult[];
  }> {
    console.log(`🧪 Testing assignment system with max ${maxOrders} orders...`);
    
    // Get some unassigned orders for testing
    const testOrders = await prisma.order.findMany({
      where: {
        assignedAgentId: null,
        // Include orders with any shipping status except delivered/cancelled
        OR: [
          { shippingStatus: null },
          { shippingStatus: { notIn: ['Livré', 'livré', 'LIVRE', 'annulé', 'Annulé', 'ANNULE'] } }
        ]
      },
      select: { id: true, reference: true },
      orderBy: { createdAt: 'desc' },
      take: maxOrders
    });

    if (testOrders.length === 0) {
      console.log('❌ No unassigned orders found for testing');
      return {
        totalProcessed: 0,
        successfulAssignments: 0,
        failedAssignments: 0,
        results: []
      };
    }

    console.log(`📋 Found ${testOrders.length} orders to test assignment`);
    
    const orderIds = testOrders.map(order => order.id);
    const results = await this.assignOrdersBatch(orderIds);

    const successfulAssignments = results.filter(r => r.success).length;
    const failedAssignments = results.filter(r => !r.success).length;

    console.log(`✅ Test completed: ${successfulAssignments} successful, ${failedAssignments} failed`);

    return {
      totalProcessed: results.length,
      successfulAssignments,
      failedAssignments,
      results
    };
  }

  /**
   * Update agent availability status
   */
  async updateAgentAvailability(agentId: string, availability: AgentAvailability): Promise<boolean> {
    try {
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

      return true;
    } catch (error) {
      console.error('Error updating agent availability:', error);
      return false;
    }
  }

  /**
   * Remove agent from online status (when they disconnect)
   */
  async setAgentOffline(agentId: string): Promise<void> {
    try {
      // Remove socket connection
      await this.redis.del(`socket:agent:${agentId}`);
      
      // Optionally redistribute ASSIGNED orders to other online agents
      await this.redistributeAgentOrders(agentId);
    } catch (error) {
      console.error('Error setting agent offline:', error);
    }
  }

  /**
   * Redistribute ASSIGNED orders from an offline agent to other online agents
   */
  async redistributeAgentOrders(offlineAgentId: string): Promise<{
    redistributed: number;
    errors: number;
  }> {
    try {
      // Get orders that are still in ASSIGNED status
      const ordersToRedistribute = await prisma.order.findMany({
        where: {
          assignedAgentId: offlineAgentId,
          status: 'ASSIGNED'
        },
        select: { id: true, reference: true }
      });

      if (ordersToRedistribute.length === 0) {
        return { redistributed: 0, errors: 0 };
      }

      console.log(`Redistributing ${ordersToRedistribute.length} orders from offline agent ${offlineAgentId}`);

      // Unassign the orders first
      await prisma.order.updateMany({
        where: {
          assignedAgentId: offlineAgentId,
          status: 'ASSIGNED'
        },
        data: {
          assignedAgentId: null,
          status: 'PENDING'
        }
      });

      // Update agent's current orders count
      await prisma.user.update({
        where: { id: offlineAgentId },
        data: {
          currentOrders: {
            decrement: ordersToRedistribute.length
          }
        }
      });

      // Reassign the orders
      const orderIds = ordersToRedistribute.map(order => order.id);
      const results = await this.assignOrdersBatch(orderIds);

      const redistributed = results.filter(r => r.success).length;
      const errors = results.filter(r => !r.success).length;

      console.log(`Redistribution completed: ${redistributed} successful, ${errors} failed`);

      return { redistributed, errors };
    } catch (error) {
      console.error('Error redistributing agent orders:', error);
      return { redistributed: 0, errors: 1 };
    }
  }

  /**
   * Get assignment statistics for dashboard
   */
  async getAssignmentStats(): Promise<{
    totalAgents: number;
    onlineAgents: number;
    offlineAgents: number;
    unassignedOrders: number;
    totalAssignedOrders: number;
    agentWorkloads: Array<{
      agentId: string;
      agentName: string;
      agentCode: string;
      isOnline: boolean;
      assignedOrders: number;
      maxOrders: number;
      utilizationRate: number;
    }>;
  }> {
    // Get all AGENT_SUIVI users
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'AGENT_SUIVI'
      },
      select: {
        id: true,
        name: true,
        agentCode: true,
        maxOrders: true
      }
    });

    // Get unassigned orders count - only last 10,000 orders with delivery status not 'livre' or 'retour'
    const unassignedOrders = await prisma.order.count({
      where: {
        assignedAgentId: null,
        AND: [
          {
            OR: [
              { shippingStatus: { not: 'Livré' } },
              { shippingStatus: { not: 'annulé' } },
              { shippingStatus: null }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10000
    });

    let onlineAgents = 0;
    let totalAssignedOrders = 0;
    const agentWorkloads = [];

    for (const agent of agents) {
      const isOnline = await this.isAgentOnline(agent.id);
      if (isOnline) onlineAgents++;

      // Count only ASSIGNED orders
      const assignedOrders = await prisma.order.count({
        where: {
          assignedAgentId: agent.id,
          status: 'ASSIGNED'
        }
      });

      totalAssignedOrders += assignedOrders;

      const utilizationRate = agent.maxOrders > 0 ? (assignedOrders / agent.maxOrders) * 100 : 0;

      agentWorkloads.push({
        agentId: agent.id,
        agentName: agent.name || 'Unknown',
        agentCode: agent.agentCode || '',
        isOnline,
        assignedOrders,
        maxOrders: agent.maxOrders,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      });
    }

    return {
      totalAgents: agents.length,
      onlineAgents,
      offlineAgents: agents.length - onlineAgents,
      unassignedOrders,
      totalAssignedOrders,
      agentWorkloads
    };
  }

  /**
   * Manual reassignment by team managers
   */
  async reassignOrder(orderId: string, newAgentId: string, managerId: string): Promise<AssignmentResult> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { assignedAgent: true }
      });

      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          orderId
        };
      }

      const newAgent = await prisma.user.findUnique({
        where: { id: newAgentId, role: 'AGENT_SUIVI', isActive: true }
      });

      if (!newAgent) {
        return {
          success: false,
          message: 'Invalid or inactive agent',
          orderId
        };
      }

      // Perform reassignment
      await prisma.$transaction(async (tx) => {
        // Update order assignment
        await tx.order.update({
          where: { id: orderId },
          data: {
            assignedAgentId: newAgentId,
            assignedAt: new Date()
          }
        });

        // Update agent counts
        if (order.assignedAgentId) {
          await tx.user.update({
            where: { id: order.assignedAgentId },
            data: { currentOrders: { decrement: 1 } }
          });
        }

        await tx.user.update({
          where: { id: newAgentId },
          data: { currentOrders: { increment: 1 } }
        });

        // Create activity log
        await tx.agentActivity.create({
          data: {
            agentId: managerId,
            orderId: orderId,
            activityType: 'ORDER_ASSIGNED',
            description: `Order manually reassigned to ${newAgent.name || newAgent.agentCode}`
          }
        });

        // Create notification for new agent
        await tx.notification.create({
          data: {
            userId: newAgentId,
            orderId: orderId,
            type: 'ORDER_ASSIGNMENT',
            title: 'Order Reassigned',
            message: `Order ${order.reference} has been reassigned to you`
          }
        });
      });

      return {
        success: true,
        assignedAgentId: newAgentId,
        assignedAgentName: newAgent.name || newAgent.agentCode || 'Unknown',
        message: `Order reassigned to ${newAgent.name || newAgent.agentCode}`,
        orderId
      };

    } catch (error) {
      console.error('Manual reassignment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Reassignment failed',
        orderId
      };
    }
  }
}