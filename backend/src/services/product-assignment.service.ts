import { PrismaClient } from '@prisma/client';
import { CreateProductAssignmentRequest, UpdateProductAssignmentRequest, ProductAssignmentFilters } from '@/types';

const prisma = new PrismaClient();

export class ProductAssignmentService {
  /**
   * Assign products to a user
   */
  async assignProductsToUser(request: CreateProductAssignmentRequest): Promise<{
    success: boolean;
    message: string;
    assignments?: any[];
  }> {
    try {
      const { userId, productNames } = request;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Remove existing assignments for this user
      await prisma.userProductAssignment.deleteMany({
        where: { userId }
      });

      // Create new assignments
      const assignments = await Promise.all(
        productNames.map(productName =>
          prisma.userProductAssignment.create({
            data: {
              userId,
              productName,
              isActive: true
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            }
          })
        )
      );

      return {
        success: true,
        message: `Successfully assigned ${productNames.length} products to ${user.name}`,
        assignments
      };
    } catch (error) {
      console.error('Product assignment error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign products'
      };
    }
  }

  /**
   * Update product assignments for a user
   */
  async updateUserProductAssignments(request: UpdateProductAssignmentRequest): Promise<{
    success: boolean;
    message: string;
    assignments?: any[];
  }> {
    return this.assignProductsToUser(request);
  }

  /**
   * Get products assigned to a user
   */
  async getUserAssignedProducts(userId: string): Promise<string[]> {
    try {
      const assignments = await prisma.userProductAssignment.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          productName: true
        }
      });

      return assignments.map(assignment => assignment.productName);
    } catch (error) {
      console.error('Error getting user assigned products:', error);
      return [];
    }
  }

  /**
   * Get product statistics from orders data
   */
  async getProductStatistics(productName: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averagePrice: number;
    assignedAgents: number;
    category: string;
  }> {
    try {
      // Get orders that contain this product
      const orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              title: {
                contains: productName,
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          items: true,
          assignedAgent: true
        }
      });

      // Calculate statistics
      const totalOrders = orders.length;
      let totalRevenue = 0;
      let totalPrice = 0;
      let itemCount = 0;
      const assignedAgentIds = new Set();

      orders.forEach(order => {
        // Add order total to revenue
        totalRevenue += order.total || 0;
        
        // Count assigned agents
        if (order.assignedAgentId) {
          assignedAgentIds.add(order.assignedAgentId);
        }

        // Calculate average price from items containing this product
        order.items.forEach(item => {
          if (item.title.toLowerCase().includes(productName.toLowerCase())) {
            totalPrice += item.unitPrice || 0;
            itemCount++;
          }
        });
      });

      const averagePrice = itemCount > 0 ? totalPrice / itemCount : 0;
      const assignedAgents = assignedAgentIds.size;

      // Determine category based on product name (simple categorization)
      let category = 'General';
      const productLower = productName.toLowerCase();
      if (productLower.includes('phone') || productLower.includes('mobile')) {
        category = 'Electronics';
      } else if (productLower.includes('clothes') || productLower.includes('shirt')) {
        category = 'Fashion';
      } else if (productLower.includes('book')) {
        category = 'Books';
      }

      return {
        totalOrders,
        totalRevenue,
        averagePrice,
        assignedAgents,
        category
      };
    } catch (error) {
      console.error('Error getting product statistics:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averagePrice: 0,
        assignedAgents: 0,
        category: 'General'
      };
    }
  }

  /**
   * Get product statistics for multiple products in one query (optimized)
   */
  async getBulkProductStatistics(productNames: string[]): Promise<{[key: string]: {
    totalOrders: number;
    totalRevenue: number;
    averagePrice: number;
    assignedAgents: number;
    category: string;
  }}> {
    try {
      if (productNames.length === 0) {
        return {};
      }

      // Get all orders that contain any of these products in one query
      const orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              title: {
                in: productNames,
                mode: 'insensitive'
              }
            }
          }
        },
        include: {
          items: true,
          assignedAgent: true
        }
      });

      // Process statistics for each product
      const stats: {[key: string]: any} = {};
      
      // Initialize stats for all products
      productNames.forEach(productName => {
        stats[productName] = {
          totalOrders: 0,
          totalRevenue: 0,
          averagePrice: 0,
          assignedAgents: 0,
          category: this.categorizeProduct(productName),
          totalPrice: 0,
          itemCount: 0,
          assignedAgentIds: new Set()
        };
      });

      // Process each order
      orders.forEach(order => {
        // Check which products this order contains
        const orderProducts = new Set<string>();
        
        order.items.forEach(item => {
          productNames.forEach(productName => {
            if (item.title.toLowerCase().includes(productName.toLowerCase())) {
              orderProducts.add(productName);
              // Add to price calculation
              stats[productName].totalPrice += item.unitPrice || 0;
              stats[productName].itemCount++;
            }
          });
        });

        // For each product in this order, count the order and revenue
        orderProducts.forEach(productName => {
          stats[productName].totalOrders++;
          stats[productName].totalRevenue += order.total || 0;
          
          // Count assigned agents
          if (order.assignedAgentId) {
            stats[productName].assignedAgentIds.add(order.assignedAgentId);
          }
        });
      });

      // Finalize calculations
      const result: {[key: string]: any} = {};
      Object.keys(stats).forEach(productName => {
        const stat = stats[productName];
        result[productName] = {
          totalOrders: stat.totalOrders,
          totalRevenue: stat.totalRevenue,
          averagePrice: stat.itemCount > 0 ? stat.totalPrice / stat.itemCount : 0,
          assignedAgents: stat.assignedAgentIds.size,
          category: stat.category
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting bulk product statistics:', error);
      return {};
    }
  }

  /**
   * Categorize product based on name
   */
  private categorizeProduct(productName: string): string {
    const productLower = productName.toLowerCase();
    if (productLower.includes('phone') || productLower.includes('mobile')) {
      return 'Electronics';
    } else if (productLower.includes('clothes') || productLower.includes('shirt')) {
      return 'Fashion';
    } else if (productLower.includes('book')) {
      return 'Books';
    }
    return 'General';
  }

  /**
   * Get users assigned to a specific product
   */
  async getUsersAssignedToProduct(productName: string): Promise<{
    id: string;
    name: string;
    role: string;
    agentCode?: string;
  }[]> {
    try {
      const assignments = await prisma.userProductAssignment.findMany({
        where: {
          productName,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              agentCode: true,
              isActive: true
            }
          }
        }
      });

      return assignments
        .filter(assignment => assignment.user.isActive)
        .map(assignment => ({
          id: assignment.user.id,
          name: assignment.user.name || assignment.user.agentCode || 'Unknown',
          role: assignment.user.role,
          agentCode: assignment.user.agentCode || undefined
        }));
    } catch (error) {
      console.error('Error getting users assigned to product:', error);
      return [];
    }
  }

  /**
   * Get all product assignments with filters
   */
  async getProductAssignments(filters: ProductAssignmentFilters = {}) {
    try {
      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.productName) {
        where.productName = {
          contains: filters.productName,
          mode: 'insensitive'
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const assignments = await prisma.userProductAssignment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              agentCode: true,
              isActive: true
            }
          }
        },
        orderBy: [
          { user: { name: 'asc' } },
          { productName: 'asc' }
        ]
      });

      return {
        success: true,
        data: assignments
      };
    } catch (error) {
      console.error('Error getting product assignments:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get assignments',
        data: []
      };
    }
  }

  /**
   * Get all unique product names from order items
   */
  async getAvailableProducts(): Promise<string[]> {
    try {
      const products = await prisma.orderItem.findMany({
        select: {
          title: true
        },
        distinct: ['title'],
        orderBy: {
          title: 'asc'
        }
      });

      return products.map(product => product.title);
    } catch (error) {
      console.error('Error getting available products:', error);
      return [];
    }
  }

  /**
   * Remove product assignment
   */
  async removeProductAssignment(userId: string, productName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await prisma.userProductAssignment.deleteMany({
        where: {
          userId,
          productName
        }
      });

      return {
        success: true,
        message: 'Product assignment removed successfully'
      };
    } catch (error) {
      console.error('Error removing product assignment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove assignment'
      };
    }
  }

  /**
   * Check if user has access to a specific product
   */
  async userHasProductAccess(userId: string, productName: string): Promise<boolean> {
    try {
      const assignment = await prisma.userProductAssignment.findFirst({
        where: {
          userId,
          productName,
          isActive: true
        }
      });

      return !!assignment;
    } catch (error) {
      console.error('Error checking product access:', error);
      return false;
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats() {
    try {
      const [totalAssignments, activeAssignments, uniqueProducts, assignedUsers] = await Promise.all([
        prisma.userProductAssignment.count(),
        prisma.userProductAssignment.count({ where: { isActive: true } }),
        prisma.userProductAssignment.findMany({
          select: { productName: true },
          distinct: ['productName']
        }),
        prisma.userProductAssignment.findMany({
          select: { userId: true },
          distinct: ['userId'],
          where: { isActive: true }
        })
      ]);

      return {
        success: true,
        data: {
          totalAssignments,
          activeAssignments,
          uniqueProducts: uniqueProducts.length,
          assignedUsers: assignedUsers.length
        }
      };
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get stats',
        data: {
          totalAssignments: 0,
          activeAssignments: 0,
          uniqueProducts: 0,
          assignedUsers: 0
        }
      };
    }
  }
}

export const productAssignmentService = new ProductAssignmentService();