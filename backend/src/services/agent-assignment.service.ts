import { PrismaClient, AgentAvailability, UserRole } from '@prisma/client';
import { Redis } from 'ioredis';
import { notificationIntegrationService } from './notification-integration.service';
import { productAssignmentService } from './product-assignment.service';
import { prisma } from '../config/database';

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
        include: {
          assignedAgent: true,
          items: true // Include items to get product names
        }
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

      // Get product names from order items
      const productNames = order.items.map(item => item.title);

      // Get available agents based on product assignments
      const availableAgents = await this.getAvailableAgentsForProducts(productNames);

      if (availableAgents.length === 0) {
        return {
          success: false,
          message: 'No agents assigned to the products in this order',
          orderId
        };
      }

      // Select agent using round-robin within product-assigned agents
      const selectedAgent = await this.selectAgentRoundRobinForProducts(availableAgents, productNames);

      if (!selectedAgent) {
        return {
          success: false,
          message: 'Failed to select an agent',
          orderId
        };
      }

      // Perform the assignment
      await this.performAssignment(orderId, selectedAgent.id);

      // Send notification after successful assignment (silent for automatic assignments)
      await notificationIntegrationService.handleOrderAssignment(orderId, selectedAgent.id);

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
   * Assign multiple orders in batch with connection management
   */
  async assignOrdersBatch(orderIds: string[], batchSize: number = 5): Promise<AssignmentResult[]> {
    const results: AssignmentResult[] = [];
    
    // Process in much smaller batches to prevent connection overflow
    // Reduced from 50 to 5 orders per batch to manage connections better
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(orderIds.length/batchSize)} (${batch.length} orders)`);
      
      // Process batch sequentially to control connections
      for (const orderId of batch) {
        try {
          const result = await this.assignOrder(orderId);
          results.push(result);
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error assigning order ${orderId}:`, error);
          results.push({
            success: false,
            message: error instanceof Error ? error.message : 'Assignment failed',
            orderId
          });
        }
      }
      
      // Longer delay between batches to allow connection cleanup
      if (i + batchSize < orderIds.length) {
        console.log(`Batch completed. Waiting 3 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }

    return results;
  }

  /**
   * Auto-assign all unassigned orders (limited to last 15,000 orders for performance)
   */
  async autoAssignUnassignedOrders(): Promise<{
    totalProcessed: number;
    successfulAssignments: number;
    failedAssignments: number;
    results: AssignmentResult[];
  }> {
    // 🚀 PERFORMANCE: Get only the last 15,000 orders for assignment consideration
    const recentOrderIds = await prisma.order.findMany({
      select: { id: true },
      orderBy: { orderDate: 'desc' }, // Use orderDate instead of createdAt
      take: 15000 // Limit to last 15,000 orders only
    });

    const recentOrderIdList = recentOrderIds.map(order => order.id);

    // Get unassigned orders from the last 15,000 orders only
    const unassignedOrders = await prisma.order.findMany({
      where: {
        id: { in: recentOrderIdList }, // Only consider last 15,000 orders
        assignedAgentId: null,
        // Include orders with any shipping status except delivered/cancelled
        OR: [
          { shippingStatus: null },
          { shippingStatus: { notIn: ['Livré', 'livré', 'LIVRE', 'annulé', 'Annulé', 'ANNULE'] } }
        ]
      },
      select: { id: true },
      orderBy: { orderDate: 'desc' }, // Use orderDate instead of createdAt
      take: 1000 // Process max 1,000 orders per run to prevent connection exhaustion
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
   * Get available AGENT_SUIVI agents based on capacity only (online status removed)
   */
  private async getAvailableAgents(): Promise<AgentStatus[]> {
    // 🚀 PERFORMANCE: Get all active AGENT_SUIVI users in single query
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

    // 🚀 PERFORMANCE: Get today's assignment counts for all agents in single query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const agentAssignmentCounts = await prisma.order.groupBy({
      by: ['assignedAgentId'],
      where: {
        assignedAgentId: { in: agents.map(a => a.id) },
        assignedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: {
        id: true
      }
    });

    // Create lookup map for assignment counts
    const assignmentCountMap = new Map();
    agentAssignmentCounts.forEach(count => {
      if (count.assignedAgentId) {
        assignmentCountMap.set(count.assignedAgentId, count._count.id);
      }
    });

    const availableAgents: AgentStatus[] = [];

    for (const agent of agents) {
      const todaysAssignedOrdersCount = assignmentCountMap.get(agent.id) || 0;
      const hasCapacity = todaysAssignedOrdersCount < agent.maxOrders;
      
      availableAgents.push({
        id: agent.id,
        name: agent.name || '',
        agentCode: agent.agentCode || '',
        isActive: true,
        isOnline: true, // Always consider as online - removed online status dependency
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
   * Get available agents for specific products (optimized, online status removed)
   */
  private async getAvailableAgentsForProducts(productNames: string[]): Promise<AgentStatus[]> {
    if (productNames.length === 0) {
      return this.getAvailableAgents(); // Fallback to all agents if no products
    }

    // 🚀 PERFORMANCE: Get all users assigned to products in single query
    const productAssignments = await prisma.userProductAssignment.findMany({
      where: {
        productName: { in: productNames },
        isActive: true
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            agentCode: true,
            maxOrders: true,
            currentOrders: true,
            isActive: true,
            role: true
          }
        }
      }
    });

    // Filter for active AGENT_SUIVI users only
    const agents = productAssignments
      .filter(assignment =>
        assignment.user.isActive &&
        assignment.user.role === 'AGENT_SUIVI'
      )
      .map(assignment => assignment.user);

    // Remove duplicates
    const uniqueAgents = agents.filter((agent, index, self) =>
      index === self.findIndex(a => a.id === agent.id)
    );

    if (uniqueAgents.length === 0) {
      return this.getAvailableAgents(); // Fallback to all agents if no assignments
    }

    // 🚀 PERFORMANCE: Get today's assignment counts for all agents in single query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const agentAssignmentCounts = await prisma.order.groupBy({
      by: ['assignedAgentId'],
      where: {
        assignedAgentId: { in: uniqueAgents.map(a => a.id) },
        assignedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: {
        id: true
      }
    });

    // Create lookup map for assignment counts
    const assignmentCountMap = new Map();
    agentAssignmentCounts.forEach(count => {
      if (count.assignedAgentId) {
        assignmentCountMap.set(count.assignedAgentId, count._count.id);
      }
    });

    const availableAgents: AgentStatus[] = [];

    for (const agent of uniqueAgents) {
      const todaysAssignedOrdersCount = assignmentCountMap.get(agent.id) || 0;
      const hasCapacity = todaysAssignedOrdersCount < agent.maxOrders;
      
      availableAgents.push({
        id: agent.id,
        name: agent.name || '',
        agentCode: agent.agentCode || '',
        isActive: true,
        isOnline: true, // Always consider as online - removed online status dependency
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
   * Round-robin agent selection for specific products
   */
  private async selectAgentRoundRobinForProducts(agents: AgentStatus[], productNames: string[]): Promise<AgentStatus | null> {
    if (agents.length === 0) return null;

    // Create a unique key for this product combination
    const productKey = productNames.sort().join('|');
    const roundRobinKey = `${this.ROUND_ROBIN_KEY}:products:${productKey}`;

    // Get the last assigned agent index from Redis for this product combination
    const lastIndex = await this.redis.get(roundRobinKey);
    
    let nextIndex = 0;
    if (lastIndex !== null) {
      nextIndex = (parseInt(lastIndex) + 1) % agents.length;
    }

    // Update the index in Redis
    await this.redis.set(roundRobinKey, nextIndex.toString());

    return agents[nextIndex];
  }

  /**
   * Perform the actual assignment in the database
   */
  private async performAssignment(orderId: string, agentId: string, adminId?: string) {
    return await prisma.$transaction(async (tx) => {
      // First, get the current order to check shipping status
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { shippingStatus: true }
      });

      // 🎯 AUTO-UPDATE: If shipping status is "LIVRÉ", set status to "DELIVERED" instead of "ASSIGNED"
      const orderStatus = currentOrder?.shippingStatus === 'LIVRÉ' ? 'DELIVERED' : 'ASSIGNED';
      
      if (currentOrder?.shippingStatus === 'LIVRÉ') {
        console.log(`🚚 Auto-updating order ${orderId} status to DELIVERED during assignment (shipping status: LIVRÉ)`);
      }

      // Update the order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          assignedAgentId: agentId,
          assignedAt: new Date(),
          status: orderStatus
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

      // 🚨 OPTIMIZED: Only create activity log for manual assignments to reduce database bloat
      if (adminId) {
        await tx.agentActivity.create({
          data: {
            agentId: agentId,
            orderId: orderId,
            activityType: 'ORDER_ASSIGNED',
            description: `Order manually assigned by admin (${adminId})`
          }
        });
      }
      // For automatic assignments, we rely on the order's assignedAt timestamp instead of creating activity records

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
        
        // Send notification after successful manual assignment
        await notificationIntegrationService.handleOrderAssignment(orderId, agentId, adminId);
        
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

      // 🚨 OPTIMIZED: Only create activity log for manual reassignments by admin
      if (adminId) {
        await tx.agentActivity.create({
          data: {
            agentId: newAgentId,
            orderId: orderId,
            activityType: 'ORDER_ASSIGNED',
            description: `Order reassigned by admin (${adminId}) from agent ${oldAgentId}`
          }
        });
      }
      // For automatic reassignments, we rely on the order's assignedAt timestamp
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
   * Test assignment system - assign a batch of unassigned orders (limited to last 15,000 orders)
   */
  async testAssignmentSystem(maxOrders: number = 10): Promise<{
    totalProcessed: number;
    successfulAssignments: number;
    failedAssignments: number;
    results: AssignmentResult[];
  }> {
    console.log(`🧪 Testing assignment system with max ${maxOrders} orders...`);
    
    // 🚀 PERFORMANCE: Get only the last 15,000 orders for testing
    const recentOrderIds = await prisma.order.findMany({
      select: { id: true },
      orderBy: { orderDate: 'desc' }, // Use orderDate instead of createdAt
      take: 15000 // Limit to last 15,000 orders only
    });

    const recentOrderIdList = recentOrderIds.map(order => order.id);

    // Get some unassigned orders for testing from last 15,000 orders only
    const testOrders = await prisma.order.findMany({
      where: {
        id: { in: recentOrderIdList }, // Only consider last 15,000 orders
        assignedAgentId: null,
        // Include orders with any shipping status except delivered/cancelled
        OR: [
          { shippingStatus: null },
          { shippingStatus: { notIn: ['Livré', 'livré', 'LIVRE', 'annulé', 'Annulé', 'ANNULE'] } }
        ]
      },
      select: { id: true, reference: true },
      orderBy: { orderDate: 'desc' }, // Use orderDate instead of createdAt
      take: maxOrders
    });

    if (testOrders.length === 0) {
      console.log('❌ No unassigned orders found for testing in last 15,000 orders');
      return {
        totalProcessed: 0,
        successfulAssignments: 0,
        failedAssignments: 0,
        results: []
      };
    }

    console.log(`📋 Found ${testOrders.length} orders to test assignment from last 15,000 orders`);
    
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
      // Remove socket connection and activity tracking
      await this.redis.del(`socket:agent:${agentId}`);
      await this.redis.del(`activity:agent:${agentId}`);
      
      // Update database availability to OFFLINE
      await prisma.user.update({
        where: { id: agentId },
        data: { availability: 'OFFLINE' }
      });
      
      console.log(`✅ Agent ${agentId} marked as offline`);
      
      // 🚨 REMOVED AUTOMATIC REDISTRIBUTION - Only redistribute when explicitly requested by admin
      // await this.redistributeAgentOrders(agentId);
      console.log(`📋 Orders remain assigned to ${agentId} - use manual redistribution if needed`);
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
   * Get assignment statistics for dashboard (limited to last 15,000 orders, online status removed)
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
    // 🚀 PERFORMANCE: Get all AGENT_SUIVI users
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

    // 🚀 PERFORMANCE: Get only the last 15,000 orders for statistics
    const recentOrderIds = await prisma.order.findMany({
      select: { id: true },
      orderBy: { orderDate: 'desc' }, // Use orderDate instead of createdAt
      take: 15000 // Limit to last 15,000 orders only
    });

    const recentOrderIdList = recentOrderIds.map(order => order.id);

    // Get unassigned orders count from last 15,000 orders only
    const unassignedOrders = await prisma.order.count({
      where: {
        id: { in: recentOrderIdList }, // Only consider last 15,000 orders
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
      }
    });

    // 🚀 PERFORMANCE: Get assigned orders count for all agents in single query
    const assignedOrderCounts = await prisma.order.groupBy({
      by: ['assignedAgentId'],
      where: {
        id: { in: recentOrderIdList }, // Only consider last 15,000 orders
        assignedAgentId: { in: agents.map(a => a.id) },
        status: 'ASSIGNED'
      },
      _count: {
        id: true
      }
    });

    // Create lookup map for assigned order counts
    const assignedCountMap = new Map();
    assignedOrderCounts.forEach(count => {
      if (count.assignedAgentId) {
        assignedCountMap.set(count.assignedAgentId, count._count.id);
      }
    });

    let totalAssignedOrders = 0;
    const agentWorkloads = [];

    for (const agent of agents) {
      const assignedOrders = assignedCountMap.get(agent.id) || 0;
      totalAssignedOrders += assignedOrders;

      const utilizationRate = agent.maxOrders > 0 ? (assignedOrders / agent.maxOrders) * 100 : 0;

      agentWorkloads.push({
        agentId: agent.id,
        agentName: agent.name || 'Unknown',
        agentCode: agent.agentCode || '',
        isOnline: true, // Always consider as online - removed online status dependency
        assignedOrders,
        maxOrders: agent.maxOrders,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      });
    }

    return {
      totalAgents: agents.length,
      onlineAgents: agents.length, // All agents considered online
      offlineAgents: 0, // No offline agents since we removed online status
      unassignedOrders,
      totalAssignedOrders,
      agentWorkloads
    };
  }

  /**
   * Get assignment statistics for a specific agent (considering product assignments)
   */
  async getAgentSpecificStats(agentId: string): Promise<{
    assignedOrders: number;
    pendingOrders: number;
    completedToday: number;
    maxOrders: number;
    utilizationRate: number;
  }> {
    // Get agent info
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { maxOrders: true }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get agent's assigned products
    const assignedProducts = await prisma.userProductAssignment.findMany({
      where: { userId: agentId },
      select: { productName: true }
    });

    const productNames = assignedProducts.map((p: { productName: string }) => p.productName);
    
    console.log(`🔍 Agent ${agentId} product assignments:`, productNames.length, productNames);

    // Build where clause for orders assigned to this agent
    const baseWhere: any = {
      assignedAgentId: agentId
    };

    // 🔧 FIX: Only apply product filtering if agent has specific product assignments
    // If no product assignments, show ALL assigned orders (like admin view)
    if (productNames.length > 0) {
      baseWhere.items = {
        some: {
          title: {
            in: productNames
          }
        }
      };
      console.log(`📦 Applying product filter for agent ${agentId}:`, productNames);
    } else {
      console.log(`📦 No product assignments for agent ${agentId}, showing ALL assigned orders`);
    }
    // If agent has no product assignments, don't add product filtering
    // This ensures they see all their assigned orders

    // Count orders by status
    console.log(`🔍 Base where clause for agent ${agentId}:`, JSON.stringify(baseWhere, null, 2));
    
    const [assignedCount, inProgressCount, completedTodayCount] = await Promise.all([
      // Count ASSIGNED orders
      prisma.order.count({
        where: {
          assignedAgentId: agentId,
          status: 'ASSIGNED',
          ...(productNames.length > 0 ? {
            items: {
              some: {
                title: {
                  in: productNames
                }
              }
            }
          } : {})
        }
      }),
      // Count IN_PROGRESS orders
      prisma.order.count({
        where: {
          assignedAgentId: agentId,
          status: 'IN_PROGRESS',
          ...(productNames.length > 0 ? {
            items: {
              some: {
                title: {
                  in: productNames
                }
              }
            }
          } : {})
        }
      }),
      // Count completed today
      prisma.order.count({
        where: {
          assignedAgentId: agentId,
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
          assignedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          },
          ...(productNames.length > 0 ? {
            items: {
              some: {
                title: {
                  in: productNames
                }
              }
            }
          } : {})
        }
      })
    ]);

    console.log(`📊 Agent ${agentId} counts - Assigned: ${assignedCount}, InProgress: ${inProgressCount}, CompletedToday: ${completedTodayCount}`);

    const pendingCount = assignedCount + inProgressCount;
    const utilizationRate = agent.maxOrders > 0 ? (assignedCount / agent.maxOrders) * 100 : 0;

    return {
      assignedOrders: assignedCount,
      pendingOrders: pendingCount,
      completedToday: completedTodayCount,
      maxOrders: agent.maxOrders,
      utilizationRate: Math.round(utilizationRate)
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

        // ORDER_ASSIGNMENT notifications disabled per user request
        console.log(`📋 Order reassignment notification disabled for order ${order.reference} reassigned to agent ${newAgentId}`);
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
