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
        onlineUsers,
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
        
        // Total revenue (only delivered orders)
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: OrderStatus.DELIVERED
          }
        }),
        
        // This month revenue (only delivered orders)
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            createdAt: { gte: startOfMonth },
            status: OrderStatus.DELIVERED
          }
        }),
        
        // Last month revenue (only delivered orders)
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            },
            status: OrderStatus.DELIVERED
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
        
        // Online users (using Redis activity tracking)
        (async () => {
          try {
            const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
            const now = new Date();
            
            // Get all users
            const users = await prisma.user.findMany({
              where: { isActive: true },
              select: { id: true }
            });
            
            let onlineCount = 0;
            
            // Check each user's activity in Redis
            for (const user of users) {
              const activityKey = `activity:agent:${user.id}`;
              const lastActivity = await redis.get(activityKey);
              
              if (lastActivity) {
                const lastActivityTime = new Date(lastActivity);
                const timeDiff = now.getTime() - lastActivityTime.getTime();
                
                if (timeDiff <= ACTIVITY_TIMEOUT) {
                  onlineCount++;
                }
              }
            }
            
            return onlineCount;
          } catch (error) {
            console.error('Error counting online users:', error);
            return 0;
          }
        })(),
        
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
          onlineUsers,
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

  /**
   * Get comprehensive sales and revenue reports
   */
  async getSalesReports(req: Request, res: Response) {
      try {
        const {
          startDate,
          endDate,
          storeId,
          agentId,
          status,
          wilaya,
          minRevenue,
          maxRevenue
        } = req.query;
  
        // Build where clause based on filters
        const whereClause: any = {};
        
        if (startDate && endDate) {
          whereClause.orderDate = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          };
        }
        
        if (storeId) whereClause.storeIdentifier = storeId;
        if (agentId) whereClause.assignedAgentId = agentId;
        if (status) whereClause.status = status;
        if (wilaya) whereClause.customer = { wilaya: wilaya };
        
        if (minRevenue || maxRevenue) {
          whereClause.total = {};
          if (minRevenue) whereClause.total.gte = parseFloat(minRevenue as string);
          if (maxRevenue) whereClause.total.lte = parseFloat(maxRevenue as string);
        }

        // Revenue where clause (only delivered orders)
        const revenueWhereClause: any = {
          ...whereClause,
          status: OrderStatus.DELIVERED
        };
  
        const [
          dailyRevenue,
          revenueByStore,
          revenueByStatus,
          topProducts,
          commissionData,
          monthlyComparison
        ] = await Promise.all([
          // Daily revenue breakdown (delivered orders only)
          prisma.order.findMany({
            where: revenueWhereClause,
            select: {
              orderDate: true,
              total: true,
              id: true
            },
            orderBy: { orderDate: 'asc' }
          }).then(orders => {
            // Group by date manually
            const dailyMap = new Map();
            orders.forEach(order => {
              const dateKey = order.orderDate.toISOString().split('T')[0];
              if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, { total: 0, count: 0, orderDate: order.orderDate });
              }
              const existing = dailyMap.get(dateKey);
              existing.total += order.total;
              existing.count += 1;
            });
            
            return Array.from(dailyMap.values()).map(item => ({
              orderDate: new Date(item.orderDate),
              _sum: { total: item.total },
              _count: { id: item.count }
            })).sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
          }),

          // Revenue by store (delivered orders only)
          prisma.order.groupBy({
            by: ['storeIdentifier'],
            where: { ...revenueWhereClause, storeIdentifier: { not: null } },
            _sum: { total: true },
            _count: { id: true }
          }),
  
          // Revenue by status
          prisma.order.groupBy({
            by: ['status'],
            where: whereClause,
            _sum: { total: true },
            _count: { id: true }
          }),
  
          // Top products by revenue (delivered orders only)
          prisma.orderItem.groupBy({
            by: ['title'],
            where: {
              order: revenueWhereClause
            },
            _sum: { totalPrice: true, quantity: true },
            _count: { id: true },
            orderBy: { _sum: { totalPrice: 'desc' } },
            take: 10
          }),
  
          // Commission data (if available)
          prisma.order.findMany({
            where: { ...whereClause, assignedAgentId: { not: null } },
            select: {
              total: true,
              assignedAgent: {
                select: { name: true, agentCode: true }
              }
            }
          }),
  
          // Monthly comparison (delivered orders only)
          prisma.order.groupBy({
            by: ['orderDate'],
            where: {
              orderDate: {
                gte: new Date(new Date().getFullYear(), 0, 1), // Start of year
                lte: new Date()
              },
              status: OrderStatus.DELIVERED
            },
            _sum: { total: true },
            _count: { id: true }
          })
        ]);
  
        // Process monthly data
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const monthData = monthlyComparison.filter(item =>
            new Date(item.orderDate).getMonth() + 1 === month
          );
          
          return {
            month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' }),
            revenue: monthData.reduce((sum, item) => sum + (item._sum.total || 0), 0),
            orders: monthData.reduce((sum, item) => sum + item._count.id, 0)
          };
        });
  
        const salesReport = {
          summary: {
            totalRevenue: dailyRevenue.reduce((sum, item) => sum + (item._sum.total || 0), 0),
            totalOrders: dailyRevenue.reduce((sum, item) => sum + item._count.id, 0),
            averageOrderValue: dailyRevenue.length > 0
              ? dailyRevenue.reduce((sum, item) => sum + (item._sum.total || 0), 0) /
                dailyRevenue.reduce((sum, item) => sum + item._count.id, 0)
              : 0
          },
          dailyRevenue: dailyRevenue.map(item => ({
            date: item.orderDate.toISOString().split('T')[0],
            revenue: item._sum.total || 0,
            orders: item._count.id
          })),
          revenueByStore: revenueByStore.map(item => ({
            store: item.storeIdentifier,
            revenue: item._sum.total || 0,
            orders: item._count.id
          })),
          revenueByStatus: revenueByStatus.map(item => ({
            status: item.status,
            revenue: item._sum.total || 0,
            orders: item._count.id
          })),
          topProducts: topProducts.map(item => ({
            product: item.title,
            revenue: item._sum.totalPrice || 0,
            quantity: item._sum.quantity || 0,
            orders: item._count.id
          })),
          monthlyComparison: monthlyData
        };
  
        res.json({
          success: true,
          data: salesReport
        });
      } catch (error) {
        console.error('Sales reports error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to fetch sales reports',
            code: 'SALES_REPORTS_ERROR',
            statusCode: 500
          }
        });
      }
    }
  
    /**
     * Get detailed agent performance reports
     */
    async getDetailedAgentReports(req: Request, res: Response) {
      try {
        const {
          startDate,
          endDate,
          agentId,
          storeId
        } = req.query;
  
        const whereClause: any = {
          assignedAgentId: { not: null }
        };
        
        if (startDate && endDate) {
          whereClause.orderDate = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          };
        }
        
        if (agentId) whereClause.assignedAgentId = agentId;
        if (storeId) whereClause.storeIdentifier = storeId;
  
        const [
          agentPerformance,
          agentActivities,
          workloadDistribution,
          successRates
        ] = await Promise.all([
          // Agent performance metrics
          prisma.user.findMany({
            where: {
              role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER] },
              isActive: true,
              ...(agentId ? { id: agentId as string } : {})
            },
            select: {
              id: true,
              name: true,
              agentCode: true,
              availability: true,
              currentOrders: true,
              maxOrders: true,
              assignedOrders: {
                where: {
                  ...whereClause,
                  assignedAgentId: { not: null }
                },
                select: {
                  id: true,
                  total: true,
                  status: true,
                  orderDate: true,
                  storeIdentifier: true
                }
              },
              _count: {
                select: {
                  assignedOrders: {
                    where: {
                      ...whereClause,
                      assignedAgentId: { not: null }
                    }
                  }
                }
              }
            }
          }),
  
          // Agent activities
          prisma.agentActivity.groupBy({
            by: ['agentId', 'activityType'],
            where: {
              ...(startDate && endDate ? {
                createdAt: {
                  gte: new Date(startDate as string),
                  lte: new Date(endDate as string)
                }
              } : {}),
              ...(agentId ? { agentId: agentId as string } : {})
            },
            _count: { id: true },
            _sum: { duration: true }
          }),
  
          // Workload distribution
          prisma.user.findMany({
            where: {
              role: { in: [UserRole.AGENT_SUIVI, UserRole.AGENT_CALL_CENTER] },
              isActive: true
            },
            select: {
              id: true,
              name: true,
              currentOrders: true,
              maxOrders: true,
              _count: {
                select: {
                  assignedOrders: {
                    where: {
                      status: { in: [OrderStatus.ASSIGNED, OrderStatus.IN_PROGRESS] }
                    }
                  }
                }
              }
            }
          }),
  
          // Success rates by agent
          prisma.order.groupBy({
            by: ['assignedAgentId', 'status'],
            where: whereClause,
            _count: { id: true }
          })
        ]);
  
        // Process agent performance data
        const processedAgentData = agentPerformance.map(agent => {
          const orders = agent.assignedOrders;
          const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
          const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
          const cancelledOrders = orders.filter(o => o.status === OrderStatus.CANCELLED).length;
          
          const successRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;
          const cancellationRate = orders.length > 0 ? (cancelledOrders / orders.length) * 100 : 0;
          
          // Get activities for this agent
          const agentActivitiesData = agentActivities.filter(a => a.agentId === agent.id);
          const totalActivities = agentActivitiesData.reduce((sum, a) => sum + a._count.id, 0);
          const totalDuration = agentActivitiesData.reduce((sum, a) => sum + (a._sum.duration || 0), 0);
  
          return {
            id: agent.id,
            name: agent.name,
            agentCode: agent.agentCode,
            availability: agent.availability,
            currentOrders: agent.currentOrders,
            maxOrders: agent.maxOrders,
            utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
            totalOrders: orders.length,
            completedOrders,
            cancelledOrders,
            totalRevenue,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            successRate,
            cancellationRate,
            totalActivities,
            totalWorkingHours: Math.round(totalDuration / 60), // Convert minutes to hours
            ordersPerDay: orders.length > 0 ? orders.length / 30 : 0 // Assuming 30-day period
          };
        });
  
        const agentReport = {
          summary: {
            totalAgents: agentPerformance.length,
            activeAgents: agentPerformance.filter(a => a.availability !== AgentAvailability.OFFLINE).length,
            averageUtilization: processedAgentData.reduce((sum, a) => sum + a.utilization, 0) / processedAgentData.length,
            totalOrders: processedAgentData.reduce((sum, a) => sum + a.totalOrders, 0),
            totalRevenue: processedAgentData.reduce((sum, a) => sum + a.totalRevenue, 0)
          },
          agentPerformance: processedAgentData,
          workloadDistribution: workloadDistribution.map(agent => ({
            id: agent.id,
            name: agent.name,
            currentOrders: agent.currentOrders,
            maxOrders: agent.maxOrders,
            utilization: agent.maxOrders > 0 ? (agent.currentOrders / agent.maxOrders) * 100 : 0,
            activeOrders: agent._count.assignedOrders
          })),
          activityBreakdown: agentActivities.map(activity => ({
            agentId: activity.agentId,
            activityType: activity.activityType,
            count: activity._count.id,
            totalDuration: activity._sum.duration || 0
          }))
        };
  
        res.json({
          success: true,
          data: agentReport
        });
      } catch (error) {
        console.error('Agent reports error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to fetch agent reports',
            code: 'AGENT_REPORTS_ERROR',
            statusCode: 500
          }
        });
    }
  }

  /**
   * Get geographic analytics (orders by city/wilaya)
   */
  async getGeographicReports(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        storeId,
        status,
        wilaya,
        agentId
      } = req.query;

      // Build where clause based on filters
      const whereClause: any = {};
      
      if (startDate && endDate) {
        whereClause.orderDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (storeId) whereClause.storeIdentifier = storeId;
      if (status) whereClause.status = status;
      if (agentId) whereClause.assignedAgentId = agentId;

      // Build revenue where clause (only delivered orders)
      const revenueWhereClause: any = {
        ...whereClause,
        status: OrderStatus.DELIVERED
      };

      const [
        ordersByWilaya,
        ordersByCommune,
        revenueByWilaya,
        topCities
      ] = await Promise.all([
        // Orders by wilaya
        prisma.order.groupBy({
          by: ['customerId'],
          where: whereClause,
          _count: { id: true }
        }).then(async (orderResults) => {
          // Get revenue data separately (only delivered orders)
          const revenueResults = await prisma.order.groupBy({
            by: ['customerId'],
            where: revenueWhereClause,
            _sum: { total: true }
          });

          // Create revenue map
          const revenueMap = new Map();
          for (const result of revenueResults) {
            revenueMap.set(result.customerId, result._sum.total || 0);
          }

          // Group by wilaya from customer data
          const wilayaMap = new Map();
          await Promise.all(orderResults.map(async (result) => {
            const customer = await prisma.customer.findUnique({
              where: { id: result.customerId },
              select: { wilaya: true }
            });
            if (customer && result._count && (!wilaya || customer.wilaya === wilaya)) {
              const existing = wilayaMap.get(customer.wilaya) || { orders: 0, revenue: 0 };
              wilayaMap.set(customer.wilaya, {
                orders: existing.orders + (result._count.id || 0),
                revenue: existing.revenue + (revenueMap.get(result.customerId) || 0)
              });
            }
          }));

          return Array.from(wilayaMap.entries()).map(([wilaya, data]) => ({
            wilaya,
            orders: data.orders,
            revenue: data.revenue
          }));
        }),

        // Orders by commune
        prisma.order.groupBy({
          by: ['customerId'],
          where: whereClause,
          _count: { id: true }
        }).then(async (orderResults) => {
          // Get revenue data separately (only delivered orders)
          const revenueResults = await prisma.order.groupBy({
            by: ['customerId'],
            where: revenueWhereClause,
            _sum: { total: true }
          });

          // Create revenue map
          const revenueMap = new Map();
          for (const result of revenueResults) {
            revenueMap.set(result.customerId, result._sum.total || 0);
          }

          const communeMap = new Map();
          await Promise.all(orderResults.map(async (result) => {
            const customer = await prisma.customer.findUnique({
              where: { id: result.customerId },
              select: { commune: true, wilaya: true }
            });
            if (customer && result._count && (!wilaya || customer.wilaya === wilaya)) {
              const key = `${customer.commune}, ${customer.wilaya}`;
              const existing = communeMap.get(key) || { orders: 0, revenue: 0 };
              communeMap.set(key, {
                orders: existing.orders + (result._count.id || 0),
                revenue: existing.revenue + (revenueMap.get(result.customerId) || 0)
              });
            }
          }));

          return Array.from(communeMap.entries()).map(([location, data]) => ({
            location,
            orders: data.orders,
            revenue: data.revenue
          })).sort((a, b) => b.orders - a.orders).slice(0, 20);
        }),

        // Revenue by wilaya (delivered orders only)
        prisma.order.groupBy({
          by: ['customerId'],
          where: revenueWhereClause,
          _sum: { total: true }
        }).then(results => {
          const wilayaRevenueMap = new Map();
          return Promise.all(results.map(async (result) => {
            const customer = await prisma.customer.findUnique({
              where: { id: result.customerId },
              select: { wilaya: true }
            });
            if (customer && result._sum) {
              const existing = wilayaRevenueMap.get(customer.wilaya) || 0;
              wilayaRevenueMap.set(customer.wilaya, existing + (result._sum.total || 0));
            }
            return null;
          })).then(() => {
            return Array.from(wilayaRevenueMap.entries()).map(([wilaya, revenue]) => ({
              wilaya,
              revenue
            })).sort((a, b) => b.revenue - a.revenue);
          });
        }),

        // Top performing cities
        prisma.customer.groupBy({
          by: ['wilaya', 'commune'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        })
      ]);

      // Calculate totals for summary
      const totalOrders = ordersByWilaya.reduce((sum, item) => sum + item.orders, 0);
      const totalRevenue = ordersByWilaya.reduce((sum, item) => sum + item.revenue, 0);
      const totalDeliveredOrders = await prisma.order.count({
        where: revenueWhereClause
      });

      const geographicReport = {
        summary: {
          totalWilayas: ordersByWilaya.length,
          totalCities: ordersByCommune.length,
          topWilaya: ordersByWilaya.sort((a, b) => b.orders - a.orders)[0]?.wilaya || null,
          topCity: ordersByCommune[0]?.location || null,
          totalOrders,
          totalRevenue,
          totalDeliveredOrders,
          averageOrderValue: totalDeliveredOrders > 0 ? totalRevenue / totalDeliveredOrders : 0
        },
        ordersByWilaya: ordersByWilaya.sort((a, b) => b.orders - a.orders),
        ordersByCommune: ordersByCommune,
        revenueByWilaya: revenueByWilaya,
        topCities: topCities.map(city => ({
          city: `${city.commune}, ${city.wilaya}`,
          customers: city._count.id
        }))
      };

      res.json({
        success: true,
        data: geographicReport
      });
    } catch (error) {
      console.error('Geographic reports error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch geographic reports',
          code: 'GEOGRAPHIC_REPORTS_ERROR',
          statusCode: 500
        }
      });
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerReports(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        storeId,
        wilaya,
        agentId,
        status
      } = req.query;

      const whereClause: any = {};
      
      if (startDate && endDate) {
        whereClause.orderDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (storeId) whereClause.storeIdentifier = storeId;
      if (agentId) whereClause.assignedAgentId = agentId;
      if (status) whereClause.status = status;

      // Customer filter for wilaya
      const customerFilter: any = {};
      if (wilaya) customerFilter.wilaya = wilaya;

      const [
        customerStats,
        topCustomers,
        customerRetention,
        newVsReturning
      ] = await Promise.all([
        // Customer statistics (filtered)
        prisma.customer.aggregate({
          where: {
            ...customerFilter,
            orders: {
              some: whereClause
            }
          },
          _count: { id: true },
          _avg: { totalOrders: true }
        }),

        // Top customers by orders
        prisma.customer.findMany({
          where: customerFilter,
          orderBy: { totalOrders: 'desc' },
          take: 10,
          select: {
            id: true,
            fullName: true,
            telephone: true,
            wilaya: true,
            commune: true,
            totalOrders: true,
            orders: {
              where: {
                ...whereClause,
                status: OrderStatus.DELIVERED
              },
              select: {
                total: true
              }
            }
          }
        }),

        // Customer retention (customers with multiple orders in the filtered period)
        prisma.customer.count({
          where: {
            ...customerFilter,
            orders: {
              some: whereClause
            },
            totalOrders: { gt: 1 }
          }
        }),

        // New vs returning customers in period
        Promise.all([
          // New customers (first order in period)
          prisma.customer.count({
            where: {
              ...customerFilter,
              orders: {
                some: {
                  ...whereClause,
                  customer: {
                    orders: {
                      none: {
                        orderDate: {
                          lt: startDate ? new Date(startDate as string) : new Date('1900-01-01')
                        }
                      }
                    }
                  }
                }
              }
            }
          }),
          // Returning customers
          prisma.customer.count({
            where: {
              ...customerFilter,
              orders: {
                some: {
                  ...whereClause,
                  customer: {
                    orders: {
                      some: {
                        orderDate: {
                          lt: startDate ? new Date(startDate as string) : new Date('1900-01-01')
                        }
                      }
                    }
                  }
                }
              }
            }
          })
        ])
      ]);

      // Calculate total revenue from delivered orders in the period
      const totalRevenue = await prisma.order.aggregate({
        where: {
          ...whereClause,
          status: OrderStatus.DELIVERED,
          ...(wilaya && {
            customer: { wilaya: wilaya }
          })
        },
        _sum: { total: true },
        _count: { id: true }
      });

      const customerReport = {
        summary: {
          totalCustomers: customerStats._count.id,
          averageOrdersPerCustomer: customerStats._avg.totalOrders || 0,
          retentionRate: customerStats._count.id > 0 ? (customerRetention / customerStats._count.id) * 100 : 0,
          newCustomers: newVsReturning[0],
          returningCustomers: newVsReturning[1],
          totalRevenue: totalRevenue._sum.total || 0,
          totalDeliveredOrders: totalRevenue._count.id || 0,
          averageOrderValue: (totalRevenue._count.id || 0) > 0 ? (totalRevenue._sum.total || 0) / (totalRevenue._count.id || 0) : 0
        },
        topCustomers: topCustomers.map(customer => ({
          id: customer.id,
          name: customer.fullName,
          phone: customer.telephone,
          location: `${customer.commune}, ${customer.wilaya}`,
          totalOrders: customer.totalOrders,
          totalRevenue: customer.orders.reduce((sum, order) => sum + order.total, 0)
        })),
        customerRetention: {
          oneTimeCustomers: customerStats._count.id - customerRetention,
          repeatCustomers: customerRetention,
          retentionRate: customerStats._count.id > 0 ? (customerRetention / customerStats._count.id) * 100 : 0
        },
        newVsReturning: {
          newCustomers: newVsReturning[0],
          returningCustomers: newVsReturning[1],
          total: newVsReturning[0] + newVsReturning[1]
        }
      };

      res.json({
        success: true,
        data: customerReport
      });
    } catch (error) {
      console.error('Customer reports error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch customer reports',
          code: 'CUSTOMER_REPORTS_ERROR',
          statusCode: 500
        }
      });
    }
  }
}