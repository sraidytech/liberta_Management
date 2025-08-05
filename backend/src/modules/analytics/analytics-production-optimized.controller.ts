/**
 * 🚀 PRODUCTION-OPTIMIZED ANALYTICS CONTROLLER
 * 
 * This controller is specifically designed for production environments with large data volumes.
 * It replaces complex raw SQL queries with efficient, paginated Prisma queries and aggressive caching.
 */

import { Request, Response } from 'express';
import { PrismaClient, UserRole, AgentAvailability, OrderStatus } from '@prisma/client';
import redis from '@/config/redis';
import { prisma } from '@/config/database';
import { withTimeout, handleAnalyticsError } from '@/utils/query-timeout';
import { analyticsCache } from '@/services/analytics-cache.service';

export class ProductionOptimizedAnalyticsController {
  
  /**
   * PRODUCTION-OPTIMIZED Detailed Agent Reports
   * 
   * STRATEGY:
   * - Break down complex query into smaller, efficient chunks
   * - Use aggressive caching (10 minutes)
   * - Implement fallback for timeout scenarios
   * - Process data in batches to avoid memory issues
   */
  async getDetailedAgentReports(req: Request, res: Response) {
    try {
      const queryParams = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        agentId: req.query.agentId,
        storeId: req.query.storeId
      };

      // Generate cache key
      const cacheKey = analyticsCache.generateCacheKey('detailed_agent_reports_v2', queryParams);
      
      // Check cache first with longer TTL for production
      const cached = await analyticsCache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
          performance: {
            source: 'cache',
            loadTime: '< 100ms'
          }
        });
      }

      // Execute optimized query with timeout protection
      const result = await withTimeout(
        this.executeOptimizedAgentQuery(queryParams),
        25000, // 25 second timeout (more generous for production)
        'Production agent reports query'
      );

      // Cache result for 10 minutes (aggressive caching for production)
      await analyticsCache.set(cacheKey, result, {
        ttl: 600, // 10 minutes
        compress: true,
        tags: ['agents', 'production', String(queryParams.storeId || 'all')]
      });

      return res.json({
        success: true,
        data: result,
        cached: false,
        performance: {
          source: 'database',
          optimized: true,
          strategy: 'production-batch-processing'
        }
      });

    } catch (error) {
      // Fallback strategy for timeout scenarios
      if ((error as any).message?.includes('timeout') || (error as any).code === 'P2010') {
        console.log('⚠️ Agent reports timeout - serving fallback data');
        
        const fallbackData = await this.getFallbackAgentData(req.query);
        
        return res.json({
          success: true,
          data: fallbackData,
          cached: false,
          performance: {
            source: 'fallback',
            message: 'Serving simplified data due to high server load. Full reports will be available shortly.'
          }
        });
      }
      
      return handleAnalyticsError(error, 'Production Agent Reports', res);
    }
  }

  /**
   * Execute optimized agent query using batch processing
   */
  private async executeOptimizedAgentQuery(queryParams: any) {
    const {
      startDate,
      endDate,
      agentId,
      storeId
    } = queryParams;

    // Calculate date range
    const startDateParsed = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDateParsed = endDate ? new Date(endDate as string) : new Date();

    console.log(`🔄 Processing agent reports for ${startDateParsed.toISOString().split('T')[0]} to ${endDateParsed.toISOString().split('T')[0]}`);

    // STEP 1: Get basic agent information (fast query)
    const agentWhereClause: any = {
      role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
      isActive: true
    };
    
    if (agentId) agentWhereClause.id = agentId;

    const agents = await prisma.user.findMany({
      where: agentWhereClause,
      select: {
        id: true,
        name: true,
        agentCode: true,
        availability: true,
        currentOrders: true,
        maxOrders: true
      }
    });

    console.log(`👥 Found ${agents.length} agents to process`);

    // STEP 2: Process agents in batches to avoid memory issues
    const batchSize = 10; // Process 10 agents at a time
    const agentResults = [];

    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      console.log(`📊 Processing agent batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(agents.length/batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(agent => this.processAgentData(agent, startDateParsed, endDateParsed, storeId))
      );
      
      agentResults.push(...batchResults);
    }

    // STEP 3: Get workload distribution (separate, simpler query)
    const workloadData = await prisma.user.findMany({
      where: {
        role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        currentOrders: true,
        maxOrders: true,
        assignedOrders: {
          where: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
          },
          select: { id: true }
        }
      }
    });

    // STEP 4: Format results
    const processedWorkload = workloadData.map(agent => ({
      id: agent.id,
      name: agent.name,
      currentOrders: agent.currentOrders,
      maxOrders: agent.maxOrders,
      utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
      activeOrders: agent.assignedOrders.length
    }));

    const summary = {
      totalAgents: agentResults.length,
      activeAgents: agentResults.filter(a => a.availability !== 'OFFLINE').length,
      averageUtilization: agentResults.length > 0 
        ? agentResults.reduce((sum, a) => sum + a.utilization, 0) / agentResults.length 
        : 0,
      totalOrders: agentResults.reduce((sum, a) => sum + a.totalOrders, 0),
      totalRevenue: agentResults.reduce((sum, a) => sum + a.totalRevenue, 0),
      averageSuccessRate: agentResults.length > 0
        ? agentResults.reduce((sum, a) => sum + a.successRate, 0) / agentResults.length
        : 0
    };

    console.log(`✅ Successfully processed ${agentResults.length} agents`);

    return {
      summary,
      agentPerformance: agentResults,
      workloadDistribution: processedWorkload,
      activityBreakdown: [], // Simplified for performance
      metadata: {
        processedAt: new Date().toISOString(),
        dataRange: {
          start: startDateParsed.toISOString(),
          end: endDateParsed.toISOString()
        },
        processingStrategy: 'batch-optimized'
      }
    };
  }

  /**
   * Process individual agent data efficiently
   */
  private async processAgentData(agent: any, startDate: Date, endDate: Date, storeId?: string) {
    try {
      // Build order filter
      const orderFilter: any = {
        assignedAgentId: agent.id,
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (storeId) orderFilter.storeIdentifier = storeId;

      // Get agent's orders in the date range (with limit for safety)
      const orders = await prisma.order.findMany({
        where: orderFilter,
        select: {
          id: true,
          status: true,
          total: true
        },
        take: 5000 // Limit to prevent memory issues
      });

      // Get agent's activities (with limit for safety)
      const activities = await prisma.agentActivity.findMany({
        where: {
          agentId: agent.id,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          duration: true
        },
        take: 2000 // Limit to prevent memory issues
      });

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const confirmedOrders = orders.filter(o => o.status === 'CONFIRMED').length;
      const totalRevenue = orders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + o.total, 0);
      const totalActivities = activities.length;
      const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);

      const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      const confirmationRate = totalOrders > 0 ? (confirmedOrders / totalOrders) * 100 : 0;

      return {
        id: agent.id,
        name: agent.name,
        agentCode: agent.agentCode,
        availability: agent.availability,
        currentOrders: agent.currentOrders,
        maxOrders: agent.maxOrders,
        utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
        totalOrders,
        completedOrders,
        cancelledOrders,
        confirmedOrders,
        totalRevenue,
        averageOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
        successRate,
        cancellationRate,
        confirmationRate,
        totalActivities,
        totalWorkingHours: Math.round(totalDuration / 60),
        ordersPerDay: totalOrders > 0 ? totalOrders / 30 : 0,
        performanceScore: this.calculatePerformanceScore({
          successRate,
          utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
          totalOrders,
          activities: totalActivities
        })
      };

    } catch (error) {
      console.error(`Error processing agent ${agent.id}:`, error);
      
      // Return minimal data for failed agents
      return {
        id: agent.id,
        name: agent.name,
        agentCode: agent.agentCode,
        availability: agent.availability,
        currentOrders: agent.currentOrders,
        maxOrders: agent.maxOrders,
        utilization: 0,
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        confirmedOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        successRate: 0,
        cancellationRate: 0,
        confirmationRate: 0,
        totalActivities: 0,
        totalWorkingHours: 0,
        ordersPerDay: 0,
        performanceScore: 0,
        error: 'Data processing failed'
      };
    }
  }

  /**
   * Fallback data for timeout scenarios
   */
  private async getFallbackAgentData(queryParams: any) {
    try {
      // Return basic agent information only
      const agents = await prisma.user.findMany({
        where: {
          role: { in: ['AGENT_SUIVI', 'AGENT_CALL_CENTER'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          agentCode: true,
          availability: true,
          currentOrders: true,
          maxOrders: true
        },
        take: 50 // Limit for safety
      });

      return {
        summary: {
          totalAgents: agents.length,
          activeAgents: agents.filter(a => a.availability !== 'OFFLINE').length,
          averageUtilization: 0,
          totalOrders: 0,
          totalRevenue: 0,
          averageSuccessRate: 0
        },
        agentPerformance: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          agentCode: agent.agentCode,
          availability: agent.availability,
          currentOrders: agent.currentOrders,
          maxOrders: agent.maxOrders,
          utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          confirmedOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          successRate: 0,
          cancellationRate: 0,
          confirmationRate: 0,
          totalActivities: 0,
          totalWorkingHours: 0,
          ordersPerDay: 0,
          performanceScore: 0
        })),
        workloadDistribution: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          currentOrders: agent.currentOrders,
          maxOrders: agent.maxOrders,
          utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
          activeOrders: 0
        })),
        activityBreakdown: [],
        fallback: true,
        message: 'Simplified data due to high server load. Detailed metrics will be available when server load decreases.'
      };

    } catch (error) {
      console.error('Fallback query failed:', error);
      throw error;
    }
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: {
    successRate: number;
    utilization: number;
    totalOrders: number;
    activities: number;
  }): number {
    const { successRate, utilization, totalOrders, activities } = metrics;
    
    // Weighted scoring system
    const successWeight = 0.4;
    const utilizationWeight = 0.3;
    const volumeWeight = 0.2;
    const activityWeight = 0.1;
    
    const normalizedVolume = Math.min(totalOrders / 100, 1) * 100; // Cap at 100 orders
    const normalizedActivity = Math.min(activities / 50, 1) * 100; // Cap at 50 activities
    
    const score = (
      successRate * successWeight +
      utilization * utilizationWeight +
      normalizedVolume * volumeWeight +
      normalizedActivity * activityWeight
    );
    
    return Math.round(score);
  }
}

// Export the production-optimized controller
export const productionAnalyticsController = new ProductionOptimizedAnalyticsController();