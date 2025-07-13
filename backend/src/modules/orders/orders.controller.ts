import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '@/services/ecomanager.service';
import { getMaystroService } from '@/services/maystro.service';
import { productAssignmentService } from '@/services/product-assignment.service';
import { deliveryDelayService } from '@/services/delivery-delay.service';

import { prisma } from '../../config/database';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class OrdersController {
  /**
   * Get unique shipping statuses from database
   */
  async getShippingStatuses(req: Request, res: Response) {
    try {
      const shippingStatuses = await prisma.order.findMany({
        select: {
          shippingStatus: true
        },
        where: {
          AND: [
            { shippingStatus: { not: null } },
            { shippingStatus: { not: '' } }
          ]
        },
        distinct: ['shippingStatus'],
        orderBy: {
          shippingStatus: 'asc'
        }
      });

      const uniqueStatuses = shippingStatuses
        .map(order => order.shippingStatus)
        .filter(status => status && status.trim().length > 0)
        .sort();

      res.json({
        success: true,
        data: {
          shippingStatuses: uniqueStatuses
        }
      });
    } catch (error) {
      console.error('❌ Error fetching shipping statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shipping statuses'
      });
    }
  }

  /**
   * Get all orders with pagination and filtering
   */
  async getOrders(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 25,
        status,
        shippingStatus,
        storeIdentifier,
        assignedAgentId,
        search,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        excludeStatus,
        noteTypes,
        hasAgentNotes
      } = req.query;

      // 🚀 PERFORMANCE: Cache frequently accessed queries
      const cacheKey = `orders:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`;
      const cachedResult = await redis.get(cacheKey);
      
      if (cachedResult && !search) { // Don't cache search results as they change frequently
        return res.json(JSON.parse(cachedResult));
      }

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100); // Cap at 100 for performance
      const skip = (pageNum - 1) * limitNum;

      // 🚀 PERFORMANCE: Build optimized where clause
      const where: any = {};

      // Handle multi-select status filter
      if (status) {
        if (typeof status === 'string' && status.includes(',')) {
          // Multi-select: status is comma-separated
          const statusArray = status.split(',').filter(s => s.trim());
          where.status = {
            in: statusArray
          };
        } else {
          // Single status
          where.status = status;
        }
      }

      // Handle multi-select shipping status filter
      if (shippingStatus) {
        if (typeof shippingStatus === 'string' && shippingStatus.includes(',')) {
          // Multi-select: shippingStatus is comma-separated
          const shippingStatusArray = shippingStatus.split(',').filter(s => s.trim());
          where.shippingStatus = {
            in: shippingStatusArray
          };
        } else {
          // Single shipping status
          where.shippingStatus = shippingStatus;
        }
      }

      if (storeIdentifier) {
        where.storeIdentifier = storeIdentifier;
      }

      if (assignedAgentId) {
        where.assignedAgentId = assignedAgentId;
      }

      // Handle excludeStatus filter (for hiding delivered orders)
      if (excludeStatus) {
        where.status = {
          not: excludeStatus
        };
      }

      // Handle note types filter (improved multi-select)
      if (noteTypes) {
        const noteTypeArray = (noteTypes as string).split(',').filter(nt => nt.trim());
        if (noteTypeArray.length > 0) {
          where.AND = [
            ...(where.AND || []),
            {
              OR: noteTypeArray.map(noteType => ({
                OR: [
                  { notes: { contains: noteType.trim() } },
                  { internalNotes: { contains: noteType.trim() } }
                ]
              }))
            }
          ];
        }
      }

      // Handle hasAgentNotes filter (show only orders with agent-entered notes)
      if (hasAgentNotes === 'true') {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              {
                AND: [
                  { notes: { not: null } },
                  { notes: { not: '' } },
                  { notes: { not: { contains: 'Last confirmation: Confirmation échouée 1' } } }
                ]
              },
              {
                AND: [
                  { internalNotes: { not: null } },
                  { internalNotes: { not: '' } }
                ]
              }
            ]
          }
        ];
      }

      // Apply product-based filtering for non-admin users
      const user = req.user;
      if (user && user.role !== 'ADMIN') {
        // 🚨 CRITICAL FIX: Product assignments should ONLY be used for NEW order assignments
        // When viewing existing assigned orders (assignedAgentId is specified),
        // agents should see ALL their assigned orders regardless of product assignments
        
        if (!assignedAgentId) {
          // Only apply product filtering when browsing unassigned orders (no assignedAgentId filter)
          // 🚀 PERFORMANCE: Cache user product assignments for 5 minutes
          const cacheKey = `user_products:${user.id}`;
          let userAssignedProducts = await redis.get(cacheKey);
          
          if (!userAssignedProducts) {
            const products = await productAssignmentService.getUserAssignedProducts(user.id);
            userAssignedProducts = JSON.stringify(products);
            await redis.setex(cacheKey, 300, userAssignedProducts); // Cache for 5 minutes
          }
          
          const products = JSON.parse(userAssignedProducts);
          
          if (products.length > 0) {
            // Filter orders that contain at least one product assigned to the user
            where.items = {
              some: {
                title: {
                  in: products
                }
              }
            };
          } else {
            // If user has no product assignments, show no orders when browsing
            where.id = 'non-existent-id'; // This will return no results
          }
        }
        // 🔥 WHEN assignedAgentId IS SPECIFIED: NO PRODUCT FILTERING
        // The agent must see ALL orders assigned to them, period!
        console.log(`🔍 Orders API - User: ${user.id}, Role: ${user.role}, AssignedAgentId: ${assignedAgentId}, ProductFilteringApplied: ${!assignedAgentId}`);
      }

      if (search) {
        where.OR = [
          { reference: { contains: search as string, mode: 'insensitive' } },
          { ecoManagerId: { contains: search as string, mode: 'insensitive' } },
          { trackingNumber: { contains: search as string, mode: 'insensitive' } },
          { maystroOrderId: { contains: search as string, mode: 'insensitive' } },
          { customer: {
              OR: [
                { fullName: { contains: search as string, mode: 'insensitive' } },
                { telephone: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
                { wilaya: { contains: search as string, mode: 'insensitive' } },
                { commune: { contains: search as string, mode: 'insensitive' } }
              ]
            }
          },
          { items: {
              some: {
                OR: [
                  { title: { contains: search as string, mode: 'insensitive' } },
                  { sku: { contains: search as string, mode: 'insensitive' } },
                  { productId: { contains: search as string, mode: 'insensitive' } }
                ]
              }
            }
          }
        ];
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      // 🚀 OPTIMIZED QUERY: Reduce data transfer and improve performance
      const includeDetails = req.query.includeDetails !== 'false'; // Default true for backward compatibility
      
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          select: {
            id: true,
            reference: true,
            ecoManagerId: true,
            status: true,
            shippingStatus: true,
            total: true,
            createdAt: true,
            updatedAt: true,
            trackingNumber: true,
            maystroOrderId: true,
            assignedAgentId: true,
            storeIdentifier: true,
            notes: true,
            internalNotes: true,
            // Conditional includes based on request
            customer: includeDetails ? {
              select: {
                id: true,
                fullName: true,
                telephone: true,
                wilaya: true,
                commune: true
              }
            } : false,
            assignedAgent: includeDetails ? {
              select: {
                id: true,
                name: true,
                agentCode: true
              }
            } : false,
            items: includeDetails ? {
              select: {
                id: true,
                title: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                sku: true,
                productId: true
              }
            } : false,
            _count: {
              select: {
                items: true,
                tickets: true
              }
            }
          },
          orderBy: {
            [sortBy as string]: sortOrder
          },
          skip,
          take: limitNum
        }),
        prisma.order.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      // 🚀 PERFORMANCE: Make delay calculation optional and cached
      const includeDelay = req.query.includeDelay === 'true';
      let ordersWithDelay = orders;
      
      if (includeDelay && includeDetails) {
        // Only calculate delays when explicitly requested and we have customer data
        const cacheKey = `order_delays:${JSON.stringify(orders.map(o => o.id))}`;
        let cachedDelays = await redis.get(cacheKey);
        
        if (!cachedDelays) {
          // Transform orders to match the expected interface for delay service
          const ordersForDelay = orders.map(order => ({
            id: order.id,
            orderDate: order.createdAt,
            shippingStatus: order.shippingStatus,
            customer: order.customer || { wilaya: '' }
          }));
          
          const delayMap = await deliveryDelayService.calculateOrdersDelay(ordersForDelay);
          cachedDelays = JSON.stringify(Array.from(delayMap.entries()));
          await redis.setex(cacheKey, 180, cachedDelays); // Cache for 3 minutes
        }
        
        const delayEntries = JSON.parse(cachedDelays);
        const delayMap = new Map(delayEntries);
        
        ordersWithDelay = orders.map(order => ({
          ...order,
          delayInfo: delayMap.get(order.id) || null
        }));
      }

      const response = {
        success: true,
        data: {
          orders: ordersWithDelay,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            limit: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        }
      };

      // 🚀 PERFORMANCE: Cache the response for 60 seconds (non-search queries only)
      if (!search && totalCount < 1000) { // Only cache smaller result sets
        await redis.setex(cacheKey, 60, JSON.stringify(response));
      }

      res.json(response);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch orders'
        }
      });
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: true,
          assignedAgent: {
            select: {
              id: true,
              name: true,
              agentCode: true,
              email: true
            }
          },
          items: true,
          activities: {
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
          },
          notifications: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Order not found'
          }
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch order'
        }
      });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes, noteType, customNote } = req.body;
      const userId = (req as any).user?.id;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Status is required'
          }
        });
      }

      const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid status'
          }
        });
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: { assignedAgent: true }
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Order not found'
          }
        });
      }

      // Prepare structured notes
      let structuredNotes = null;
      if (notes || noteType || customNote) {
        // Get existing notes or initialize empty array
        let existingNotes = [];
        if (existingOrder.notes) {
          try {
            // Try to parse as JSON (new format)
            existingNotes = JSON.parse(existingOrder.notes);
            // Ensure it's an array
            if (!Array.isArray(existingNotes)) {
              existingNotes = [];
            }
          } catch (e) {
            // If parsing fails, it's legacy text format - start fresh with empty array
            // Legacy notes will not be migrated to maintain clean agent-only history
            existingNotes = [];
          }
        }
        
        // Create new note entry
        const newNote = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          agentId: userId,
          agentName: (req as any).user?.name || 'Unknown Agent',
          type: noteType || 'CUSTOM',
          note: notes || customNote || '',
          statusChange: {
            from: existingOrder.status,
            to: status
          }
        };
        
        // Add new note to existing notes
        existingNotes.push(newNote);
        structuredNotes = JSON.stringify(existingNotes);
      }

      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          ...(structuredNotes && { notes: structuredNotes }),
          ...(notes && { internalNotes: notes }), // Keep backward compatibility
          updatedAt: new Date()
        },
        include: {
          customer: true,
          assignedAgent: true,
          items: true
        }
      });

      // Create activity logs
      if (userId) {
        // Create status change activity
        await prisma.agentActivity.create({
          data: {
            agentId: userId,
            orderId: id,
            activityType: 'STATUS_CHANGED',
            description: `Order status changed from ${existingOrder.status} to ${status}`
          }
        });

        // Create notes activity if notes were added
        if (notes || noteType || customNote) {
          const noteContent = notes || customNote || '';
          await prisma.agentActivity.create({
            data: {
              agentId: userId,
              orderId: id,
              activityType: 'NOTES_ADDED',
              description: noteContent,
              duration: null // Can be calculated later if needed
            }
          });
        }
      }

      // Create notification for assigned agent if different from current user
      if (existingOrder.assignedAgentId && existingOrder.assignedAgentId !== userId) {
        await prisma.notification.create({
          data: {
            userId: existingOrder.assignedAgentId,
            orderId: id,
            type: 'ORDER_UPDATE',
            title: 'Order Status Updated',
            message: `Order ${existingOrder.reference} status changed to ${status}`
          }
        });
      }

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update order status'
        }
      });
    }
  }

  /**
   * Assign agent to order
   */
  async assignAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      const userId = (req as any).user?.id;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Agent ID is required'
          }
        });
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Order not found'
          }
        });
      }

      // Check if agent exists and is active
      const agent = await prisma.user.findUnique({
        where: { id: agentId }
      });

      if (!agent || !agent.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid or inactive agent'
          }
        });
      }

      // Update order assignment
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          assignedAgentId: agentId,
          assignedAt: new Date(),
          status: existingOrder.status === 'PENDING' ? 'ASSIGNED' : existingOrder.status
        },
        include: {
          customer: true,
          assignedAgent: true,
          items: true
        }
      });

      // Update agent's current orders count
      await prisma.user.update({
        where: { id: agentId },
        data: {
          currentOrders: {
            increment: 1
          }
        }
      });

      // Decrement previous agent's count if there was one
      if (existingOrder.assignedAgentId && existingOrder.assignedAgentId !== agentId) {
        await prisma.user.update({
          where: { id: existingOrder.assignedAgentId },
          data: {
            currentOrders: {
              decrement: 1
            }
          }
        });
      }

      // Create activity log
      if (userId) {
        await prisma.agentActivity.create({
          data: {
            agentId: userId,
            orderId: id,
            activityType: 'ORDER_ASSIGNED',
            description: `Order assigned to ${agent.name} (${agent.agentCode})`
          }
        });
      }

      // ORDER_ASSIGNMENT notifications disabled per user request
      console.log(`📋 Admin order assignment notification disabled for order ${existingOrder.reference} assigned to agent ${agentId}`);

      res.json({
        success: true,
        data: updatedOrder,
        message: 'Agent assigned successfully'
      });
    } catch (error) {
      console.error('Assign agent error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to assign agent'
        }
      });
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const { storeIdentifier, period = '7d' } = req.query;

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

      const whereClause: any = {
        createdAt: {
          gte: startDate
        }
      };

      if (storeIdentifier) {
        whereClause.storeIdentifier = storeIdentifier;
      }

      // Get statistics
      const [
        totalOrders,
        pendingOrders,
        assignedOrders,
        confirmedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        recentOrders
      ] = await Promise.all([
        prisma.order.count({ where: whereClause }),
        prisma.order.count({ where: { ...whereClause, status: 'PENDING' } }),
        prisma.order.count({ where: { ...whereClause, status: 'ASSIGNED' } }),
        prisma.order.count({ where: { ...whereClause, status: 'CONFIRMED' } }),
        prisma.order.count({ where: { ...whereClause, status: 'SHIPPED' } }),
        prisma.order.count({ where: { ...whereClause, status: 'DELIVERED' } }),
        prisma.order.count({ where: { ...whereClause, status: 'CANCELLED' } }),
        prisma.order.aggregate({
          where: { ...whereClause, status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
          _sum: { total: true }
        }),
        prisma.order.findMany({
          where: whereClause,
          include: {
            customer: {
              select: {
                fullName: true,
                telephone: true
              }
            },
            assignedAgent: {
              select: {
                name: true,
                agentCode: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })
      ]);

      const stats = {
        totalOrders,
        ordersByStatus: {
          pending: pendingOrders,
          assigned: assignedOrders,
          confirmed: confirmedOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        },
        totalRevenue: totalRevenue._sum.total || 0,
        recentOrders,
        period
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch dashboard statistics'
        }
      });
    }
  }

  /**
   * Sync orders from EcoManager
   */
  async syncOrders(req: Request, res: Response) {
    try {
      const { storeIdentifier, fullSync = false } = req.body;

      if (!storeIdentifier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Store identifier is required'
          }
        });
      }

      // Get API configuration for the store
      const apiConfig = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier }
      });

      if (!apiConfig || !apiConfig.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Store configuration not found or inactive'
          }
        });
      }

      // Initialize EcoManager service
      const ecoService = new EcoManagerService({
        storeName: apiConfig.storeName,
        storeIdentifier: apiConfig.storeIdentifier,
        apiToken: apiConfig.apiToken,
        baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, redis);

      // Test connection first
      const connectionTest = await ecoService.testConnection();
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Failed to connect to EcoManager API'
          }
        });
      }

      let syncedCount = 0;
      let ecoOrders: any[] = [];

      if (fullSync) {
        // Full sync - fetch all orders
        ecoOrders = await ecoService.fetchAllOrders();
      } else {
        // Incremental sync - fetch new orders only
        // Get the highest EcoManager ID by converting to integer for proper sorting
        const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
          SELECT "ecoManagerId"
          FROM "orders"
          WHERE "storeIdentifier" = ${storeIdentifier}
            AND "source" = 'ECOMANAGER'
            AND "ecoManagerId" IS NOT NULL
          ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
          LIMIT 1
        `;

        const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
        console.log(`Last synced EcoManager order ID: ${lastOrderId}`);
        
        ecoOrders = await ecoService.fetchNewOrders(lastOrderId);
      }

      console.log(`Processing ${ecoOrders.length} orders...`);

      // Process orders in smaller batches
      const batchSize = 10;
      for (let i = 0; i < ecoOrders.length; i += batchSize) {
        const batch = ecoOrders.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ecoOrders.length/batchSize)} (${batch.length} orders)`);
        
        for (const ecoOrder of batch) {
          try {
            // Check if order already exists
            const existingOrder = await prisma.order.findUnique({
              where: { ecoManagerId: ecoOrder.id.toString() }
            });

            if (!existingOrder) {
              // Create new order
              const orderData = ecoService.mapOrderToDatabase(ecoOrder);
              
              // Handle customer creation separately
              let customer = await prisma.customer.findFirst({
                where: { telephone: orderData.customerData.telephone }
              });

              if (!customer) {
                customer = await prisma.customer.create({
                  data: {
                    fullName: orderData.customerData.fullName,
                    telephone: orderData.customerData.telephone,
                    wilaya: orderData.customerData.wilaya,
                    commune: orderData.customerData.commune,
                    totalOrders: 1
                  }
                });
              } else {
                // Update total orders count
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: { totalOrders: { increment: 1 } }
                });
              }

              // Remove customerData and add customerId
              const { customerData, ...finalOrderData } = orderData;
              finalOrderData.customerId = customer.id;

              await prisma.order.create({
                data: finalOrderData
              });
              syncedCount++;
              
              if (syncedCount % 10 === 0) {
                console.log(`Synced ${syncedCount} orders so far...`);
              }
            }
          } catch (orderError) {
            console.error(`Error processing order ${ecoOrder.id}:`, orderError);
            // Continue with next order
          }
        }
      }

      // Update API configuration usage
      await prisma.apiConfiguration.update({
        where: { id: apiConfig.id },
        data: {
          requestCount: {
            increment: Math.ceil(ecoOrders.length / 100) // Approximate API calls made
          },
          lastUsed: new Date()
        }
      });

      // Save sync status
      if (ecoOrders.length > 0) {
        const lastOrderId = Math.max(...ecoOrders.map(o => o.id));
        await ecoService.saveSyncStatus(lastOrderId, syncedCount);
      }

      res.json({
        success: true,
        data: {
          syncedCount,
          totalFetched: ecoOrders.length,
          syncType: fullSync ? 'full' : 'incremental',
          storeIdentifier
        },
        message: `Successfully synced ${syncedCount} orders from EcoManager`
      });
    } catch (error) {
      console.error('Sync orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to sync orders from EcoManager'
        }
      });
    }
  }

  /**
   * Sync orders from all active stores
   */
  async syncAllStores(req: Request, res: Response) {
    try {
      const { fullSync = false } = req.body;

      // Get all active API configurations
      const activeConfigs = await prisma.apiConfiguration.findMany({
        where: { isActive: true }
      });

      if (activeConfigs.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No active store configurations found'
          }
        });
      }

      console.log(`Starting sync for ${activeConfigs.length} active stores...`);

      const results = [];
      let totalSyncedCount = 0;
      let totalFetchedCount = 0;

      // Process each store sequentially to avoid overwhelming the APIs
      for (const apiConfig of activeConfigs) {
        try {
          console.log(`\n🏪 Processing store: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);

          // Initialize EcoManager service for this store
          const ecoService = new EcoManagerService({
            storeName: apiConfig.storeName,
            storeIdentifier: apiConfig.storeIdentifier,
            apiToken: apiConfig.apiToken,
            baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
          }, redis);

          // Test connection first
          const connectionTest = await ecoService.testConnection();
          if (!connectionTest) {
            console.log(`❌ Failed to connect to ${apiConfig.storeName} API`);
            results.push({
              storeIdentifier: apiConfig.storeIdentifier,
              storeName: apiConfig.storeName,
              success: false,
              error: 'Failed to connect to EcoManager API',
              syncedCount: 0,
              totalFetched: 0
            });
            continue;
          }

          let syncedCount = 0;
          let ecoOrders: any[] = [];

          if (fullSync) {
            // Full sync - fetch all orders
            ecoOrders = await ecoService.fetchAllOrders();
          } else {
            // Incremental sync - fetch new orders only
            // Get the highest EcoManager ID by converting to integer for proper sorting
            const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
              SELECT "ecoManagerId"
              FROM "orders"
              WHERE "storeIdentifier" = ${apiConfig.storeIdentifier}
                AND "source" = 'ECOMANAGER'
                AND "ecoManagerId" IS NOT NULL
              ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
              LIMIT 1
            `;

            const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
            console.log(`Last synced EcoManager order ID for ${apiConfig.storeName}: ${lastOrderId}`);
            
            ecoOrders = await ecoService.fetchNewOrders(lastOrderId);
          }

          console.log(`Processing ${ecoOrders.length} orders for ${apiConfig.storeName}...`);

          // Process orders in smaller batches
          const batchSize = 10;
          for (let i = 0; i < ecoOrders.length; i += batchSize) {
            const batch = ecoOrders.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ecoOrders.length/batchSize)} for ${apiConfig.storeName} (${batch.length} orders)`);
            
            for (const ecoOrder of batch) {
              try {
                // Check if order already exists
                const existingOrder = await prisma.order.findUnique({
                  where: { ecoManagerId: ecoOrder.id.toString() }
                });

                if (!existingOrder) {
                  // Create new order
                  const orderData = ecoService.mapOrderToDatabase(ecoOrder);
                  
                  // Handle customer creation separately
                  let customer = await prisma.customer.findFirst({
                    where: { telephone: orderData.customerData.telephone }
                  });

                  if (!customer) {
                    customer = await prisma.customer.create({
                      data: {
                        fullName: orderData.customerData.fullName,
                        telephone: orderData.customerData.telephone,
                        wilaya: orderData.customerData.wilaya,
                        commune: orderData.customerData.commune,
                        totalOrders: 1
                      }
                    });
                  } else {
                    // Update total orders count
                    await prisma.customer.update({
                      where: { id: customer.id },
                      data: { totalOrders: { increment: 1 } }
                    });
                  }

                  // Remove customerData and add customerId
                  const { customerData, ...finalOrderData } = orderData;
                  finalOrderData.customerId = customer.id;

                  await prisma.order.create({
                    data: finalOrderData
                  });
                  syncedCount++;
                  
                  if (syncedCount % 10 === 0) {
                    console.log(`Synced ${syncedCount} orders for ${apiConfig.storeName} so far...`);
                  }
                }
              } catch (orderError) {
                console.error(`Error processing order ${ecoOrder.id} for ${apiConfig.storeName}:`, orderError);
                // Continue with next order
              }
            }
          }

          // Update API configuration usage
          await prisma.apiConfiguration.update({
            where: { id: apiConfig.id },
            data: {
              requestCount: {
                increment: Math.ceil(ecoOrders.length / 100) // Approximate API calls made
              },
              lastUsed: new Date()
            }
          });

          // Save sync status
          if (ecoOrders.length > 0) {
            const lastOrderId = Math.max(...ecoOrders.map(o => o.id));
            await ecoService.saveSyncStatus(lastOrderId, syncedCount);
          }

          results.push({
            storeIdentifier: apiConfig.storeIdentifier,
            storeName: apiConfig.storeName,
            success: true,
            syncedCount,
            totalFetched: ecoOrders.length,
            syncType: fullSync ? 'full' : 'incremental'
          });

          totalSyncedCount += syncedCount;
          totalFetchedCount += ecoOrders.length;

          console.log(`✅ Completed sync for ${apiConfig.storeName}: ${syncedCount} orders synced`);

        } catch (storeError) {
          console.error(`Error syncing store ${apiConfig.storeName}:`, storeError);
          results.push({
            storeIdentifier: apiConfig.storeIdentifier,
            storeName: apiConfig.storeName,
            success: false,
            error: storeError instanceof Error ? storeError.message : 'Unknown error',
            syncedCount: 0,
            totalFetched: 0
          });
        }
      }

      console.log(`\n🎉 All stores sync completed. Total synced: ${totalSyncedCount} orders`);

      res.json({
        success: true,
        data: {
          totalSyncedCount,
          totalFetchedCount,
          syncType: fullSync ? 'full' : 'incremental',
          storesProcessed: activeConfigs.length,
          results
        },
        message: `Successfully synced ${totalSyncedCount} orders from ${activeConfigs.length} stores`
      });
    } catch (error) {
      console.error('Sync all stores error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to sync orders from all stores'
        }
      });
    }
  }

  /**
   * Test sync with any status (for debugging)
   */
  async testSyncAnyStatus(req: Request, res: Response) {
    try {
      const { storeIdentifier, maxOrders = 50 } = req.body;

      if (!storeIdentifier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Store identifier is required'
          }
        });
      }

      // Get API configuration for the store
      const apiConfig = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier }
      });

      if (!apiConfig || !apiConfig.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Store configuration not found or inactive'
          }
        });
      }

      // Initialize EcoManager service
      const ecoService = new EcoManagerService({
        storeName: apiConfig.storeName,
        storeIdentifier: apiConfig.storeIdentifier,
        apiToken: apiConfig.apiToken,
        baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, redis);

      // Test connection first
      const connectionTest = await ecoService.testConnection();
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Failed to connect to EcoManager API'
          }
        });
      }

      // Get the highest EcoManager ID
      const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
        SELECT "ecoManagerId"
        FROM "orders"
        WHERE "storeIdentifier" = ${storeIdentifier}
          AND "source" = 'ECOMANAGER'
          AND "ecoManagerId" IS NOT NULL
        ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
        LIMIT 1
      `;

      const lastOrderId = lastOrderResult.length > 0 ? parseInt(lastOrderResult[0].ecoManagerId) : 0;
      console.log(`Last synced EcoManager order ID for ${apiConfig.storeName}: ${lastOrderId}`);
      
      // Fetch orders with any status
      const ecoOrders = await (ecoService as any).fetchNewOrdersAnyStatus(lastOrderId, maxOrders);

      console.log(`Found ${ecoOrders.length} orders with any status for ${apiConfig.storeName}`);

      // Group orders by status
      const statusGroups: { [key: string]: any[] } = {};
      ecoOrders.forEach((order: any) => {
        if (!statusGroups[order.order_state_name]) {
          statusGroups[order.order_state_name] = [];
        }
        statusGroups[order.order_state_name].push(order);
      });

      const statusSummary = Object.entries(statusGroups).map(([status, orders]) => ({
        status,
        count: orders.length,
        sampleOrders: orders.slice(0, 3).map(o => ({
          id: o.id,
          reference: o.reference,
          customer: o.full_name,
          total: o.total,
          created_at: o.created_at
        }))
      }));

      res.json({
        success: true,
        data: {
          storeName: apiConfig.storeName,
          storeIdentifier: apiConfig.storeIdentifier,
          lastSyncedOrderId: lastOrderId,
          totalOrdersFound: ecoOrders.length,
          statusSummary,
          message: `Found ${ecoOrders.length} orders with various statuses`
        }
      });

    } catch (error) {
      console.error('Test sync any status error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test sync with any status'
        }
      });
    }
  }

  /**
   * Test EcoManager integration and fetch "En dispatch" orders
   */
  async testEcoManagerIntegration(req: Request, res: Response) {
    try {
      console.log('🔍 Testing EcoManager integration...');
      const { storeIdentifier = 'NATU' } = req.query;
      console.log(`📍 Store identifier: ${storeIdentifier}`);

      // Get API configuration for the store
      console.log('🔍 Fetching API configuration...');
      const apiConfig = await prisma.apiConfiguration.findUnique({
        where: { storeIdentifier: storeIdentifier as string }
      });
      console.log('📋 API Config found:', apiConfig ? 'Yes' : 'No');

      if (!apiConfig || !apiConfig.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Store configuration not found or inactive: ${storeIdentifier}`
          }
        });
      }

      // Initialize EcoManager service
      console.log('🔧 Initializing EcoManager service...');
      const ecoService = new EcoManagerService({
        storeName: apiConfig.storeName,
        storeIdentifier: apiConfig.storeIdentifier,
        apiToken: apiConfig.apiToken,
        baseUrl: 'https://natureldz.ecomanager.dz/api/shop/v2'
      }, redis);
      console.log('✅ EcoManager service initialized');

      // Test connection
      console.log('🔗 Testing connection to EcoManager API...');
      const connectionTest = await ecoService.testConnection();
      console.log('🔗 Connection test result:', connectionTest);
      if (!connectionTest) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Failed to connect to EcoManager API'
          }
        });
      }

      // Fetch first few pages to find "En dispatch" orders
      let allEnDispatchOrders: any[] = [];
      let page = 1;
      const maxPages = 10; // Limit to first 10 pages for testing

      while (page <= maxPages && allEnDispatchOrders.length < 100) {
        try {
          const orders = await ecoService.fetchOrdersPage(page, 100);
          
          if (orders.length === 0) break;

          const enDispatchOrders = orders.filter(order =>
            order.order_state_name === 'En dispatch'
          );
          
          allEnDispatchOrders.push(...enDispatchOrders);
          
          if (orders.length < 100) break; // Last page
          
          page++;
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
          break;
        }
      }

      // Calculate statistics
      const totalValue = allEnDispatchOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
      const avgValue = allEnDispatchOrders.length > 0 ? totalValue / allEnDispatchOrders.length : 0;

      // Group by wilaya
      const wilayaCounts: { [key: string]: number } = {};
      allEnDispatchOrders.forEach(order => {
        wilayaCounts[order.wilaya] = (wilayaCounts[order.wilaya] || 0) + 1;
      });

      // Get top 10 wilayas
      const topWilayas = Object.entries(wilayaCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([wilaya, count]) => ({ wilaya, count }));

      // Sample orders for preview
      const sampleOrders = allEnDispatchOrders.slice(0, 5).map(order => ({
        id: order.id,
        reference: order.reference,
        customerName: order.full_name,
        phone: order.telephone,
        wilaya: order.wilaya,
        commune: order.commune,
        total: parseFloat(order.total || '0'),
        createdAt: order.created_at,
        itemsCount: order.items?.length || 0
      }));

      res.json({
        success: true,
        data: {
          store: {
            name: apiConfig.storeName,
            identifier: apiConfig.storeIdentifier
          },
          connectionStatus: 'success',
          summary: {
            totalEnDispatchOrders: allEnDispatchOrders.length,
            totalValue: totalValue,
            averageValue: avgValue,
            pagesScanned: page - 1
          },
          topWilayas,
          sampleOrders,
          testCompletedAt: new Date().toISOString()
        },
        message: `Found ${allEnDispatchOrders.length} "En dispatch" orders from ${apiConfig.storeName}`
      });

    } catch (error) {
      console.error('Test EcoManager integration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test EcoManager integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Delete all orders and customers
   */
  async deleteAllOrders(req: Request, res: Response) {
    try {
      console.log('Starting deletion of all orders and customers...');

      // Delete all order items first (due to foreign key constraints)
      const deletedItems = await prisma.orderItem.deleteMany({});
      console.log(`Deleted ${deletedItems.count} order items`);

      // Delete all orders
      const deletedOrders = await prisma.order.deleteMany({});
      console.log(`Deleted ${deletedOrders.count} orders`);

      // Delete all customers
      const deletedCustomers = await prisma.customer.deleteMany({});
      console.log(`Deleted ${deletedCustomers.count} customers`);

      res.json({
        success: true,
        data: {
          deletedItems: deletedItems.count,
          deletedOrders: deletedOrders.count,
          deletedCustomers: deletedCustomers.count
        },
        message: `Successfully deleted ${deletedOrders.count} orders, ${deletedItems.count} items, and ${deletedCustomers.count} customers`
      });

    } catch (error) {
      console.error('Delete all orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete all orders',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Sync shipping status from Maystro
   */
  async syncShippingStatus(req: Request, res: Response) {
    try {
      const { orderReferences } = req.body;

      const maystroService = getMaystroService(redis);
      const result = await maystroService.syncShippingStatus(orderReferences);

      res.json({
        success: true,
        data: result,
        message: `Shipping status sync completed: ${result.updated} updated, ${result.errors} errors`
      });
    } catch (error) {
      console.error('Sync shipping status error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to sync shipping status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Test Maystro API connection
   */
  async testMaystroIntegration(req: Request, res: Response) {
    try {
      const maystroService = getMaystroService(redis);
      const result = await maystroService.testConnection();

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Test Maystro integration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test Maystro integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Debug Maystro API response
   */
  async debugMaystroApi(req: Request, res: Response) {
    try {
      const maystroService = getMaystroService(redis);
      const result = await maystroService.debugApiResponse(10);

      res.json({
        success: true,
        data: result,
        message: 'Debug data fetched successfully'
      });
    } catch (error) {
      console.error('Debug Maystro API error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to debug Maystro API',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get Maystro webhook types
   */
  async getMaystroWebhookTypes(req: Request, res: Response) {
    try {
      const maystroService = getMaystroService(redis);
      const webhookTypes = await maystroService.getWebhookTypes();

      res.json({
        success: true,
        data: webhookTypes
      });
    } catch (error) {
      console.error('Get Maystro webhook types error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch webhook types',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get configured Maystro webhooks
   */
  async getMaystroWebhooks(req: Request, res: Response) {
    try {
      const maystroService = getMaystroService(redis);
      const webhooks = await maystroService.getWebhooks();

      res.json({
        success: true,
        data: webhooks
      });
    } catch (error) {
      console.error('Get Maystro webhooks error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch webhooks',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Create Maystro webhook
   */
  async createMaystroWebhook(req: Request, res: Response) {
    try {
      const { endpoint, triggerTypeId } = req.body;

      if (!endpoint || !triggerTypeId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Endpoint and trigger type ID are required'
          }
        });
      }

      const maystroService = getMaystroService(redis);
      const webhook = await maystroService.createWebhook(endpoint, triggerTypeId);

      res.json({
        success: true,
        data: webhook,
        message: 'Webhook created successfully'
      });
    } catch (error) {
      console.error('Create Maystro webhook error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create webhook',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Delete Maystro webhook
   */
  async deleteMaystroWebhook(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const maystroService = getMaystroService(redis);
      const success = await maystroService.deleteWebhook(id);

      if (success) {
        res.json({
          success: true,
          message: 'Webhook deleted successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: 'Failed to delete webhook'
          }
        });
      }
    } catch (error) {
      console.error('Delete Maystro webhook error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete webhook',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Send test webhook
   */
  async sendTestMaystroWebhook(req: Request, res: Response) {
    try {
      const maystroService = getMaystroService(redis);
      const success = await maystroService.sendTestWebhook();

      if (success) {
        res.json({
          success: true,
          message: 'Test webhook sent successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: 'Failed to send test webhook'
          }
        });
      }
    } catch (error) {
      console.error('Send test Maystro webhook error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send test webhook',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}