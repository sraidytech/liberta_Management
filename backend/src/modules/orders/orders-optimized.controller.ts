import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { EcoManagerService } from '../../services/ecomanager.service';
import { getMaystroService } from '../../services/maystro.service';
import { productAssignmentService } from '../../services/product-assignment.service';
import { deliveryDelayService } from '../../services/delivery-delay.service';

import { prisma } from '../../config/database';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class OptimizedOrdersController {
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
   * OPTIMIZED: Get all orders with pagination and filtering
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
        sortBy = 'orderDate',
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
      const limitNum = Math.min(parseInt(limit as string), 50); // Cap at 50 for performance
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

      // Apply product-based filtering for non-admin users
      const user = req.user;
      if (user && user.role !== 'ADMIN') {
        if (!assignedAgentId) {
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
        console.log(`🔍 Orders API - User: ${user.id}, Role: ${user.role}, AssignedAgentId: ${assignedAgentId}, ProductFilteringApplied: ${!assignedAgentId}`);
      }

      if (search) {
        where.OR = [
          { reference: { contains: search as string, mode: 'insensitive' } },
          { ecoManagerId: { contains: search as string, mode: 'insensitive' } },
          { trackingNumber: { contains: search as string, mode: 'insensitive' } },
          { maystroOrderId: { contains: search as string, mode: 'insensitive' } }
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

      // 🚀 CRITICAL FIX: Use timeout and simplified query to prevent database timeouts
      let orders: any[] = [];
      let totalCount = 0;

      try {
        // Try optimized query first
        const [ordersResult, countResult] = await Promise.race([
          Promise.all([
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
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    telephone: true,
                    wilaya: true,
                    commune: true
                  }
                },
                assignedAgent: {
                  select: {
                    id: true,
                    name: true,
                    agentCode: true
                  }
                },
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
          ]),
          // 10 second timeout
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 10000)
          )
        ]) as [any[], number];

        orders = ordersResult;
        totalCount = countResult;

        // Add empty items array for compatibility
        orders = orders.map(order => ({
          ...order,
          items: [] // Items loaded separately if needed
        }));

      } catch (timeoutError) {
        console.error('❌ Database query timeout, using fallback:', timeoutError);
        
        // Fallback to ultra-simple query
        const [fallbackOrders, fallbackCount] = await Promise.all([
          prisma.order.findMany({
            where: { 
              ...where,
              // Remove complex filters for fallback
              items: undefined,
              OR: undefined
            },
            select: {
              id: true,
              reference: true,
              status: true,
              shippingStatus: true,
              total: true,
              createdAt: true,
              assignedAgentId: true,
              storeIdentifier: true
            },
            orderBy: {
              orderDate: 'desc' // Force simple sort by order date
            },
            take: Math.min(limitNum, 25) // Limit for fallback
          }),
          prisma.order.count({ 
            where: {
              ...where,
              items: undefined,
              OR: undefined
            }
          })
        ]);

        orders = fallbackOrders.map(order => ({
          ...order,
          customer: null,
          assignedAgent: null,
          items: [],
          _count: { items: 0, tickets: 0 },
          notes: null,
          internalNotes: null,
          trackingNumber: null,
          maystroOrderId: null,
          ecoManagerId: null,
          updatedAt: order.createdAt
        }));
        
        totalCount = fallbackCount;
      }

      const totalPages = Math.ceil(totalCount / limitNum);

      // 🚀 PERFORMANCE: Skip delay calculation by default
      const includeDelay = req.query.includeDelay === 'true';
      let ordersWithDelay = orders;
      
      if (includeDelay && orders.length > 0) {
        try {
          // Only calculate delays when explicitly requested and for small sets
          const cacheKey = `order_delays:${JSON.stringify(orders.map(o => o.id))}`;
          let cachedDelays = await redis.get(cacheKey);
          
          if (!cachedDelays && orders.length <= 25) { // Only for small result sets
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
          
          if (cachedDelays) {
            const delayEntries = JSON.parse(cachedDelays);
            const delayMap = new Map(delayEntries);
            
            ordersWithDelay = orders.map(order => ({
              ...order,
              delayInfo: delayMap.get(order.id) || null
            }));
          }
        } catch (delayError) {
          console.error('❌ Delay calculation failed:', delayError);
          // Continue without delay info
        }
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

      // 🚀 PERFORMANCE: Cache the response for 30 seconds (non-search queries only)
      if (!search && totalCount < 500) { // Only cache smaller result sets
        await redis.setex(cacheKey, 30, JSON.stringify(response));
      }

      res.json(response);

    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  }
}