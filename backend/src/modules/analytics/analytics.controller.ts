import { Request, Response } from 'express';
import { PrismaClient, UserRole, AgentAvailability, OrderStatus } from '@prisma/client';
import redis from '@/config/redis';
import prisma from '@/config/database';

export class AnalyticsController {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const cacheKey = 'dashboard:stats';
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }

      // Get current date ranges
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Parallel queries for better performance
      const [
        totalOrders,
        totalOrdersLastMonth,
        todayOrders,
        weekOrders,
        monthOrders,
        totalRevenue,
        monthRevenue,
        lastMonthRevenue,
        activeAgents,
        totalAgents,
        ordersByStatus,
        ordersByStore,
        recentOrders,
        topAgents,
        storePerformance
      ] = await Promise.all([
        // Total orders
        prisma.order.count(),
        
        // Last month orders for comparison
        prisma.order.count({
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        }),
        
        // Today's orders
        prisma.order.count({
          where: {
            createdAt: { gte: startOfDay }
          }
        }),
        
        // This week's orders
        prisma.order.count({
          where: {
            createdAt: { gte: startOfWeek }
          }
        }),
        
        // This month's orders
        prisma.order.count({
          where: {
            createdAt: { gte: startOfMonth }
          }
        }),
        
        // Total revenue
        prisma.order.aggregate({
          _sum: { total: true }
        }),
        
        // This month revenue
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            createdAt: { gte: startOfMonth }
          }
        }),
        
        // Last month revenue
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        }),
        
        // Active agents (online or busy)
        prisma.user.count({
          where: {
            role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER, UserRole.TEAM_MANAGER] },
            availability: { in: [AgentAvailability.ONLINE, AgentAvailability.BUSY] },
            isActive: true
          }
        }),
        
        // Total agents
        prisma.user.count({
          where: {
            role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER, UserRole.TEAM_MANAGER] },
            isActive: true
          }
        }),
        
        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        
        // Orders by store
        prisma.order.groupBy({
          by: ['storeIdentifier'],
          _count: { storeIdentifier: true },
          _sum: { total: true },
          where: {
            storeIdentifier: { not: null }
          }
        }),
        
        // Recent orders
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            assignedAgent: {
              select: { name: true, agentCode: true }
            }
          }
        }),
        
        // Top performing agents
        prisma.user.findMany({
          where: {
            role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER] },
            isActive: true
          },
          select: {
            id: true,
            name: true,
            agentCode: true,
            currentOrders: true,
            maxOrders: true,
            availability: true,
            _count: {
              select: {
                assignedOrders: {
                  where: {
                    createdAt: { gte: startOfMonth }
                  }
                }
              }
            }
          },
          orderBy: {
            assignedOrders: {
              _count: 'desc'
            }
          },
          take: 10
        }),
        
        // Store performance
        prisma.apiConfiguration.findMany({
          select: {
            storeIdentifier: true,
            storeName: true,
            isActive: true
          }
        })
      ]);

      // Calculate growth percentages
      const orderGrowth = totalOrdersLastMonth > 0 
        ? ((totalOrders - totalOrdersLastMonth) / totalOrdersLastMonth * 100).toFixed(1)
        : '0';
      
      const revenueGrowth = lastMonthRevenue._sum.total && lastMonthRevenue._sum.total > 0
        ? (((monthRevenue._sum.total || 0) - lastMonthRevenue._sum.total) / lastMonthRevenue._sum.total * 100).toFixed(1)
        : '0';

      // Format response data
      const stats = {
        overview: {
          totalOrders,
          orderGrowth: `${orderGrowth}%`,
          todayOrders,
          weekOrders,
          monthOrders,
          totalRevenue: totalRevenue._sum.total || 0,
          monthRevenue: monthRevenue._sum.total || 0,
          revenueGrowth: `${revenueGrowth}%`,
          activeAgents,
          totalAgents,
          agentUtilization: totalAgents > 0 ? ((activeAgents / totalAgents) * 100).toFixed(1) : '0'
        },
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        storePerformance: ordersByStore.map(item => ({
          store: item.storeIdentifier,
          orders: item._count.storeIdentifier,
          revenue: item._sum.total || 0
        })),
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          reference: order.reference,
          customer: order.customer.fullName,
          total: order.total,
          status: order.status,
          store: order.storeIdentifier,
          agent: order.assignedAgent?.name || null,
          createdAt: order.createdAt
        })),
        topAgents: topAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          agentCode: agent.agentCode,
          currentOrders: agent.currentOrders,
          maxOrders: agent.maxOrders,
          monthlyOrders: agent._count.assignedOrders,
          availability: agent.availability,
          utilization: agent.maxOrders > 0 ? ((agent.currentOrders / agent.maxOrders) * 100).toFixed(1) : '0'
        })),
        stores: storePerformance.map(store => ({
          identifier: store.storeIdentifier,
          name: store.storeName,
          isActive: store.isActive,
          orders: ordersByStore.find(s => s.storeIdentifier === store.storeIdentifier)?._count.storeIdentifier || 0,
          revenue: ordersByStore.find(s => s.storeIdentifier === store.storeIdentifier)?._sum.total || 0
        }))
      };

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(stats));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch dashboard statistics',
          code: 'DASHBOARD_STATS_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get order trends for charts
   */
  async getOrderTrends(req: Request, res: Response) {
    try {
      const { period = '7d' } = req.query;
      
      let days = 7;
      if (period === '30d') days = 30;
      if (period === '90d') days = 90;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all orders in the date range
      const orders = await prisma.order.findMany({
        where: {
          orderDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          orderDate: true,
          total: true
        },
        orderBy: {
          orderDate: 'asc'
        }
      });

      // Create a map to aggregate orders by date
      const dateMap = new Map<string, { orders: number; revenue: number }>();
      
      // Initialize all dates in the range with zero values
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dateMap.set(dateKey, { orders: 0, revenue: 0 });
      }
      
      // Aggregate actual order data
      orders.forEach(order => {
        const dateKey = order.orderDate.toISOString().split('T')[0];
        const existing = dateMap.get(dateKey) || { orders: 0, revenue: 0 };
        dateMap.set(dateKey, {
          orders: existing.orders + 1,
          revenue: existing.revenue + order.total
        });
      });

      // Convert map to array and sort by date
      const formattedTrends = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          orders: data.orders,
          revenue: data.revenue
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({
        success: true,
        data: formattedTrends
      });
    } catch (error) {
      console.error('Order trends error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch order trends',
          code: 'ORDER_TRENDS_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;
      
      let days = 30;
      if (period === '7d') days = 7;
      if (period === '90d') days = 90;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const agentStats = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          agentCode: true,
          availability: true,
          currentOrders: true,
          maxOrders: true,
          _count: {
            select: {
              assignedOrders: {
                where: {
                  createdAt: { gte: startDate }
                }
              },
              agentActivities: {
                where: {
                  createdAt: { gte: startDate }
                }
              }
            }
          },
          assignedOrders: {
            where: {
              createdAt: { gte: startDate },
              status: { in: [OrderStatus.CONFIRMED, OrderStatus.DELIVERED] }
            },
            select: {
              total: true,
              status: true
            }
          }
        }
      });

      const performance = agentStats.map(agent => {
        const completedOrders = agent.assignedOrders.filter(o => o.status === OrderStatus.DELIVERED).length;
        const totalRevenue = agent.assignedOrders.reduce((sum, order) => sum + order.total, 0);
        const successRate = agent._count.assignedOrders > 0 
          ? ((completedOrders / agent._count.assignedOrders) * 100).toFixed(1)
          : '0';

        return {
          id: agent.id,
          name: agent.name,
          agentCode: agent.agentCode,
          availability: agent.availability,
          currentOrders: agent.currentOrders,
          maxOrders: agent.maxOrders,
          totalOrders: agent._count.assignedOrders,
          completedOrders,
          totalRevenue,
          successRate: `${successRate}%`,
          activities: agent._count.agentActivities,
          utilization: agent.maxOrders > 0 ? ((agent.currentOrders / agent.maxOrders) * 100).toFixed(1) : '0'
        };
      });

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Agent performance error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch agent performance',
          code: 'AGENT_PERFORMANCE_ERROR',
          statusCode: 500
        }
      });
    }
  }
}